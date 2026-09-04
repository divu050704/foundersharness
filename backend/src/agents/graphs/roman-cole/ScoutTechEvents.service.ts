import { GraphNode, StateGraph, StateSchema, START, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import z from "zod";
import { Injectable, Logger } from "@nestjs/common";
import { UseBrowser } from "../../../browser/use-browser.service";

@Injectable()
export class ScoutTechEvents {
  private readonly logger = new Logger(ScoutTechEvents.name);

  constructor(private readonly useBrowser: UseBrowser) {}

  private model = new ChatGoogleGenerativeAI({
    model: "gemini-3.1-flash-lite",
  });

  private eventSchema = z.object({
    eventName: z.string().describe("Name of the tech event, demo night, or founder meetup"),
    date: z.string().describe("Event date and time"),
    location: z.string().describe("Venue location or online link"),
    vcDensityScore: z.number().describe("Score from 1-10 estimating investor density"),
    url: z.string().describe("RSVP or registration link"),
    rationale: z.string().describe("Why this event is valuable for the founder"),
  });

  private eventListSchema = z.object({
    topEvents: z.array(this.eventSchema).describe("Curated list of high-value networking socials and demo nights"),
  });

  private stateSchema = new StateSchema({
    session: z.string(),
    query: z.string(),
    memories: z.any(),
    scrapedData: z.array(z.object({ key: z.string(), value: z.string() })).default(() => []),
    humanInterventionRequired: z.boolean().default(false),
    humanInterventionMessage: z.string().default(""),
    topEvents: z.array(this.eventSchema).default(() => []),
  });

  private searchEventPlatforms: GraphNode<typeof this.stateSchema> = async (state) => {
    this.logger.debug("Crawling Luma, Eventbrite, and Twitter Spaces for founder events");
    const result = await this.useBrowser.graph.invoke({
      session: state.session,
      query: `
        Search Luma, Eventbrite, and tech event directories for AI founder demo nights, VC pitch socials, and networking events.
        User Query: ${state.query}
      `,
      maxSteps: 4,
      stepNumber: 0,
    });

    return {
      scrapedData: result.dataFound || [],
      humanInterventionRequired: result.humanInterventionRequired || false,
      humanInterventionMessage: result.humanInterventionMessage || "",
    };
  };

  private humanInterventionCondition = (state: typeof this.stateSchema.State) => {
    if (state.humanInterventionRequired) {
      this.logger.debug("Human Intervention Required for event search browser action");
      return END;
    }
    return "rankInvestorEvents";
  };

  private rankInvestorEvents: GraphNode<typeof this.stateSchema> = async (state) => {
    this.logger.debug("Ranking event relevance and investor density");
    const structuredModel = this.model.withStructuredOutput(this.eventListSchema);
    const evaluation = await structuredModel.invoke(`
      You are Roman Cole, tech event and VC networking scout.
      Analyze the scraped event data and founder memories to select the top 3 high-density networking events.

      User Query:
      ${state.query}

      Founder Memories:
      ${JSON.stringify(state.memories)}

      Scraped Event Data:
      ${JSON.stringify(state.scrapedData)}
    `);

    return {
      topEvents: evaluation.topEvents || [],
    };
  };

  graph = new StateGraph(this.stateSchema)
    .addNode("searchEventPlatforms", this.searchEventPlatforms)
    .addNode("rankInvestorEvents", this.rankInvestorEvents)
    .addEdge(START, "searchEventPlatforms")
    .addConditionalEdges("searchEventPlatforms", this.humanInterventionCondition, [END, "rankInvestorEvents"])
    .addEdge("rankInvestorEvents", END)
    .compile();
}
