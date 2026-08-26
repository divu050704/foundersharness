import "dotenv/config";
import { CreateOnboardingDto } from "../onboarding/dto/create-onboarding.dto";
import { Injectable, Logger } from '@nestjs/common';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { LeanCanvasAgent, EntityExtractor } from "./instances";
import { EntityExtractorSchema, LeanCanvasSchema } from "./schema";
import type { EntityExtractorOutput, LeanCanvasOutput } from "./schema";
import  { User } from "../user/schemas/user.schema";
import { Model } from "mongoose";

@Injectable()
export class AgentsService {

  private model = new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    model: "gemini-3.5-flash-lite"
  })
  async createCanvas(createOnboardingDto: CreateOnboardingDto[]): Promise<LeanCanvasOutput> {
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

  async extractFeatures(canvas: LeanCanvasOutput,  userData: User | null): Promise<EntityExtractorOutput> {
    const prompt = EntityExtractor.generatePrompt(`
      Original Questionnaire: ${userData?.questionnaire}
      Canvas craeted by LLM: ${canvas}
      `)
    const structuredModel = this.model.withStructuredOutput(EntityExtractorSchema)
    const parsed = await structuredModel.invoke(prompt)
    return parsed
  }
}
