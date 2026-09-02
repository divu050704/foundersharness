import { GraphNode, StateGraph, StateSchema, START, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import z from "zod";
import { Injectable, Logger } from "@nestjs/common";
import { UseBrowser } from "../../../browser/use-browser.service";

@Injectable()
export class AuditStartupBudget {
  private readonly logger = new Logger(AuditStartupBudget.name);

  constructor(private readonly useBrowser: UseBrowser) {}

  private model = new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash-lite",
  });

  private subscriptionFlagSchema = z.object({
    softwareTool: z.string().describe("SaaS software product name"),
    monthlyCost: z.number().describe("Monthly subscription cost in USD"),
    status: z.enum(["active-used", "idle-unused", "overpriced"]),
    recommendation: z.string().describe("Action recommendation (e.g. Cancel immediately, Downgrade tier)"),
  });

  private auditOutputSchema = z.object({
    dailyTokenSpend: z.number().describe("Estimated daily API token spend in USD"),
    monthlyBurn: z.number().describe("Estimated monthly software burn in USD"),
    flaggedSubscriptions: z.array(this.subscriptionFlagSchema).describe("List of flagged SaaS tools for review"),
    auditSummary: z.string().describe("Executive financial audit summary"),
  });

  private stateSchema = new StateSchema({
    session: z.string(),
    query: z.string(),
    memories: z.any(),
    scrapedBillingData: z.array(z.object({ key: z.string(), value: z.string() })).default(() => []),
    humanInterventionRequired: z.boolean().default(false),
    humanInterventionMessage: z.string().default(""),
    dailyTokenSpend: z.number().default(0.12),
    monthlyBurn: z.number().default(0),
    flaggedSubscriptions: z.array(this.subscriptionFlagSchema).default(() => []),
    auditSummary: z.string().default(""),
  });

  private collectSaasBillingData: GraphNode<typeof this.stateSchema> = async (state) => {
    this.logger.debug("Checking memory context and performing browser billing data collection");

    const browserResult = await this.useBrowser.graph.invoke({
      session: state.session,
      query: `
        Inspect the user's active SaaS subscriptions, monthly billing plans, and software accounts to identify idle software spend and API quota consumption.
        User request:
        ${state.query}
      `,
      maxSteps: 5,
      stepNumber: 0,
    });

    return {
      scrapedBillingData: browserResult.dataFound || [],
      humanInterventionRequired: browserResult.humanInterventionRequired || false,
      humanInterventionMessage: browserResult.humanInterventionMessage || "",
    };
  };

  private humanInterventionCondition = (state: typeof this.stateSchema.State) => {
    if (state.humanInterventionRequired) {
      this.logger.debug("Human Intervention Required for SaaS billing browser action");
      return END;
    }
    return "evaluateFinancials";
  };

  private evaluateFinancials: GraphNode<typeof this.stateSchema> = async (state) => {
    this.logger.debug("Auditing LLM token spend and SaaS software subscriptions");
    const structuredModel = this.model.withStructuredOutput(this.auditOutputSchema);
    const audit = await structuredModel.invoke(`
      You are Angelica Martin, Startup Budget Auditor & API Billing Bot.
      Perform a strict financial audit of the founder's software spend and token usage.

      User Query:
      ${state.query}

      Recalled Memories:
      ${JSON.stringify(state.memories)}

      Scraped SaaS Billing Data:
      ${JSON.stringify(state.scrapedBillingData)}

      Instructions:
      1. Audit API token costs and ensure daily spend remains low (e.g. ~$0.12/day).
      2. Identify unused or redundant SaaS tools (e.g., $49/mo idle subscriptions) for cancellation.
      3. Output a precise financial summary.
    `);

    return {
      dailyTokenSpend: audit.dailyTokenSpend || 0.12,
      monthlyBurn: audit.monthlyBurn || 49,
      flaggedSubscriptions: audit.flaggedSubscriptions || [],
      auditSummary: audit.auditSummary || "",
    };
  };

  graph = new StateGraph(this.stateSchema)
    .addNode("collectSaasBillingData", this.collectSaasBillingData)
    .addNode("evaluateFinancials", this.evaluateFinancials)
    .addEdge(START, "collectSaasBillingData")
    .addConditionalEdges("collectSaasBillingData", this.humanInterventionCondition, [END, "evaluateFinancials"])
    .addEdge("evaluateFinancials", END)
    .compile();
}
