import { GraphNode, StateGraph, StateSchema, START, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import z from "zod";
import { Injectable, Logger } from "@nestjs/common";
import { UseBrowser } from "../../../browser/use-browser.service";

@Injectable()
export class OptimizeFounderCalendar {
  private readonly logger = new Logger(OptimizeFounderCalendar.name);

  constructor(private readonly useBrowser: UseBrowser) {}

  private model = new ChatGoogleGenerativeAI({
    model: "gemini-3.1-flash-lite",
  });

  private timeblockSchema = z.object({
    start: z.string().describe("Start time (e.g. 09:00 AM)"),
    end: z.string().describe("End time (e.g. 01:00 PM)"),
    focusArea: z.string().describe("Title of focus block or task"),
    type: z.enum(["deep-work", "review", "break", "essential-call"]),
  });

  private calendarOutputSchema = z.object({
    declinedMeetings: z.array(z.string()).describe("Low-priority sales or distraction invites flagged for auto-decline"),
    timeblocks: z.array(this.timeblockSchema).describe("Timeblocked schedule enforcing 4-hour deep work"),
    summary: z.string().describe("Executive rationale for the focus time schedule"),
  });

  private stateSchema = new StateSchema({
    session: z.string(),
    query: z.string(),
    memories: z.any(),
    scrapedCalendarData: z.array(z.object({ key: z.string(), value: z.string() })).default(() => []),
    humanInterventionRequired: z.boolean().default(false),
    humanInterventionMessage: z.string().default(""),
    declinedMeetings: z.array(z.string()).default(() => []),
    timeblocks: z.array(this.timeblockSchema).default(() => []),
    summary: z.string().default(""),
  });

  private inspectCalendarSchedule: GraphNode<typeof this.stateSchema> = async (state) => {
    this.logger.debug("Checking memory context and retrieving calendar invites via browser sandbox");

    const browserResult = await this.useBrowser.graph.invoke({
      session: state.session,
      query: `
        Visit the user's Google Calendar / web calendar dashboard and retrieve pending meeting invites, upcoming commitments, and schedule bottlenecks.
        User Query:
        ${state.query}
      `,
      maxSteps: 5,
      stepNumber: 0,
    });

    return {
      scrapedCalendarData: browserResult.dataFound || [],
      humanInterventionRequired: browserResult.humanInterventionRequired || false,
      humanInterventionMessage: browserResult.humanInterventionMessage || "",
    };
  };

  private humanInterventionCondition = (state: typeof this.stateSchema.State) => {
    if (state.humanInterventionRequired) {
      this.logger.debug("Human Intervention Required for calendar browser action");
      return END;
    }
    return "optimizeCalendar";
  };

  private optimizeCalendar: GraphNode<typeof this.stateSchema> = async (state) => {
    this.logger.debug("Structuring 4-hour deep work focus blocks and filtering distractions");
    const structuredModel = this.model.withStructuredOutput(this.calendarOutputSchema);
    const result = await structuredModel.invoke(`
      You are Samuel Cross, Founder Day Planner & Focus Time Manager.
      Structure the founder's daily calendar with strict focus guardrails.

      User Query:
      ${state.query}

      Recalled Memories:
      ${JSON.stringify(state.memories)}

      Scraped Calendar Data:
      ${JSON.stringify(state.scrapedCalendarData)}

      Rules:
      1. Protect at least one 4-hour uninterrupted deep work focus block (e.g., 9:00 AM - 1:00 PM).
      2. Flag low-priority sales pitches and unsolicited meeting invites for auto-decline.
      3. Keep scheduling practical, realistic, and focused on founder priorities.
    `);

    return {
      declinedMeetings: result.declinedMeetings || [],
      timeblocks: result.timeblocks || [],
      summary: result.summary || "",
    };
  };

  graph = new StateGraph(this.stateSchema)
    .addNode("inspectCalendarSchedule", this.inspectCalendarSchedule)
    .addNode("optimizeCalendar", this.optimizeCalendar)
    .addEdge(START, "inspectCalendarSchedule")
    .addConditionalEdges("inspectCalendarSchedule", this.humanInterventionCondition, [END, "optimizeCalendar"])
    .addEdge("optimizeCalendar", END)
    .compile();
}
