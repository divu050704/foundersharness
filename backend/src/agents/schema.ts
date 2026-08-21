import { z } from 'zod';

export const LeanCanvasSchema = z.object({
  problem: z.array(z.string()).describe('Top 3 problems the business solves'),
  solution: z.array(z.string()).describe('Top 3 solutions to those problems'),
  uniqueValueProposition: z.string().describe('Single, clear, compelling message'),
  customerSegments: z.array(z.string()).describe('Target customers'),
  channels: z.array(z.string()).describe('Path to customers'),
  revenueStreams: z.array(z.string()).describe('How the business makes money'),
  costStructure: z.array(z.string()).describe('Key costs'),
  keyMetrics: z.array(z.string()).describe('Key numbers that tell how the business is doing'),
  unfairAdvantage: z.string().describe('Something that cannot be easily copied or bought'),
});

export type LeanCanvasOutput = z.infer<typeof LeanCanvasSchema>;
/* ------------------------------------------------------------------ */
/*  Shared primitives                                                  */
/* ------------------------------------------------------------------ */

// LLMs are chatty with confidence scores — clamp instead of hard-failing
const confidenceScore = z
  .number()
  .transform((val) => Math.min(1, Math.max(0, val)));

// Loose key/value bag for `data` / `properties` fields coming back from the LLM
const jsonRecord = z.record(z.string(), z.unknown());

/* ------------------------------------------------------------------ */
/*  mongo.company                                                   */
/* ------------------------------------------------------------------ */

export const CompanySchema = z.object({
  name: z.string().default('My Company'),
  product: z.string(),
  stage: z.string(),
  teamSize: z.number().int().positive().default(1),
  goals: z.array(z.string()).default([]),
  bottlenecks: z.array(z.string()).default([]),
  tools: z.array(z.string()).default([]),
});
export type Company = z.infer<typeof CompanySchema>;

/* ------------------------------------------------------------------ */
/*  mongo.entities                                                  */
/* ------------------------------------------------------------------ */

export const MongoEntitySchema = z.object({
  type: z.string(), // e.g. Customer, Competitor, Feature, Partner, Founder, Advisor, Investor
  name: z.string(),
  data: jsonRecord.default({}),
  confidence: confidenceScore,
  source: z.string(),
});
export type MongoEntity = z.infer<typeof MongoEntitySchema>;

export const MongoPayloadSchema = z.object({
  company: CompanySchema,
  entities: z.array(MongoEntitySchema).default([]),
});
export type MongoPayload = z.infer<typeof MongoPayloadSchema>;

/* ------------------------------------------------------------------ */
/*  neo4j.nodes / neo4j.edges                                          */
/* ------------------------------------------------------------------ */

export const Neo4jNodeSchema = z.object({
  id: z.string().min(1, 'Node id cannot be empty'),
  label: z.string().min(1, 'Node label cannot be empty'),
  properties: jsonRecord.default({}),
});
export type Neo4jNode = z.infer<typeof Neo4jNodeSchema>;

export const Neo4jEdgeSchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
  // Enforce the "VERB_IN_CAPS" convention from the system prompt
  type: z
    .string()
    .min(1)
    .regex(
      /^[A-Z][A-Z0-9_]*$/,
      'Edge type must be an UPPER_SNAKE_CASE verb, e.g. USES, TARGETS',
    ),
  properties: jsonRecord.default({}),
});
export type Neo4jEdge = z.infer<typeof Neo4jEdgeSchema>;

export const Neo4jPayloadSchema = z
  .object({
    nodes: z.array(Neo4jNodeSchema).default([]),
    edges: z.array(Neo4jEdgeSchema).default([]),
  })
  // Guard against the LLM inventing edges to nodes it never declared
  .superRefine((val, ctx) => {
    const nodeIds = new Set(val.nodes.map((n) => n.id));
    val.edges.forEach((edge, i) => {
      if (!nodeIds.has(edge.source)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['edges', i, 'source'],
          message: `Edge source "${edge.source}" does not match any declared node id`,
        });
      }
      if (!nodeIds.has(edge.target)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['edges', i, 'target'],
          message: `Edge target "${edge.target}" does not match any declared node id`,
        });
      }
    });
  });
export type Neo4jPayload = z.infer<typeof Neo4jPayloadSchema>;

/* ------------------------------------------------------------------ */
/*  timeline                                                            */
/* ------------------------------------------------------------------ */

// Accepts YYYY-MM or YYYY-MM-DD; falls back to any non-empty string since
// the system prompt allows "approximate" dates too
const timelineDate = z.string().refine(
  (val) =>
    /^\d{4}-\d{2}$/.test(val) ||
    /^\d{4}-\d{2}-\d{2}$/.test(val) ||
    val.trim().length > 0,
  { message: 'date must be YYYY-MM, YYYY-MM-DD, or a non-empty approximate string' },
);

export const TimelineEventSchema = z.object({
  date: timelineDate,
  title: z.string().min(1),
  description: z.string(),
  confidence: confidenceScore,
});
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

/* ------------------------------------------------------------------ */
/*  Top-level EntityExtractor output                                   */
/* ------------------------------------------------------------------ */

export const EntityExtractorOutputSchema = z.object({
  mongo: MongoPayloadSchema,
  neo4j: Neo4jPayloadSchema,
  timeline: z.array(TimelineEventSchema).default([]),
});
export type EntityExtractorOutput = z.infer<typeof EntityExtractorOutputSchema>;

/* ------------------------------------------------------------------ */
/*  Parsing helper                                                      */
/* ------------------------------------------------------------------ */

/**
 * Strips markdown code-fences the LLM sometimes adds despite instructions
 * not to, then parses + validates against EntityExtractorOutputSchema.
 */
export function parseEntityExtractorOutput(raw: string): EntityExtractorOutput {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `Failed to parse EntityExtractor output as JSON: ${(err as Error).message}`,
    );
  }

  const result = EntityExtractorOutputSchema.safeParse(json);
  if (!result.success) {
    throw new Error(
      `EntityExtractor output failed validation: ${result.error.message}`,
    );
  }

  return result.data;
}