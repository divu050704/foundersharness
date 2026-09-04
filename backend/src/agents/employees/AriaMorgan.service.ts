import { Injectable, Logger } from "@nestjs/common";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AuditStartupBudget } from "../graphs/aria-morgan/AuditStartupBudget.service";
import z from "zod";
import { tool } from "@langchain/core/tools";
import { MemoryService } from "../../memory/memory.service";
import { HindsightService } from "../../memory/hindsight.service";
import { AGENT_PERSONALITIES } from "../agent-personalities";
import { EmailAgentDTO } from "../dto/create-email-agent.dto";

@Injectable()
export class AriaMorganService {
  private readonly logger = new Logger(AriaMorganService.name);

  constructor(
    private readonly auditBudgetGraph: AuditStartupBudget,
    private readonly memory: MemoryService,
    private readonly hindsightService: HindsightService,
  ) {}

  private model = new ChatGoogleGenerativeAI({
    model: "gemini-3.1-flash-lite",
  });

  auditBudgetTool = tool(
    async ({ query, session }) => {
      this.logger.debug("Extracting Knowledge for Aria Morgan");
      const memories = await this.memory.recall(session, query);
      this.logger.debug("Invoking AuditStartupBudget graph");

      return await this.auditBudgetGraph.graph.invoke({
        query,
        memories,
        session,
      });
    },
    {
      name: "audit-startup-budget",
      description: `
        Audit daily LLM API token spend, track startup monthly burn rate, and identify idle SaaS subscriptions to cancel ONLY when explicitly requested to audit budget or subscriptions.

        DO NOT call this tool for casual conversation, general financial advice, questions about Aria, small talk, or acknowledgments.
      `,
      schema: z.object({
        query: z.string().describe("User request to audit software budget or token spend"),
        session: z.string().describe("Active session name"),
      }),
    }
  );

  modelWithTools = this.model.bindTools([this.auditBudgetTool]);

  async runModel(email: EmailAgentDTO, sender: string, previousContext?: string, currentThreadId?: string) {
    const personality = AGENT_PERSONALITIES["aria-morgan"];

    // Save user query in Hindsight only
    // try {
    //   if (process.env.HINDSIGHT_URL) {
    //     await this.hindsightService.retain(
    //       sender,
    //       email.content,
    //       "User Email Query & Preference for Aria Morgan"
    //     );
    //   }
    // } catch (e) {
    //   this.logger.warn(`Hindsight retain warning: ${e}`);
    // }

    const userMemories = await this.memory.recall(sender, email.content);
    let hindsightMemories: any = null;
    // try {
    //   if (process.env.HINDSIGHT_URL) {
    //     hindsightMemories = await this.hindsightService.retrieveMemory(sender, email.content);
    //   }
    // } catch (_e) {}

    const prompt = `
      You are Aria Morgan, Startup Budget Auditor & API Billing Bot.
      PERSONALITY: ${personality.personalitySummary}
      CAPABILITIES: ${personality.capabilities?.join("\n") ?? ""}
      PAST CONVERSATION: ${previousContext || "None"}
      RECALLED USER PREFERENCES:
      ${JSON.stringify(userMemories)}
      ${hindsightMemories ? JSON.stringify(hindsightMemories) : ""}
      USER REQUEST: ${email.content}
      SESSION NAME: ${sender}
      Decide whether to use audit-startup-budget tool.
    `;

    const result = await this.modelWithTools.invoke(prompt);
    let toolResult: any = undefined;

    for (const call of result.tool_calls ?? []) {
      if (call.name === "audit-startup-budget") {
        const messageResult = await this.auditBudgetTool.invoke(call);
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
          type: "budget-audit-result",
          content: graphResult,
          summary: `Financial audit executed: ${graphResult?.auditSummary || email.content}`,
          producedBy: "aria-morgan",
        });
      }
    }

    let finalPrompt: string;
    if (toolResult) {
      finalPrompt = `
        You are Aria Morgan. Write a strict, frugal email reply summarizing the financial audit work.
        USER REQUEST: ${email.content}
        WORK RESULT: ${JSON.stringify(toolResult, null, 2)}
        USER PREFERENCES: ${JSON.stringify(userMemories)}
        PERSONALITY: ${personality.personalitySummary}
        Output only the clean email body text without headers.
      `;
    } else {
      finalPrompt = `
        You are Aria Morgan, Startup Budget Auditor & API Billing Bot.
        Write a precise, frugal email reply to the user's request.
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
