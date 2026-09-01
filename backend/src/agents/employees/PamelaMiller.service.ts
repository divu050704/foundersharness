import { Injectable, Logger } from "@nestjs/common";
import { StateGraph, StateSchema, START, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { GenerateSocialMediaCalendar } from "../graphs/pamela-miller/GenerateSocialMediaCalendar.service";
import z from "zod";
import { tool } from "@langchain/core/tools";
import { HindsightService } from "../../memory/hindsight.service";
import { MemoryService } from "../../memory/memory.service";
@Injectable()
export class PamelaMillerService {
    constructor(private readonly generateSocialMediaCalendar: GenerateSocialMediaCalendar,
        private readonly memory: MemoryService,
        private readonly logger: Logger
    ) { }

    private model = new ChatGoogleGenerativeAI({
        model: "gemini-3.5-flash-lite"
    })

    createCalendarTool = tool(async ({ query, session }) => {
        this.logger.debug("Extracting Knowledge")
        const memories = await this.memory.recall(session, query)
        this.logger.debug("Invoking Pamela Miller")

        return await this.generateSocialMediaCalendar.graph.invoke({ query, memories, session })
    }, {
        name: "create-calendar",
        description: "Create social media calendar based on the knowledge regarding user's company",
        schema: z.object({
            query: z.string().describe("Detailed description of what the user wants"),
            session: z.string().describe("session name, do not create this on your own it will always be in the query")
        })
    })

    modelWithTools = this.model.bindTools([this.createCalendarTool])



}