import { Injectable, Logger } from '@nestjs/common';
import { CreateOnboardingDto } from './dto/create-onboarding.dto';
import { AgentsService } from '../agents/agents.service';
import { User } from '../user/schemas/user.schema';
import type { LeanCanvasOutput } from '../agents/schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EntityExtractorOutput } from '../agents/schema';
import { ALL_AGENT_INSTANCES } from '../agents/instances';
import { AGENT_PERSONALITIES } from '../agents/agent-personalities';
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HindsightService } from '../memory/hindsight.service';

// State Annotation Schema for LangGraph Parallel Fleet Execution
export const FleetEmailAnnotation = Annotation.Root({
  canvasData: Annotation<any>(),
  userEmail: Annotation<string>(),
  messages: Annotation<Record<string, {
    agentId: string;
    agentName: string;
    agentRole: string;
    agentEmail: string;
    subject: string;
    content: string;
  }>>({
    value: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  savedThreads: Annotation<any[]>({
    value: (x, y) => [...x, ...y],
    default: () => [],
  }),
});



@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly agentsService: AgentsService,
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly hindisightService: HindsightService
  ) { }

  async create(createOnboardingDto: CreateOnboardingDto[], email: string) {
    let canvas: any = null;
    canvas = await this.agentsService.createCanvas(createOnboardingDto);
    await this.userModel.updateOne({ email: email }, { questionnaire: createOnboardingDto }, { upsert: true })
    return {
      success: true,
      canvas,
    };
  }

  async saveMemory(Canvas: LeanCanvasOutput, email: string) {

    this.logger.log(`Extracting features from LeanCanvas for email: ${email}`);
    await this.hindisightService.retainCanvas(email, Canvas)
    await this.userModel.updateOne({email: email}, {initialMemorySaved: true})   

    this.logger.log(`Successfully stored memory extraction for email: ${email}`);
  }

  private buildFleetEmailGraph() {
    const workflow = new StateGraph(FleetEmailAnnotation);

    // 1. Add parallel node for each agent to generate greeting/introductory message
    ALL_AGENT_INSTANCES.forEach((agent) => {
      workflow.addNode(`agent_${agent.id}`, async (state) => {
        const prompt = agent.generatePrompt(state.canvasData);
        let content = "";
        try {
          const model = new ChatGoogleGenerativeAI({
            model: "gemini-3.5-flash-lite",
          });
          const response = await model.invoke(prompt);
          content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
        } catch (err) {
          this.logger.warn(`Failed LLM generation for ${agent.name}, using fallback greeting: ${err}`);
          content = `Hello! I am ${agent.name}, your ${agent.role}.\n\nI have reviewed your startup Lean Canvas and I am ready to assist you. Let's build something iconic!`;
        }

        

        const agentEmail = AGENT_PERSONALITIES[agent.id]?.email || `${agent.id}@foundersharness.ai`;
        const subject = `Welcome to Founder Harness - Greeting from ${agent.name}`;

        return {
          messages: {
            [agent.id]: {
              agentId: agent.id,
              agentName: agent.name,
              agentRole: agent.role,
              agentEmail,
              subject,
              content,
            },
          },
        };
      });
    });

    // 2. Add node to save all generated messages from state into MongoDB
    workflow.addNode("saveToMongoDB", async (state) => {
      const savedThreads: any[] = [];
      const messagesList = Object.values(state.messages || {});

      for (const msg of messagesList) {
        try {
          const savedThread = await this.agentsService.initiateAgent(
            {
              receiver: state.userEmail,
              subject: msg.subject,
              content: msg.content,
              attachments: [],
            },
            msg.agentEmail
          );
          savedThreads.push(savedThread);
        } catch (err) {
          this.logger.error(`Error saving MongoDB email thread for ${msg.agentName}: ${err}`);
        }
      }

      return { savedThreads };
    });

    // 3. Connect START -> parallel agent nodes -> saveToMongoDB -> END
    ALL_AGENT_INSTANCES.forEach((agent) => {
      const nodeName = `agent_${agent.id}`;
      workflow.addEdge(START, nodeName as any);
      workflow.addEdge(nodeName as any, "saveToMongoDB" as any);
    });
    workflow.addEdge("saveToMongoDB" as any, END);

    return workflow.compile();
  }

  async generateEmails(canvasData: LeanCanvasOutput, email: string) {
    this.logger.log(`Invoking LangGraph parallel fleet email graph for user: ${email}`);

    const graph = this.buildFleetEmailGraph();
    const initialState = {
      canvasData,
      userEmail: email,
      messages: {},
      savedThreads: [],
    };

    const finalState = await graph.invoke(initialState);
    this.logger.log(`Successfully generated and saved ${finalState.savedThreads?.length || 0} fleet emails to MongoDB in parallel`);
    return finalState;
  }
}
