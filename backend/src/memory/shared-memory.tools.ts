// shared-memory.tools.ts
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { MemoryService } from './memory.service';

export function buildMemoryTools(memory: MemoryService) {
  const saveMemory = tool(
    async ({ type, content, summary }, config) => {
      const userId = config.configurable?.user_id;
      await memory.save(userId, { type, content, summary, producedBy: config.configurable?.agent_name ?? 'unknown' });
      return `Saved as "${type}".`;
    },
    {
      name: 'save_memory',
      description: 'Save any data, result, or fact for later use by yourself or other agents. Choose an appropriate type label.',
      schema: z.object({
        type: z.string().describe('short label, e.g. canvas, post_plan, preference'),
        content: z.any().describe('the data itself, any shape'),
        summary: z.string().describe('one sentence describing this, used for search'),
      }),
    },
  );

  const recallMemory = tool(
    async ({ query, type }, config) => {
      const userId = config.configurable?.user_id;
      const results = await memory.recall(userId, query, type);
      return results.length
        ? JSON.stringify(results.map((r) => r.value))
        : 'Nothing relevant found.';
    },
    {
      name: 'recall_memory',
      description: "Search previously saved data — yours or another agent's — relevant to a query.",
      schema: z.object({
        query: z.string(),
        type: z.string().optional().describe('optionally filter to a specific type'),
      }),
    },
  );

  return [saveMemory, recallMemory];
}