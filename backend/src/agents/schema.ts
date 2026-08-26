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

export const KeyValuePropertySchema = z.object({
  key: z.string().describe("Property key or attribute name"),
  value: z.string().describe("Property value or attribute detail"),
});

export const EntityExtractorSchema = z.object({
  postgres: z.object({
    company: z.object({
      name: z
        .string()
        .describe("Inferred company name, or 'My Company' if unknown"),
      product: z
        .string()
        .describe("Summary of what the company is building"),
      stage: z
        .string()
        .describe("Company stage, e.g. Idea, MVP, Pre-revenue, Growth"),
      teamSize: z
        .number()
        .describe("Total number of team members, inferred or default 1"),
      goals: z
        .array(z.string())
        .describe("Company goals inferred from the available context"),
      bottlenecks: z
        .array(z.string())
        .describe("Current bottlenecks or challenges"),
      tools: z
        .array(z.string())
        .describe("Tools, technologies, or software being used")
    }),

    entities: z.array(
      z.object({
        type: z
          .string()
          .describe(
            "Entity type, e.g. Customer, Competitor, Feature, Partner, Founder, Advisor, Investor"
          ),
        name: z.string().describe("Name of the entity"),
        data: z
          .array(KeyValuePropertySchema)
          .describe("Additional key-value data entries about the entity"),
        confidence: z
          .number()
          .min(0)
          .max(1)
          .describe("Confidence score of the extraction, from 0.0 to 1.0"),
        source: z
          .string()
          .describe("Source context or document title from which the entity was extracted")
      })
    )
  }),

  neo4j: z.object({
    nodes: z.array(
      z.object({
        id: z
          .string()
          .describe("Unique identifier for the node, such as a name or title"),
        label: z
          .string()
          .describe(
            "Node label, e.g. Person, Tool, Feature, Customer, Company"
          ),
        properties: z
          .array(KeyValuePropertySchema)
          .describe("Additional key-value properties of the node")
      })
    ),

    edges: z.array(
      z.object({
        source: z.string().describe("ID of the source node"),
        target: z.string().describe("ID of the target node"),
        type: z
          .string()
          .describe(
            "Relationship type in uppercase verb form, e.g. CREATED, USES, TARGETS, DELAYED, RECRUITED"
          ),
        properties: z
          .array(KeyValuePropertySchema)
          .describe("Additional key-value properties of the relationship")
      })
    )
  }),

  timeline: z.array(
    z.object({
      date: z
        .string()
        .describe("Event date in YYYY-MM, YYYY-MM-DD, or approximate format"),
      title: z
        .string()
        .describe("Short description/title of the event"),
      description: z
        .string()
        .describe("Detailed description of the event"),
      confidence: z
        .number()
        .min(0)
        .max(1)
        .describe("Confidence score of the timeline extraction, from 0.0 to 1.0")
    })
  )
});

export type EntityExtractorOutput = z.infer<typeof EntityExtractorSchema>;