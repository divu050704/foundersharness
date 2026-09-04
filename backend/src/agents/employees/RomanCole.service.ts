import { Injectable, Logger } from "@nestjs/common";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ScoutTechEvents } from "../graphs/roman-cole/ScoutTechEvents.service";
import z from "zod";
import { tool } from "@langchain/core/tools";
import { MemoryService } from "../../memory/memory.service";
import { HindsightService } from "../../memory/hindsight.service";
import { AGENT_PERSONALITIES } from "../agent-personalities";
import { EmailAgentDTO } from "../dto/create-email-agent.dto";

@Injectable()
export class RomanColeService {
  private readonly logger = new Logger(RomanColeService.name);

  constructor(
    private readonly scoutEventsGraph: ScoutTechEvents,
    private readonly memory: MemoryService,
    private readonly hindsightService: HindsightService,
  ) {}

  private model = new ChatGoogleGenerativeAI({
    model: "gemini-3.1-flash-lite",
  });

  scoutEventsTool = tool(
    async ({ query, session }) => {
      this.logger.debug("Extracting Knowledge for Roman Cole");
      const memories = await this.memory.recall(session, query);
      this.logger.debug("Invoking ScoutTechEvents graph");

      return await this.scoutEventsGraph.graph.invoke({
        query,
        memories,
        session,
      });
    },
    {
      name: "scout-tech-events",
      description: `
        Scout high-density VC networking socials, founder demo nights, and tech pitch competitions ONLY when explicitly asked to find events or socials.

        DO NOT call this tool for casual conversation, general questions about Roman, small talk, or acknowledgments.
      `,
      schema: z.object({
        query: z.string().describe("User request to find networking events or demo nights"),
        session: z.string().describe("Active session name"),
      }),
    }
  );

  modelWithTools = this.model.bindTools([this.scoutEventsTool]);

  async runModel(email: EmailAgentDTO, sender: string, previousContext?: string, currentThreadId?: string) {
    const personality = AGENT_PERSONALITIES["roman-cole"];

    // Save user query in Hindsight only
    try {
      if (process.env.HINDSIGHT_URL) {
        await this.hindsightService.retain(
          sender,
          email.content,
          "User Email Query & Preference for Roman Cole"
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
      You are Roman Cole, Local Meetups & Tech Event Scout.
      PERSONALITY: ${personality.personalitySummary}
      CAPABILITIES: ${personality.capabilities?.join("\n") ?? ""}
      PAST CONVERSATION: ${previousContext || "None"}
      RECALLED USER PREFERENCES:
      ${JSON.stringify(userMemories)}
      ${hindsightMemories ? JSON.stringify(hindsightMemories) : ""}
      USER REQUEST: ${email.content}
      SESSION NAME: ${sender}
      Decide whether to use scout-tech-events tool.
    `;

    const result = await this.modelWithTools.invoke(prompt);
    let toolResult: any = undefined;

    for (const call of result.tool_calls ?? []) {
      if (call.name === "scout-tech-events") {
        const messageResult = await this.scoutEventsTool.invoke(call);
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
          type: "events-scout-result",
          content: graphResult?.topEvents ?? [],
          summary: `Tech events scout executed: ${email.content}`,
          producedBy: "roman-cole",
        });
      }
    }

    let finalPrompt: string;
    if (toolResult) {
      finalPrompt = `
        You are Roman Cole. Write an upbeat, networking-focused email reply summarizing the event scout results.
        USER REQUEST: ${email.content}
        WORK RESULT: ${JSON.stringify(toolResult, null, 2)}
        USER PREFERENCES: ${JSON.stringify(userMemories)}
        PERSONALITY: ${personality.personalitySummary}
        Output only the clean email body text without headers.
      `;
    } else {
      finalPrompt = `
        You are Roman Cole, Local Meetups & Tech Event Scout.
        Write an upbeat, tech-savvy email reply to the user's request.
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
