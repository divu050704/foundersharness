import "dotenv/config";
import { CreateOnboardingDto } from "../onboarding/dto/create-onboarding.dto";
import { Injectable, Logger } from '@nestjs/common';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { LeanCanvasAgent, EntityExtractor } from "./instances";
import { EntityExtractorSchema, LeanCanvasSchema } from "./schema";
import type { EntityExtractorOutput, LeanCanvasOutput } from "./schema";
import { User } from "../user/schemas/user.schema";
import { Model } from "mongoose";
import { EmailAgentDTO } from "./dto/email-agent.dto";
import { InjectModel } from "@nestjs/mongoose";
import { EmailThread } from "./schemas/email.schema";

@Injectable()
export class AgentsService {
  constructor(@InjectModel(EmailThread.name) private emailModel: Model<EmailThread>) { }
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

  async extractFeatures(canvas: LeanCanvasOutput, userData: User | null): Promise<EntityExtractorOutput> {
    const prompt = EntityExtractor.generatePrompt(`
      Original Questionnaire: ${userData?.questionnaire}
      Canvas craeted by LLM: ${canvas}
      `)
    const structuredModel = this.model.withStructuredOutput(EntityExtractorSchema)
    const parsed = await structuredModel.invoke(prompt)
    return parsed
  }

  async initiateAgent(email: EmailAgentDTO, sender: string) {
    const isAgentSender = sender.includes('@foundersharness.ai') || sender.includes('@dundermifflin.com');
    const createEmailThread = new this.emailModel({
      emails: [{
        attachments: email.attachments || [],
        content: email.content,
        read: false,
        receiver: email.receiver,
        sender: sender
      }],
      subject: email.subject,
      agent: isAgentSender ? sender : email.receiver
    })
    return await createEmailThread.save()
  }

  async getEmailThreads(): Promise<EmailThread[]> {
    return await this.emailModel.find().exec();
  }
}
