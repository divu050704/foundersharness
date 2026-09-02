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
        key: z.string("Property name which was scraped from the user's social media post, such as caption, text content, topic, date, or other relevant post metadata"),
        value: z.string("The actual value scraped for the corresponding property from the user's social media post")
    })

    private postTopicsOutput = z.object({
        topics: z.array(z.string().describe("A specific and distinct social media content topic that can be developed into a complete post. Topics should be relevant to the user's startup, audience, goals, and campaign while avoiding unnecessary repetition of previous posts"))
            .describe("A chronological list of social media content topics for the requested campaign duration. If the user does not specify a duration, generate topics for 7 days. Each topic should represent a different content angle and should be specific enough for a separate post to be generated from it")
    })

    private postGenerationOutput = z.object({
        textContent: z.string().describe("A complete, publication-ready social media post caption based on the assigned topic. The caption should have a strong hook, communicate one clear idea, provide value to the target audience, match the startup's tone and positioning, and include a natural call to action when appropriate"),
        imagePrompt: z.string().describe("A detailed natural-language prompt for an image-generation model to create the visual accompanying the social media post. Describe the main subject, composition, setting, objects, mood, lighting, visual style, color direction, brand context, and any important visual elements. The image should complement the post and feel like a professional marketing asset rather than a generic stock image"),
        hashtags: z.array(z.string().describe("A relevant hashtag directly related to the post topic, startup, industry, target audience, or content theme"))
            .describe("A curated list of relevant hashtags intended to improve discoverability and reach. Avoid irrelevant, overly broad, repetitive, or spam-like hashtags")
    })

    private stateSchema = new StateSchema({
        pastPostsData: z.array(this.dataArrayInterface).default(() => []),
        humanInterventionRequired: z.boolean().default(false),
        humanInterventionMessage: z.string().default(""),
        memories: z.any(),
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
        const posts = await this.useBrowser.graph.invoke({
            session: state.session,
            query: `
                Visit the user's social media profile and retrieve up to 5 of their most recent published posts.
                For each post, collect the available text or caption content. The purpose of retrieving these posts is to understand the user's existing content strategy, writing style, recurring themes, positioning, and topics that have already been covered.
                The retrieved posts will be used to create a new social media calendar, so accurately capture the actual published content and avoid inventing information that is not visible on the profile.
                IMPORTANT: The posts should be only of the user, figure out the account name from the context provided.
                User's request:
                ${state.query}
            `,
            maxSteps: 5,
            stepNumber: 0
        })
        return {
            pastPostsData: posts.dataFound,
            humanInterventionRequired: posts.humanInterventionRequired,
            humanInterventionMessage: posts.humanInterventionMessage
        }
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
            You are an experienced social media content strategist creating a content calendar for a startup.
            Determine the social media topics that should be covered during the campaign.
            User Query:
            ${state.query}
            Relevant Memories:
            ${JSON.stringify(state.memories)}
            Past Social Media Posts:
            ${JSON.stringify(state.pastPostsData)}
            Follow these requirements:
            1. Determine the campaign duration from the user's request. If the user explicitly specifies a number of days or another timeline, follow it exactly. If no timeline is specified, create topics for 7 days.
            2. Use the memories to understand the startup's product, audience, positioning, goals, tone of voice, important context, and previously established preferences.
            3. Analyze the past posts to identify topics, themes, messaging, and content angles that have already been used.
            4. Avoid creating topics that unnecessarily repeat previous posts. New topics should introduce a meaningful new perspective, idea, use case, story, educational angle, or discussion.
            5. Create a balanced content mix when appropriate. Consider educational content, product value, customer problems, industry insights, storytelling, credibility, engagement, behind-the-scenes content, and conversion-oriented content.
            6. Make every topic specific and actionable. Avoid vague topics such as "talk about the product", "startup tips", or "business content".
            7. Make the topics work together as a coherent campaign rather than producing seven unrelated ideas.
            8. Do not invent specific company facts, statistics, testimonials, achievements, customers, partnerships, or product capabilities unless they are supported by the provided memories or past posts.
            Return only the structured list of topics.
        `)
        return { topics: topics.topics }
    }

    private generatePosts: GraphNode<typeof this.stateSchema> = async (state) => {
        this.logger.debug("Generating posts")
        const structuredModel = this.model.withStructuredOutput(this.postGenerationOutput)
        const post = await structuredModel.invoke(`
            You are an expert social media copywriter and visual content strategist for startups.
            Generate one complete, publication-ready social media post for the assigned topic.
            Assigned Topic:
            "${state.topic}"
            User Query:
            ${state.query}
            Relevant Memories:
            ${JSON.stringify(state.memories)}
            Past Social Media Posts:
            ${JSON.stringify(state.pastPostsData)}
            Follow these requirements for the post:
            1. Write a complete social media caption that is ready to publish. Do not return an outline, notes, or explanation of how the post should be written.
            2. Start with a strong and relevant hook that captures the target audience's attention.
            3. Focus on one clear idea related to the assigned topic and develop it properly instead of combining unrelated ideas.
            4. Make the post useful, interesting, educational, relatable, or thought-provoking for the intended audience.
            5. Use the provided memories to match the startup's known positioning, product, audience, communication style, goals, and brand personality.
            6. Use the past posts to understand the existing writing style and content strategy, but do not simply repeat their wording, hooks, arguments, examples, or topics.
            7. Do not fabricate customer stories, testimonials, statistics, product capabilities, partnerships, funding information, business results, quotes, announcements, or other specific facts that are not supported by the provided context.
            8. Use natural social media formatting. Keep the writing concise enough to remain readable while providing enough substance to communicate the idea effectively.
            9. Include a call to action when it naturally fits the topic. Do not force a call to action into every post.
            10. Generate relevant hashtags based on the topic, startup, industry, target audience, and content theme. Avoid irrelevant or spam-like hashtags.
            For the image prompt:
            Create a detailed prompt for an image-generation model that visually complements the written post.
            Describe the primary subject, composition, setting, important objects, mood, lighting, visual style, color direction, brand context, and other important visual details needed to create a professional social media marketing image.
            The image should communicate the core idea of the post visually rather than simply displaying the post caption as text.
            Do not invent visual representations of product features or company information that are not supported by the provided context.
            Return only the structured output defined by the schema.
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