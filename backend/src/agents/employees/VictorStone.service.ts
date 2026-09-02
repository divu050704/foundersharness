import { Injectable, Logger } from "@nestjs/common";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ScoutGrantsAndCapital } from "../graphs/victor-stone/ScoutGrantsAndCapital.service";
import z from "zod";
import { tool } from "@langchain/core/tools";
import { MemoryService } from "../../memory/memory.service";
import { HindsightService } from "../../memory/hindsight.service";
import { AGENT_PERSONALITIES } from "../agent-personalities";
import { EmailAgentDTO } from "../dto/create-email-agent.dto";

@Injectable()
export class VictorStoneService {
  private readonly logger = new Logger(VictorStoneService.name);

  constructor(
    private readonly scoutGrantsGraph: ScoutGrantsAndCapital,
    private readonly memory: MemoryService,
    private readonly hindsightService: HindsightService,
  ) {}

  private model = new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash-lite",
  });

  scoutGrantsTool = tool(
    async ({ query, session }) => {
      this.logger.debug("Extracting Knowledge for Victor Stone");
      const memories = await this.memory.recall(session, query);
      this.logger.debug("Invoking ScoutGrantsAndCapital graph");

      return await this.scoutGrantsGraph.graph.invoke({
        query,
        memories,
        session,
      });
    },
    {
      name: "scout-grants-capital",
      description: `
        Scout non-dilutive $100K+ grants, NSF SBIR awards, and AWS/GCP cloud credits ONLY when explicitly requested to search for grants or funding.

        DO NOT call this tool for casual conversation, general financial advice, questions about Victor Stone, small talk, or acknowledgments.
      `,
      schema: z.object({
        query: z.string().describe("User request to scout grants or cloud credits"),
        session: z.string().describe("Active session name"),
      }),
    }
  );

  modelWithTools = this.model.bindTools([this.scoutGrantsTool]);

  async runModel(email: EmailAgentDTO, sender: string, previousContext?: string, currentThreadId?: string) {
    const personality = AGENT_PERSONALITIES["victor-stone"];

    // Save user query in Hindsight only
    try {
      if (process.env.HINDSIGHT_URL) {
        await this.hindsightService.retain(
          sender,
          email.content,
          "User Email Query & Preference for Victor Stone"
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
      You are Victor Stone, Capital, Grants & VC Investment Scout.
      PERSONALITY: ${personality.personalitySummary}
      CAPABILITIES: ${personality.capabilities?.join("\n") ?? ""}
      PAST CONVERSATION: ${previousContext || "None"}
      RECALLED USER PREFERENCES:
      ${JSON.stringify(userMemories)}
      ${hindsightMemories ? JSON.stringify(hindsightMemories) : ""}
      USER REQUEST: ${email.content}
      SESSION NAME: ${sender}
      Decide whether to use your scout-grants-capital tool.
    `;

    const result = await this.modelWithTools.invoke(prompt);
    let toolResult: any = undefined;

    for (const call of result.tool_calls ?? []) {
      if (call.name === "scout-grants-capital") {
        const messageResult = await this.scoutGrantsTool.invoke(call);
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
          type: "grant-scout-result",
          content: graphResult?.grants ?? [],
          summary: `Grant scout executed: ${graphResult?.summary || email.content}`,
          producedBy: "victor-stone",
        });
      }
    }

    let finalPrompt: string;
    if (toolResult) {
      finalPrompt = `
        You are Victor Stone. Write an intense, disciplined email reply summarizing the grant scout work.
        USER REQUEST: ${email.content}
        WORK RESULT: ${JSON.stringify(toolResult, null, 2)}
        USER PREFERENCES: ${JSON.stringify(userMemories)}
        PERSONALITY: ${personality.personalitySummary}
        Output only the clean email body text without headers.
      `;
    } else {
      finalPrompt = `
        You are Victor Stone, Capital, Grants & VC Investment Scout.
        Write a direct, zero-nonsense email reply to the user's request.
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
