import { Injectable } from '@nestjs/common';
import { HindsightClient } from '@vectorize-io/hindsight-client';
import { LeanCanvasOutput } from '../agents/schema';
import { HindsightRecallResponse } from './hindsight.interface';

@Injectable()
export class HindsightService {
  private readonly client = new HindsightClient({
    baseUrl: process.env.HINDSIGHT_URL!,
  });

  async retainCanvas(email: string, canvas: LeanCanvasOutput) {
    const bankId = `user:${email}`;

    return this.client.retain(
      bankId,
      JSON.stringify(canvas, null, 2),
      {
        context: 'User-confirmed Lean Canvas',
      },
    );
  }

  async retain(email: string, content: string, context = 'User query & Preference') {
    const bankId = `user:${email}`;
    return this.client.retain(bankId, content, { context });
  }
  async getEntityGraph(email: string) {
    const bankId = `user:${email}`;
    const res = await fetch(
      `${process.env.HINDSIGHT_URL!}/v1/default/banks/${bankId}/entities/graph?limit=1000`
    );
    if (!res.ok) throw new Error(`Graph fetch failed: ${res.status}`);
    return res.json() as Promise<{
      nodes: { data: { id: string; label: string; mentionCount: number; color: string } }[];
      edges: { data: { source: string; target: string; weight: number; id: string } }[];
      total_entities: number;
      total_edges: number;
    }>;
  }
  async retrieveMemory(email: string, query: string): Promise<HindsightRecallResponse> {
    const result: Promise<HindsightRecallResponse> | any = await this.client.recall(
      `user:${email}`,
      query,
    );
    return result;
  }
}