import "dotenv/config";
import { CreateOnboardingDto } from "../onboarding/dto/create-onboarding.dto";
import { Injectable, Logger } from '@nestjs/common';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { LeanCanvasAgent, EntityExtractor } from "./instances";
import { LeanCanvasSchema } from "./schema";
import type { LeanCanvasOutput } from "./schema";
@Injectable()
export class AgentsService {

  private model = new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    model: "gemini-3.1-flash-lite"
  })
  async createCanvas(createOnboardingDto: CreateOnboardingDto): Promise<LeanCanvasOutput> {
    const structuredModel = this.model.withStructuredOutput(LeanCanvasSchema)
    const prompt = LeanCanvasAgent.generatePrompt(createOnboardingDto)
    const parsed = await structuredModel.invoke(prompt)

    return {
      channels: parsed.channels,
      problem: parsed.problem,
      costStructure: parsed.costStructure,
      customerSegments: parsed.customerSegments,
      keyMetrics: parsed.keyMetrics,
      revenueStreams: parsed.revenueStreams,
      solution: parsed.solution,
      unfairAdvantage: parsed.unfairAdvantage,
      uniqueValueProposition: parsed.uniqueValueProposition
    };
  }

  async createMemory(canvas: LeanCanvasOutput) {
    const prompt = EntityExtractor.generatePrompt(canvas)
    return prompt
  }
}
