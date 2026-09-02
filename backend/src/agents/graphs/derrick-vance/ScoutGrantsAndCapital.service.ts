import { GraphNode, StateGraph, StateSchema, ReducedValue, START, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import z from "zod";
import { Injectable, Logger } from "@nestjs/common";
import { UseBrowser } from "../../../browser/use-browser.service";

@Injectable()
export class ScoutGrantsAndCapital {
  private readonly logger = new Logger(ScoutGrantsAndCapital.name);

  constructor(private readonly useBrowser: UseBrowser) {}

  private model = new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash-lite",
  });

  private grantOutputSchema = z.object({
    grantTitle: z.string().describe("Name of the non-dilutive grant or cloud credit program"),
    amount: z.string().describe("Funding amount (e.g. $100,000 NSF Grant, $100K AWS Credits)"),
    provider: z.string().describe("Granting agency or cloud provider"),
    deadline: z.string().describe("Application deadline or rolling window"),
    eligibilitySummary: z.string().describe("Why this startup qualifies based on sector and stage"),
    applicationUrl: z.string().describe("Official application link or portal URL"),
  });

  private grantListSchema = z.object({
    grants: z.array(this.grantOutputSchema).describe("List of eligible non-dilutive grant and credit matches"),
  });

  private stateSchema = new StateSchema({
    session: z.string(),
    query: z.string(),
    memories: z.any(),
    scrapedData: z.array(z.object({ key: z.string(), value: z.string() })).default(() => []),
    humanInterventionRequired: z.boolean().default(false),
    humanInterventionMessage: z.string().default(""),
    grants: new ReducedValue(
      z.array(this.grantOutputSchema).default(() => []),
      { reducer: (curr, upd) => curr.concat(upd) }
    ),
  });

  private searchGrantDatabases: GraphNode<typeof this.stateSchema> = async (state) => {
    this.logger.debug("Scouting grant portals and cloud credit programs");
    const searchResult = await this.useBrowser.graph.invoke({
      session: state.session,
      query: `
        Search for active $100K+ non-dilutive AI innovation grants (NSF SBIR, NIH, state innovation funds) and $100K-$250K Google Cloud / AWS startup credit packages matching the user's startup sector.
        User Query: ${state.query}
      `,
      maxSteps: 5,
      stepNumber: 0,
    });

    return {
      scrapedData: searchResult.dataFound || [],
      humanInterventionRequired: searchResult.humanInterventionRequired || false,
      humanInterventionMessage: searchResult.humanInterventionMessage || "",
    };
  };

  private humanInterventionCondition = (state: typeof this.stateSchema.State) => {
    if (state.humanInterventionRequired) {
      this.logger.debug("Human Intervention Required for grant scouting browser action");
      return END;
    }
    return "evaluateGrantEligibility";
  };

  private evaluateGrantEligibility: GraphNode<typeof this.stateSchema> = async (state) => {
    this.logger.debug("Evaluating grant matches against founder memories");
    const structuredModel = this.model.withStructuredOutput(this.grantListSchema);
    const result = await structuredModel.invoke(`
      You are Derrick Vance, an expert non-dilutive capital scout.
      Analyze the scraped funding data and founder memories to identify high-value zero-equity grants and cloud credit packages.

      User Query:
      ${state.query}

      Founder Memories:
      ${JSON.stringify(state.memories)}

      Scraped Web Data:
      ${JSON.stringify(state.scrapedData)}

      Instructions:
      1. Filter strictly for non-dilutive capital ($100K+ NSF SBIR grants, SBIR Phase I/II, AWS/GCP $100K+ credits).
      2. Ensure zero predatory VC equity terms.
      3. Provide concrete application steps and deadlines.
      Return the structured list of grants.
    `);
    return { grants: result.grants || [] };
  };

  graph = new StateGraph(this.stateSchema)
    .addNode("searchGrantDatabases", this.searchGrantDatabases)
    .addNode("evaluateGrantEligibility", this.evaluateGrantEligibility)
    .addEdge(START, "searchGrantDatabases")
    .addConditionalEdges("searchGrantDatabases", this.humanInterventionCondition, [END, "evaluateGrantEligibility"])
    .addEdge("evaluateGrantEligibility", END)
    .compile();
}
