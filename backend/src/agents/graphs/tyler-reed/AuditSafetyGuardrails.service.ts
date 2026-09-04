import { GraphNode, StateGraph, StateSchema, START, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import z from "zod";
import { Injectable, Logger } from "@nestjs/common";
import { UseBrowser } from "../../../browser/use-browser.service";

@Injectable()
export class AuditSafetyGuardrails {
  private readonly logger = new Logger(AuditSafetyGuardrails.name);

  constructor(private readonly useBrowser: UseBrowser) {}

  private model = new ChatGoogleGenerativeAI({
    model: "gemini-3.1-flash-lite",
  });

  private safetyOutputSchema = z.object({
    humanDelayMs: z.number().describe("Enforced click delay interval in milliseconds (default 3400ms)"),
    shadowbanRisk: z.enum(["zero", "low", "moderate", "high"]).describe("Assessed platform shadowban risk level"),
    complianceSummary: z.string().describe("Executive HR and safety compliance summary"),
  });

  private stateSchema = new StateSchema({
    session: z.string(),
    query: z.string(),
    memories: z.any(),
    scrapedSafetyData: z.array(z.object({ key: z.string(), value: z.string() })).default(() => []),
    humanInterventionRequired: z.boolean().default(false),
    humanInterventionMessage: z.string().default(""),
    humanDelayMs: z.number().default(3400),
    shadowbanRisk: z.string().default("zero"),
    complianceSummary: z.string().default(""),
  });

  private inspectSafetySession: GraphNode<typeof this.stateSchema> = async (state) => {
    this.logger.debug("Checking memory context and auditing browser delay intervals via browser sandbox");

    const browserCheck = await this.useBrowser.graph.invoke({
      session: state.session,
      query: `
        Audit the current browser session activity, social posting rate limits, and 3.4s delay compliance across active accounts.
        User Query:
        ${state.query}
      `,
      maxSteps: 4,
      stepNumber: 0,
    });

    return {
      scrapedSafetyData: browserCheck.dataFound || [],
      humanInterventionRequired: browserCheck.humanInterventionRequired || false,
      humanInterventionMessage: browserCheck.humanInterventionMessage || "",
    };
  };

  private humanInterventionCondition = (state: typeof this.stateSchema.State) => {
    if (state.humanInterventionRequired) {
      this.logger.debug("Human Intervention Required for safety audit browser action");
      return END;
    }
    return "auditCompliance";
  };

  private auditCompliance: GraphNode<typeof this.stateSchema> = async (state) => {
    this.logger.debug("Auditing browser human-like click delays and posting rate limits");
    const structuredModel = this.model.withStructuredOutput(this.safetyOutputSchema);
    const result = await structuredModel.invoke(`
      You are Tyler Reed, HR, API Rate Limit & Safety Guardrail Monitor.
      Audit the system's browser automation delays and social rate limits.

      User Query:
      ${state.query}

      Recalled Memories:
      ${JSON.stringify(state.memories)}

      Scraped Safety Audit Data:
      ${JSON.stringify(state.scrapedSafetyData)}

      Instructions:
      1. Confirm human-like 3.4s delay intervals are active between browser automation actions.
      2. Verify 0 shadowban flags detected across social platforms.
    `);

    return {
      humanDelayMs: result.humanDelayMs || 3400,
      shadowbanRisk: result.shadowbanRisk || "zero",
      complianceSummary: result.complianceSummary || "",
    };
  };

  graph = new StateGraph(this.stateSchema)
    .addNode("inspectSafetySession", this.inspectSafetySession)
    .addNode("auditCompliance", this.auditCompliance)
    .addEdge(START, "inspectSafetySession")
    .addConditionalEdges("inspectSafetySession", this.humanInterventionCondition, [END, "auditCompliance"])
    .addEdge("auditCompliance", END)
    .compile();
}
