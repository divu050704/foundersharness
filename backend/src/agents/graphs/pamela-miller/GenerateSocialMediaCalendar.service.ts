import { GraphNode, StateGraph, StateSchema, ReducedValue, Send, START, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import z from "zod";
import { HindsightRecallResponseSchema } from "../../../memory/hindsight.interface";
import { Injectable, Logger } from "@nestjs/common"
import { UseBrowser } from "../../../browser/use-browser.service";

@Injectable()
export class GenerateSocialMediaCalendar {
    constructor(private readonly useBrowser: UseBrowser,
        private readonly logger: Logger
    ) { }

    private model = new ChatGoogleGenerativeAI({
        model: "gemini-3.5-flash-lite"
    })

    private dataArrayInterface = z.object({
        key: z.string("Property name which was scraped"),
        value: z.string("Value which was scraped")
    })

    private postTopicsOutput = z.object({
        topics: z.array(z.string())
    })

    private postGenerationOutput = z.object({
        textContent: z.string().describe("Text content to post with the image"),
        imagePrompt: z.string().describe("Detailed json prompt which can be used to create social media post image"),
        hashtags: z.array(z.string()).describe("Hashtags to use for better results")
    })


    private stateSchema = new StateSchema({
        pastPostsData: z.array(this.dataArrayInterface).default(() => []),
        humanInterventionRequired: z.boolean().default(false),
        humanInterventionMessage: z.string().default(""),
        memories: HindsightRecallResponseSchema,
        posts: new ReducedValue(
            z.array(this.postGenerationOutput).default(() => []),
            { reducer: (curr, upd) => curr.concat(upd) }
        ),
        topics: z.array(z.string()).default(() => []),
        topic: z.string().default(""), // single topic dispatched to each worker
        session: z.string(),
        query: z.string(),
    })

    private retrievePastPosts: GraphNode<typeof this.stateSchema> = async (state) => {
        this.logger.debug("Retreiving posts")
        const posts = await this.useBrowser.graph.invoke({ session: state.session, query: `Scrape 3 past posts from the user's profile and collect text content of the post to satisy user's query: ${state.query}`, maxSteps: 5, stepNumber: 0 })
        return { pastPostsData: posts.dataFound, humanInterventionRequired: posts.humanInterventionRequired, humanInterventionMessage: posts.humanInterventionMessage }
    }

    private humanInterventionCondition = (state: typeof this.stateSchema.State) => {
        if (state.humanInterventionRequired) {
            this.logger.debug("Human Intervention Required")
            return END
        }
        return "createTopics"
        
    }

    private createTopics: GraphNode<typeof this.stateSchema> = async (state) => {
        this.logger.debug("Creating topics")
        const structuredModel = this.model.withStructuredOutput(this.postTopicsOutput)
        const topics = await structuredModel.invoke(`
            Create topics for 7-days if the user has not explicility asked the timeline for a social media campaign for a startup based on:
            Memories: ${state.memories}
            User Query: ${state.query}
            Past posts: ${state.pastPostsData}
            `)
        return { topics: topics.topics }
    }

    private generatePosts: GraphNode<typeof this.stateSchema> = async (state) => {
        this.logger.debug("Generating posts")
        const structuredModel = this.model.withStructuredOutput(this.postGenerationOutput)
        const post = await structuredModel.invoke(`
            Generate a social media post for the topic: "${state.topic}"
            Memories: ${state.memories}
            Past posts: ${state.pastPostsData}
            `)
        return { posts: [post] }
    }
    private routeToPostCreation = (state: typeof this.stateSchema.State) => {
        return state.topics.map(
            (topic) => new Send("generatePosts", { ...state, topic })
        )
    }
    graph = new StateGraph(this.stateSchema)
    .addNode("retrievePastPosts", this.retrievePastPosts)
    .addNode("createTopics", this.createTopics)
    .addNode("generatePosts", this.generatePosts)
    .addEdge(START, "retrievePastPosts")
    .addConditionalEdges("retrievePastPosts", this.humanInterventionCondition, [END, "createTopics"])
    .addConditionalEdges("createTopics", this.routeToPostCreation, ["generatePosts"])
    .addEdge("generatePosts", END)
    .compile()
}