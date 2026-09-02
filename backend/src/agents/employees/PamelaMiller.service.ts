import { Injectable, Logger } from "@nestjs/common";
import { StateGraph, StateSchema, START, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { GenerateSocialMediaCalendar } from "../graphs/pamela-miller/GenerateSocialMediaCalendar.service";
import z from "zod";
import { tool } from "@langchain/core/tools";
import { HindsightService } from "../../memory/hindsight.service";
import { AGENT_PERSONALITIES } from "../agent-personalities";
import { MemoryService } from "../../memory/memory.service";
import { EmailAgentDTO } from "../dto/create-email-agent.dto";


@Injectable()
export class PamelaMillerService {
    constructor(private readonly generateSocialMediaCalendar: GenerateSocialMediaCalendar,
        private readonly memory: MemoryService,
        private readonly logger: Logger
    ) { }

    private model = new ChatGoogleGenerativeAI({
        model: "gemini-3.5-flash-lite"
    })

    createCalendarTool = tool(
        async ({ query, session }) => {
            this.logger.debug("Extracting Knowledge");

            const memories = await this.memory.recall(session, query);

            this.logger.debug("Invoking Pamela Miller");

            return await this.generateSocialMediaCalendar.graph.invoke({
                query,
                memories,
                session
            });
        },
        {
            name: "create-calendar",
            description: `
                Create a social media calendar ONLY when the user explicitly asks you to
                create, generate, plan, build, or prepare a social media content calendar.

                The user must have a clear actionable request for a social media calendar
                or a set of scheduled social media posts.

                DO NOT call this tool for:
                - Casual conversation
                - Questions about Pamela
                - Questions about what Pamela can do
                - General social media questions
                - Requests for advice or explanations
                - Small talk
                - Acknowledgements such as "Thanks", "Okay", or "Great"
                - Requests that do not explicitly require creating a social media calendar

                When in doubt, DO NOT call the tool.
                `,
            schema: z.object({
                query: z.string().describe(
                    "The user's explicit request to create a social media calendar"
                ),
                session: z.string().describe(
                    "The existing session name provided by the application"
                )
            })
        }
    );

    modelWithTools = this.model.bindTools([this.createCalendarTool])
    async runModel(email: EmailAgentDTO, sender: string, previousContext?: string) {
        const personality = AGENT_PERSONALITIES["pamela-miller"];

        const prompt = `
            You are Pamela Miller, an AI social media strategist.

            PERSONALITY:
            ${personality.personalitySummary}

            CAPABILITIES:
            ${personality.capabilities?.join("\n") ?? ""}

            PAST CONVERSATION IN THIS THREAD:
            ${previousContext ? previousContext : "None"}

            USER REQUEST:
            ${email.content}

            SESSION NAME:
            ${sender}

            Decide whether one of your available tools is required to fulfill the user's request.
            If a tool is appropriate, use it.
            If the request is conversational, informational, or does not require a tool, respond without using a tool.
            `;

        const result = await this.modelWithTools.invoke(prompt);

        let toolResult: any = undefined;

        for (const call of result.tool_calls ?? []) {
            if (call.name === "create-calendar") {
                toolResult = await this.createCalendarTool.invoke(call);
                await this.memory.save(sender, {
                    type: 'social-media-calendar',
                    content: toolResult.posts,
                    summary: `Posts calendar created based on user's query: ${toolResult.query}`,
                    producedBy: 'pamela-miler'
                })
                this.logger.log("Saved the calendar")
            }
        }

        let finalPrompt: string;

        if (toolResult) {
            finalPrompt = `
            You are Pamela Miller, an AI social media strategist.

            Write an email reply to the user based on the work that was actually completed.

            PAST CONVERSATION IN THIS THREAD:
            ${previousContext ? previousContext : "None"}

            USER'S ORIGINAL REQUEST:
            ${email.content}

            AGENT WORK RESULT:
            ${JSON.stringify(toolResult, null, 2)}

            PERSONALITY:
            ${personality.personalitySummary}

            INSTRUCTIONS:
            1. Clearly explain what work was actually completed.
            2. Mention concrete results from the agent work, such as what was created, number of posts, platforms, dates, topics, or other relevant details when available.
            3. Do not simply say "I've completed it" or "the task is done".
            4. Base the response only on the AGENT WORK RESULT. Never invent details.
            5. If the result indicates that something could not be completed, clearly explain that.
            6. Briefly mention the most relevant next thing you can help with based on your capabilities.
            7. Do not mention tools, agents, prompts, memories, or internal implementation details.

            FORMAT:
            Write a natural, concise email body.
            Do not include a subject.
            Do not use markdown.
            Do not use bullet points.
            `;
                    } else {
                        finalPrompt = `
                            You are Pamela Miller, an AI social media strategist.

                            Write a natural email reply to the user's request.

                            PAST CONVERSATION IN THIS THREAD:
                            ${previousContext ? previousContext : "None"}

                            USER'S REQUEST:
                            ${email.content}

                            YOUR PERSONALITY:
                            ${personality.personalitySummary}

                            YOUR CAPABILITIES:
                            ${personality.capabilities?.join("\n") ?? ""}

                            IMPORTANT:
                            No tool was used for this request.

                            Your response should:
                            1. Directly respond to the user's request if it can be answered conversationally.
                            2. If the request is asking for something outside your capabilities, politely explain what you can help with instead.
                            3. Use your capabilities to naturally explain relevant things you can help the user with.
                            4. Do not pretend that any work was performed.
                            5. Do not say that you created, analyzed, researched, or completed something unless that actually happened.
                            6. Do not mention tools, agents, prompts, memories, or internal implementation details.
                            7. Do not list every capability unless relevant to the user's request.
                            8. Keep the response concise and helpful.

                            FORMAT:
                            Write a natural email body.
                            Do not include a subject.
                            Do not use markdown.
                            Do not use bullet points.
                            `;
        }

        const response = await this.model.invoke(finalPrompt);

        return response.content;
    }


}