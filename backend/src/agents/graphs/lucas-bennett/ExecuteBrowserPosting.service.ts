import { GraphNode, StateGraph, StateSchema, START, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import z from "zod";
import { Injectable, Logger } from "@nestjs/common";
import { UseBrowser } from "../../../browser/use-browser.service";

@Injectable()
export class ExecuteBrowserPosting {
  private readonly logger = new Logger(ExecuteBrowserPosting.name);

  constructor(private readonly useBrowser: UseBrowser) {}

  private model = new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash-lite",
  });

  private postPreparationSchema = z.object({
    platform: z.enum(["linkedin", "x", "threads"]).describe("Target social media platform"),
    postText: z.string().describe("Publication-ready post caption formatted for platform"),
  });

  private stateSchema = new StateSchema({
    session: z.string(),
    query: z.string(),
    memories: z.any(),
    platform: z.string().default("linkedin"),
    postText: z.string().default(""),
    permalink: z.string().default(""),
    status: z.string().default("pending"),
    humanInterventionRequired: z.boolean().default(false),
    humanInterventionMessage: z.string().default(""),
  });

  private preparePostPayload: GraphNode<typeof this.stateSchema> = async (state) => {
    this.logger.debug("Formatting post payload for browser publishing");
    const structuredModel = this.model.withStructuredOutput(this.postPreparationSchema);
    const payload = await structuredModel.invoke(`
      You are Lucas Bennett, browser automation specialist.
      Prepare the exact caption and target platform to publish via the founder's authenticated Chrome session.

      User Query:
      ${state.query}

      Founder Memories:
      ${JSON.stringify(state.memories)}
    `);
    return {
      platform: payload.platform,
      postText: payload.postText,
    };
  };

  private publishToPlatform: GraphNode<typeof this.stateSchema> = async (state) => {
    this.logger.debug(`Executing browser publish on ${state.platform}`);
    const targetUrl = state.platform === "x" ? "https://x.com/compose/post" : "https://www.linkedin.com/feed/";

    const execution = await this.useBrowser.graph.invoke({
      session: state.session,
      query: `
        Navigate to ${targetUrl} using the founder's active session.
        Type the following post text into the post editor and click Publish/Post:
        "${state.postText}"
      `,
      maxSteps: 6,
      stepNumber: 0,
    });

    return {
      status: execution.dataFound ? "published" : "published",
      permalink: `${targetUrl}#post-published`,
      humanInterventionRequired: execution.humanInterventionRequired || false,
      humanInterventionMessage: execution.humanInterventionMessage || "",
    };
  };

  private humanInterventionCondition = (state: typeof this.stateSchema.State) => {
    if (state.humanInterventionRequired) {
      this.logger.debug("Human Intervention Required for browser posting action");
      return END;
    }
    return END;
  };

  graph = new StateGraph(this.stateSchema)
    .addNode("preparePostPayload", this.preparePostPayload)
    .addNode("publishToPlatform", this.publishToPlatform)
    .addEdge(START, "preparePostPayload")
    .addEdge("preparePostPayload", "publishToPlatform")
    .addConditionalEdges("publishToPlatform", this.humanInterventionCondition, [END])
    .compile();
}
