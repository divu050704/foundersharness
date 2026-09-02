import { Injectable, Logger } from "@nestjs/common";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { GenerateSocialMediaCalendar } from "../graphs/sophia-chen/GenerateSocialMediaCalendar.service";
import z from "zod";
import { tool } from "@langchain/core/tools";
import { HindsightService } from "../../memory/hindsight.service";
import { AGENT_PERSONALITIES } from "../agent-personalities";
import { MemoryService } from "../../memory/memory.service";
import { EmailAgentDTO } from "../dto/create-email-agent.dto";
import { InjectModel } from "@nestjs/mongoose";
import { EmailThread } from "../schemas/email.schema";
import { Model } from "mongoose";

@Injectable()
export class SophiaChenService {
  private readonly logger = new Logger(SophiaChenService.name);

  constructor(
    @InjectModel(EmailThread.name) private emailModel: Model<EmailThread>,
    private readonly generateSocialMediaCalendar: GenerateSocialMediaCalendar,
    private readonly memory: MemoryService,
    private readonly hindsightService: HindsightService,
  ) {}

  private model = new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash-lite",
  });

  createCalendarTool = tool(
    async ({ query, session }) => {
      this.logger.debug("Extracting Knowledge for Sophia Chen");
      const memories = await this.memory.recall(session, query);
      this.logger.debug("Invoking Sophia Chen graph");

      return await this.generateSocialMediaCalendar.graph.invoke({
        query,
        memories,
        session,
      });
    },
    {
      name: "create-calendar",
      description: `
        Create a social media content calendar ONLY when the user explicitly asks you to create, generate, plan, build, or prepare a social media content calendar.

        DO NOT call this tool for:
        - Casual conversation or small talk
        - Questions about Sophia Chen or what Sophia can do
        - General social media questions, advice, or explanations
        - Acknowledgements such as "Thanks", "Okay", or "Great"
      `,
      schema: z.object({
        query: z.string().describe("User request to create a social media calendar"),
        session: z.string().describe("Active session name"),
      }),
    }
  );

  modelWithTools = this.model.bindTools([this.createCalendarTool]);

  async runModel(email: EmailAgentDTO, sender: string, previousContext?: string, currentThreadId?: string) {
    const personality = AGENT_PERSONALITIES["sophia-chen"];

    // Save user query in Hindsight only
    try {
      if (process.env.HINDSIGHT_URL) {
        await this.hindsightService.retain(
          sender,
          email.content,
          "User Email Query & Preference for Sophia Chen"
        );
      }
    } catch (e) {
      this.logger.warn(`Hindsight retain warning: ${e}`);
    }

    const userMemories = await this.memory.recall(sender, email.content);
    let hindsightMemories: any = null;
    try {
      if (process.env.HINDSIGHT_URL) {
        hindsightMemories = await this.hindsightService.retrieveMemory(sender, email.content);
      }
    } catch (_e) {}

    const prompt = `
      You are Sophia Chen, an AI social media strategist.

      PERSONALITY:
      ${personality.personalitySummary}

      CAPABILITIES:
      ${personality.capabilities?.join("\n") ?? ""}

      PAST CONVERSATION IN THIS THREAD:
      ${previousContext ? previousContext : "None"}

      RECALLED USER PREFERENCES & MEMORIES:
      ${JSON.stringify(userMemories)}
      ${hindsightMemories ? JSON.stringify(hindsightMemories) : ""}

      USER REQUEST:
      ${email.content}

      SESSION NAME:
      ${sender}

      Decide whether one of your available tools is required to fulfill the user's request.
    `;

    const result = await this.modelWithTools.invoke(prompt);
    let toolResult: any = undefined;

    for (const call of result.tool_calls ?? []) {
      if (call.name === "create-calendar") {
        const messageResult = await this.createCalendarTool.invoke(call);
        let graphResult: any = messageResult;
        if (typeof messageResult?.content === "string") {
          try {
            graphResult = JSON.parse(messageResult.content);
          } catch (_e) {
            graphResult = messageResult;
          }
        }
        toolResult = graphResult;
        await this.memory.save(sender, {
          type: "social-media-calendar",
          content: graphResult?.posts ?? [],
          summary: `Posts calendar created based on user query: ${graphResult?.query ?? email.content}`,
          producedBy: "sophia-chen",
        });
      }
    }

    let finalPrompt: string;
    if (toolResult) {
      finalPrompt = `
        You are Sophia Chen, an AI social media strategist.
        Write a concise, warm email reply summarizing the completed social media calendar work.

        USER REQUEST: ${email.content}
        WORK RESULT: ${JSON.stringify(toolResult, null, 2)}
        USER PREFERENCES: ${JSON.stringify(userMemories)}
        PERSONALITY: ${personality.personalitySummary}

        INSTRUCTIONS:
        1. Explain what work was completed with concrete details (topics, post hooks, image prompts).
        2. Do not invent details not in the work result.
        3. Output only the clean email body text without headers.
      `;
    } else {
      finalPrompt = `
        You are Sophia Chen, an AI social media strategist.
        Write a natural, friendly email reply to the user's request.

        IMPORTANT:
        No tool was used for this request. Do not pretend work was performed.

        USER REQUEST: ${email.content}
        PAST THREAD CONVERSATION: ${previousContext || "None"}
        USER PREFERENCES: ${JSON.stringify(userMemories)}
        PERSONALITY: ${personality.personalitySummary}
        CAPABILITIES: ${personality.capabilities?.join(", ")}

        INSTRUCTIONS:
        1. Directly respond to the user's request conversationally.
        2. If asking about your capabilities, explain naturally how you can help.
        3. Output only the clean email body text without headers.
      `;
    }

    const response = await this.model.invoke(finalPrompt);
    return response.content;
  }
}