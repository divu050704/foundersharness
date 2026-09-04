import { Injectable, Logger } from "@nestjs/common";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { OptimizeFounderCalendar } from "../graphs/samuel-cross/OptimizeFounderCalendar.service";
import z from "zod";
import { tool } from "@langchain/core/tools";
import { MemoryService } from "../../memory/memory.service";
import { HindsightService } from "../../memory/hindsight.service";
import { AGENT_PERSONALITIES } from "../agent-personalities";
import { EmailAgentDTO } from "../dto/create-email-agent.dto";

@Injectable()
export class SamuelCrossService {
  private readonly logger = new Logger(SamuelCrossService.name);

  constructor(
    private readonly optimizeCalendarGraph: OptimizeFounderCalendar,
    private readonly memory: MemoryService,
    private readonly hindsightService: HindsightService,
  ) {}

  private model = new ChatGoogleGenerativeAI({
    model: "gemini-3.1-flash-lite",
  });

  optimizeCalendarTool = tool(
    async ({ query, session }) => {
      this.logger.debug("Extracting Knowledge for Samuel Cross");
      const memories = await this.memory.recall(session, query);
      this.logger.debug("Invoking OptimizeFounderCalendar graph");

      return await this.optimizeCalendarGraph.graph.invoke({
        query,
        memories,
        session,
      });
    },
    {
      name: "optimize-founder-calendar",
      description: `
        Structure 4-hour uninterrupted deep work focus blocks and auto-decline low-priority sales meeting invites ONLY when explicitly requested to optimize schedule or block focus time.

        DO NOT call this tool for casual conversation, general questions about Samuel, small talk, or acknowledgments.
      `,
      schema: z.object({
        query: z.string().describe("User request to optimize calendar or block focus time"),
        session: z.string().describe("Active session name"),
      }),
    }
  );

  modelWithTools = this.model.bindTools([this.optimizeCalendarTool]);

  async runModel(email: EmailAgentDTO, sender: string, previousContext?: string, currentThreadId?: string) {
    const personality = AGENT_PERSONALITIES["samuel-cross"];

    // Save user query in Hindsight only
    try {
      if (process.env.HINDSIGHT_URL) {
        await this.hindsightService.retain(
          sender,
          email.content,
          "User Email Query & Preference for Samuel Cross"
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
      You are Samuel Cross, Founder Day Planner & Focus Time Manager.
      PERSONALITY: ${personality.personalitySummary}
      CAPABILITIES: ${personality.capabilities?.join("\n") ?? ""}
      PAST CONVERSATION: ${previousContext || "None"}
      RECALLED USER PREFERENCES:
      ${JSON.stringify(userMemories)}
      ${hindsightMemories ? JSON.stringify(hindsightMemories) : ""}
      USER REQUEST: ${email.content}
      SESSION NAME: ${sender}
      Decide whether to use optimize-founder-calendar tool.
    `;

    const result = await this.modelWithTools.invoke(prompt);
    let toolResult: any = undefined;

    for (const call of result.tool_calls ?? []) {
      if (call.name === "optimize-founder-calendar") {
        const messageResult = await this.optimizeCalendarTool.invoke(call);
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
          type: "calendar-optimization-result",
          content: graphResult,
          summary: `Day planner optimization executed: ${graphResult?.summary || email.content}`,
          producedBy: "samuel-cross",
        });
      }
    }

    let finalPrompt: string;
    if (toolResult) {
      finalPrompt = `
        You are Samuel Cross. Write a concise, pragmatic email reply summarizing the calendar optimization.
        USER REQUEST: ${email.content}
        WORK RESULT: ${JSON.stringify(toolResult, null, 2)}
        USER PREFERENCES: ${JSON.stringify(userMemories)}
        PERSONALITY: ${personality.personalitySummary}
        Output only the clean email body text without headers.
      `;
    } else {
      finalPrompt = `
        You are Samuel Cross, Founder Day Planner & Focus Time Manager.
        Write a direct, matter-of-fact email reply to the user's request.
        IMPORTANT: No tool was used for this request. Do not pretend work was performed.
        USER REQUEST: ${email.content}
        PAST CONVERSATION: ${previousContext || "None"}
        USER PREFERENCES: ${JSON.stringify(userMemories)}
        PERSONALITY: ${personality.personalitySummary}
        CAPABILITIES: ${personality.capabilities?.join(", ")}
        Output only the clean email body text without headers.
      `;
    }

    const response = await this.model.invoke(finalPrompt);
    return response.content;
  }
}
