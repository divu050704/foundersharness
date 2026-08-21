import "dotenv/config";
import { CreateOnboardingDto } from "../onboarding/dto/create-onboarding.dto";
import { Injectable, Logger } from '@nestjs/common';
// import { GeminiService } from '../onboarding/gemini.service';
// import { getAgentById } from './instances';
import { StateGraph, START, END, Annotation } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { LeanCanvasAgent, EntityExtractor } from "./instances";
import { LeanCanvasSchema } from "./schema";
import type { LeanCanvasOutput } from "./schema";
import { HumanMessage } from "@langchain/core/messages";
@Injectable()
export class AgentsService {
  private AgentState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
      reducer: (current, update) => current.concat(update),
      default: () => [],
    }),
  });
  private model = new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    model: "gemini-3.1-flash-lite"
  })
  async createCanvas(createOnboardingDto: CreateOnboardingDto) {
    const structuredModel = this.model.withStructuredOutput(LeanCanvasSchema)
    const prompt = LeanCanvasAgent.generatePrompt(createOnboardingDto)
    const callModel = async (state: typeof this.AgentState.State) => {
      const response = await structuredModel.invoke(state.messages);
      // response here is already parsed JSON matching LeanCanvasSchema,
      // not a BaseMessage — so we don't push it into `messages` the same way.
      return { messages: [new HumanMessage(JSON.stringify(response))] };
    };

    const graph = new StateGraph(this.AgentState)
      .addNode('agent', callModel)
      .addEdge(START, 'agent')
      .addEdge('agent', END);

    const app = graph.compile();

    const result = await app.invoke({
      messages: [new HumanMessage(prompt)],
    });

    const lastMessage = result.messages.at(-1);
    const parsed: LeanCanvasOutput = JSON.parse(lastMessage!.content as string);

    return parsed;
  }

  async createMemory(canvas: LeanCanvasOutput){
    const prompt = EntityExtractor.generatePrompt(canvas)
    return prompt
  }
}
