import { Injectable, Logger } from "@nestjs/common";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ExecuteBrowserPosting } from "../graphs/lucas-bennett/ExecuteBrowserPosting.service";
import z from "zod";
import { tool } from "@langchain/core/tools";
import { MemoryService } from "../../memory/memory.service";
import { HindsightService } from "../../memory/hindsight.service";
import { AGENT_PERSONALITIES } from "../agent-personalities";
import { EmailAgentDTO } from "../dto/create-email-agent.dto";

@Injectable()
export class LucasBennettService {
  private readonly logger = new Logger(LucasBennettService.name);

  constructor(
    private readonly executeBrowserGraph: ExecuteBrowserPosting,
    private readonly memory: MemoryService,
    private readonly hindsightService: HindsightService,
  ) {}

  private model = new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash-lite",
  });

  executeBrowserTool = tool(
    async ({ query, session }) => {
      this.logger.debug("Extracting Knowledge for Lucas Bennett");
      const memories = await this.memory.recall(session, query);
      this.logger.debug("Invoking ExecuteBrowserPosting graph");

      return await this.executeBrowserGraph.graph.invoke({
        query,
        memories,
        session,
      });
    },
    {
      name: "execute-browser-posting",
      description: `
        Automate publishing social media updates via authenticated Playwright browser sessions ONLY when explicitly asked to post or publish content.

        DO NOT call this tool for casual conversation, general questions about Lucas, small talk, or acknowledgments.
      `,
      schema: z.object({
        query: z.string().describe("User request to publish a social media update via browser automation"),
        session: z.string().describe("Active session name"),
      }),
    }
  );

  modelWithTools = this.model.bindTools([this.executeBrowserTool]);

  async runModel(email: EmailAgentDTO, sender: string, previousContext?: string, currentThreadId?: string) {
    const personality = AGENT_PERSONALITIES["lucas-bennett"];

    // Save user query in Hindsight only
    try {
      if (process.env.HINDSIGHT_URL) {
        await this.hindsightService.retain(
          sender,
          email.content,
          "User Email Query & Preference for Lucas Bennett"
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
      You are Lucas Bennett, Stealth Browser Automation Specialist.
      PERSONALITY: ${personality.personalitySummary}
      CAPABILITIES: ${personality.capabilities?.join("\n") ?? ""}
      PAST CONVERSATION: ${previousContext || "None"}
      RECALLED USER PREFERENCES:
      ${JSON.stringify(userMemories)}
      ${hindsightMemories ? JSON.stringify(hindsightMemories) : ""}
      USER REQUEST: ${email.content}
      SESSION NAME: ${sender}
      Decide whether to use execute-browser-posting tool.
    `;

    const result = await this.modelWithTools.invoke(prompt);
    let toolResult: any = undefined;

    for (const call of result.tool_calls ?? []) {
      if (call.name === "execute-browser-posting") {
        const messageResult = await this.executeBrowserTool.invoke(call);
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
          type: "browser-posting-result",
          content: graphResult,
          summary: `Browser post automated: ${graphResult?.permalink || email.content}`,
          producedBy: "lucas-bennett",
        });
      }
    }

    let finalPrompt: string;
    if (toolResult) {
      finalPrompt = `
        You are Lucas Bennett. Write a witty, relaxed email reply summarizing the browser posting execution.
        USER REQUEST: ${email.content}
        WORK RESULT: ${JSON.stringify(toolResult, null, 2)}
        USER PREFERENCES: ${JSON.stringify(userMemories)}
        PERSONALITY: ${personality.personalitySummary}
        Output only the clean email body text without headers.
      `;
    } else {
      finalPrompt = `
        You are Lucas Bennett, Stealth Browser Automation Specialist.
        Write a friendly, clever email reply to the user's request.
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
