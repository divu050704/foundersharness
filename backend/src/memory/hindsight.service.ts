import { Injectable } from '@nestjs/common';
import { HindsightClient } from '@vectorize-io/hindsight-client';
import { LeanCanvasOutput } from '../agents/schema';

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
}