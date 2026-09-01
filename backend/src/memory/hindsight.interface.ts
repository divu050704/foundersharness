import { z } from "zod";

export const HindsightEntitySchema = z.object({
  entity_id: z.string(),
  canonical_name: z.string(),
  observations: z.array(z.unknown()),
});

export const HindsightRecallResultSchema = z.object({
  id: z.string(),
  text: z.string(),
  type: z.enum(["observation", "world"]),
  entities: z.array(z.string()),
  mentioned_at: z.string(),
  context: z.string().optional(),
  document_id: z.string().optional(),
  metadata: z.any(),
  chunk_id: z.string().optional(),
  tags: z.array(z.string()),
  scores: z.any(),
});

export const HindsightRecallResponseSchema = z.object({
  results: z.array(HindsightRecallResultSchema),
  entities: z.any(),
});

export type HindsightRecallResponse =
  z.infer<typeof HindsightRecallResponseSchema>;

export type HindsightRecallResult =
  z.infer<typeof HindsightRecallResultSchema>;

export type HindsightEntity =
  z.infer<typeof HindsightEntitySchema>;