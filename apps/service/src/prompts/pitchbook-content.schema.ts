import { z } from 'zod';

/**
 * Zod schemas for validating OpenAI content plan output.
 */

export const chartDataSeriesSchema = z.object({
  name: z.string(),
  labels: z.array(z.string()),
  values: z.array(z.number()),
});

export const contentBlockSchema = z.object({
  type: z.enum(['heading', 'paragraph', 'bullet_list', 'table', 'chart', 'metric']),
  content: z.any(),
});

export const slideSchema = z.object({
  index: z.number().optional().default(0),
  title: z.string(),
  layout: z.string().optional().default('Content Slide'),
  talking_points: z.array(z.string()).optional().default([]),
  data_requirements: z.array(z.string()).optional().default([]),
  content_blocks: z.array(contentBlockSchema).optional().default([]),
});

export const contentPlanSchema = z.object({
  title: z.string(),
  narrative_arc: z.string().optional().default(''),
  slides: z.array(slideSchema),
});

export type ContentPlanOutput = z.infer<typeof contentPlanSchema>;

/**
 * Validate and parse raw JSON from OpenAI into a typed content plan.
 * Throws ZodError if the response doesn't match the schema.
 */
export function parseContentPlan(raw: unknown): ContentPlanOutput {
  return contentPlanSchema.parse(raw);
}
