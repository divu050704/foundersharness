import "dotenv/config";
import { CreateOnboardingDto } from "../onboarding/dto/create-onboarding.dto";
import { Injectable, Logger } from '@nestjs/common';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { LeanCanvasAgent } from "./instances";
import { LeanCanvasSchema } from "./schema";
import type { LeanCanvasOutput } from "./schema";
import { Model } from "mongoose";
import { EmailAgentDTO } from "./dto/create-email-agent.dto";
import { InjectModel } from "@nestjs/mongoose";
import { AGENT_PERSONALITIES } from "./agent-personalities";
import { EmailThread } from "./schemas/email.schema";
import { PamelaMillerService } from "./employees/PamelaMiller.service";
import { UpdateEmailAgentDTO } from "./dto/update-email-agent.dto";


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

  async saveEmail(email: UpdateEmailAgentDTO, sender: string) {
    const isAgentSender = sender.includes('@foundersharness.ai') || sender.includes('@dundermifflin.com');

    const newEmail = {
        attachments: email.attachments || [],
        content: email.content,
        read: false,
        receiver: email.receiver,
        sender: sender
    };

    if (email.threadId) {
      const thread = await this.emailModel.findById(email.threadId);
      if (thread) {
        thread.emails = thread.emails || [];
        thread.emails.push(newEmail as any);
        return await thread.save();
      }
    }

    const createEmailThread = new this.emailModel({
      emails: [newEmail],
      subject: email.subject,
      agent: isAgentSender ? sender : email.receiver
    });
    return await createEmailThread.save();
  }

  async replyAgent(email: EmailAgentDTO, sender: string) {
    console.log(email.receiver)
    let previousContext = "";
    let currentThreadId = email.threadId;

    if (currentThreadId) {
      const thread = await this.emailModel.findById(currentThreadId).exec();
      if (thread && thread.emails) {
        previousContext = thread.emails
          .map(e => `From: ${e.sender}\nTo: ${e.receiver}\nContent: ${e.content}`)
          .join("\n\n---\n\n");
      }

      await this.emailModel.findByIdAndUpdate(
        currentThreadId,
        {
          $push: {
            emails: {
              content: email.content,
              sender: sender,
              receiver: email.receiver,
              read: false,
              attachments: email.attachments || [],
            }
          }
        }
      ).exec();
    } else {
      const newThread = new this.emailModel({
        subject: email.subject || "New Conversation",
        agent: email.receiver,
        emails: [{
          content: email.content,
          sender: sender,
          receiver: email.receiver,
          read: false,
          attachments: email.attachments || [],
        }]
      });
      const savedThread = await newThread.save();
      currentThreadId = savedThread._id.toString();
    }

    if (email.receiver === "pamela.miller@foundersharness.ai") {
      const reply = await this.pamelaMiller.runModel(email, sender, previousContext)
      
      if (currentThreadId) {
        await this.emailModel.findByIdAndUpdate(
          currentThreadId,
          {
            $push: {
              emails: {
                content: reply,
                sender: "pamela.miller@foundersharness.ai",
                receiver: sender,
                read: false,
                attachments: [],
              }
            }
          }
        ).exec();
      }

      return { reply }

    }
  }

  async getEmailThreads(): Promise<EmailThread[]> {
    return await this.emailModel.find().exec();
  }
}
