import "dotenv/config";
import { CreateOnboardingDto } from "../onboarding/dto/create-onboarding.dto";
import { Injectable, Logger } from '@nestjs/common';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { LeanCanvasAgent } from "./instances";
import { LeanCanvasSchema } from "./schema";
import type { LeanCanvasOutput } from "./schema";
import { Model } from "mongoose";
import { EmailAgentDTO } from "./dto/email-agent.dto";
import { InjectModel } from "@nestjs/mongoose";
import { AGENT_PERSONALITIES } from "./agent-personalities";
import { EmailThread } from "./schemas/email.schema";
import { PamelaMillerService } from "./employees/PamelaMiller.service";


@Injectable()
export class AgentsService {
  constructor(
    @InjectModel(EmailThread.name) private emailModel: Model<EmailThread>,
    private readonly logger: Logger,
    private readonly pamelaMiller: PamelaMillerService,
  ) { }
  private model = new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    model: "gemini-3.5-flash-lite"
  })


  async createCanvas(createOnboardingDto: CreateOnboardingDto[]): Promise<LeanCanvasOutput> {
    this.logger.log("Creating Canvas")
    const structuredModel = this.model.withStructuredOutput(LeanCanvasSchema)
    const prompt = LeanCanvasAgent.generatePrompt(createOnboardingDto)
    const parsed = await structuredModel.invoke(prompt)
    const output: LeanCanvasOutput = {
      channels: parsed.channels,
      problem: parsed.problem,
      costStructure: parsed.costStructure,
      customerSegments: parsed.customerSegments,
      keyMetrics: parsed.keyMetrics,
      revenueStreams: parsed.revenueStreams,
      solution: parsed.solution,
      unfairAdvantage: parsed.unfairAdvantage,
      uniqueValueProposition: parsed.uniqueValueProposition,
    };
    this.logger.log("Canvas Created")
    return output;
  }

  async saveEmail(email: EmailAgentDTO, sender: string) {
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

  async initiateAgent(email: EmailAgentDTO, sender: string) {
    const prompt = `
    Make use of available tools and answer the user's query based on your personality
    Personality: ${AGENT_PERSONALITIES['pamela-miller'].personalitySummary}
    Query: ${email.content}
    Session Name: ${sender}
    `
    const result = await this.pamelaMiller.modelWithTools.invoke(prompt)
    for (const call of result.tool_calls ?? []) {
      if (call.name === "create-calendar") {
        const toolResult = await this.pamelaMiller.createCalendarTool.invoke(call);
        console.log(toolResult.content)
        // do something with toolResult — save it, feed it back to the model, etc.
      }
    }
  }

  async getEmailThreads(): Promise<EmailThread[]> {
    return await this.emailModel.find().exec();
  }
}
