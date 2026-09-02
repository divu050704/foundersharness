import { Injectable, Logger } from "@nestjs/common";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AuditSafetyGuardrails } from "../graphs/tyler-reed/AuditSafetyGuardrails.service";
import z from "zod";
import { tool } from "@langchain/core/tools";
import { MemoryService } from "../../memory/memory.service";
import { HindsightService } from "../../memory/hindsight.service";
import { AGENT_PERSONALITIES } from "../agent-personalities";
import { EmailAgentDTO } from "../dto/create-email-agent.dto";

@Injectable()
export class TylerReedService {
  private readonly logger = new Logger(TylerReedService.name);

  constructor(
    private readonly auditSafetyGraph: AuditSafetyGuardrails,
    private readonly memory: MemoryService,
    private readonly hindsightService: HindsightService,
  ) {}

  private model = new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash-lite",
  });

  auditSafetyTool = tool(
    async ({ query, session }) => {
      this.logger.debug("Extracting Knowledge for Tyler Reed");
      const memories = await this.memory.recall(session, query);
      this.logger.debug("Invoking AuditSafetyGuardrails graph");

      return await this.auditSafetyGraph.graph.invoke({
        query,
        memories,
        session,
      });
    },
    {
      name: "audit-safety-guardrails",
      description: `
        Audit 3.4s human-like click delays, social posting rate limits, and zero shadowban compliance ONLY when explicitly asked to check safety, delays, or rate limits.

        DO NOT call this tool for casual conversation, general questions about Tyler, small talk, or acknowledgments.
      `,
      schema: z.object({
        query: z.string().describe("User request to check safety, delays, or rate limits"),
        session: z.string().describe("Active session name"),
      }),
    }
  );

  modelWithTools = this.model.bindTools([this.auditSafetyTool]);

  async runModel(email: EmailAgentDTO, sender: string, previousContext?: string, currentThreadId?: string) {
    const personality = AGENT_PERSONALITIES["tyler-reed"];

    // Save user query in Hindsight only
    try {
      if (process.env.HINDSIGHT_URL) {
        await this.hindsightService.retain(
          sender,
          email.content,
          "User Email Query & Preference for Tyler Reed"
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
      You are Tyler Reed, HR, API Rate Limit & Safety Guardrail Monitor.
      PERSONALITY: ${personality.personalitySummary}
      CAPABILITIES: ${personality.capabilities?.join("\n") ?? ""}
      PAST CONVERSATION: ${previousContext || "None"}
      RECALLED USER PREFERENCES:
      ${JSON.stringify(userMemories)}
      ${hindsightMemories ? JSON.stringify(hindsightMemories) : ""}
      USER REQUEST: ${email.content}
      SESSION NAME: ${sender}
      Decide whether to use audit-safety-guardrails tool.
    `;

    const result = await this.modelWithTools.invoke(prompt);
    let toolResult: any = undefined;

    for (const call of result.tool_calls ?? []) {
      if (call.name === "audit-safety-guardrails") {
        const messageResult = await this.auditSafetyTool.invoke(call);
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
          type: "safety-audit-result",
          content: graphResult,
          summary: `Safety compliance audit executed: ${graphResult?.complianceSummary || email.content}`,
          producedBy: "tyler-reed",
        });
      }
    }

    let finalPrompt: string;
    if (toolResult) {
      finalPrompt = `
        You are Tyler Reed. Write a polite, compliance-minded email reply summarizing the safety audit work.
        USER REQUEST: ${email.content}
        WORK RESULT: ${JSON.stringify(toolResult, null, 2)}
        USER PREFERENCES: ${JSON.stringify(userMemories)}
        PERSONALITY: ${personality.personalitySummary}
        Output only the clean email body text without headers.
      `;
    } else {
      finalPrompt = `
        You are Tyler Reed, HR, API Rate Limit & Safety Guardrail Monitor.
        Write a polite, reassuring, compliance-minded email reply to the user's request.
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
