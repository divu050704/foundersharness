import { GraphNode, StateGraph, StateSchema } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import z from "zod";
import { DeviceHookService } from "./device-hook.service";

const hookService = new DeviceHookService()

const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash"
})

const dataArrayInterface = z.object({
    key: z.string("Property name which was scraped"),
    value: z.string("Value which was scraped")
})

const stateSchema = new StateSchema({
    query: z.string().describe("user's query"),
    url: z.string().describe("URL to open"),
    acceessabilityTree: z.string("Extracted accessability tree"),
    linksOpened: z.array(z.string()),
    dataFound: z.array(dataArrayInterface).describe("Data found on earlier pages"),
    finish: z.boolean().describe("if all the data is recieved which the user asked, and the loop should end now"),
    session: z.string().describe("browser session name")
})

const navigateOutput = z.object({
    url: z.string().describe("URL to open")
})

const actionOutput = z.object({
    action: z.string().describe("Action to perform adhering:click(click an element), fill(add text to an input or textbox)").optional(),
    selector: z.string().describe("Selector chosen from the provided accessability tree. Compulsory for click and fill action").optional(),
    force: z.boolean().describe("If to use force when clicking. Compulsory with click action").optional(),
    text: z.string("Text to enter, compulsory with fill action").optional(),
    data: z.array(dataArrayInterface).describe("Data Scraped from the webpage that the user asked (if found)").optional(),
    finish: z.boolean().describe("if all the data is recieved which the user asked, and the loop should end now")
})

const navigationModel = model.withStructuredOutput(navigateOutput)
const actionModel = model.withStructuredOutput(actionOutput)

const navigationNode: GraphNode<typeof stateSchema> = async (state) => {
    await hookService.sendCommand("launch", {session: state.session})
    const prompt = `You are an agent which decides the starting point which the browser should open to do the work that the user wants for the query: ${state.query}`
    const {url} = await navigationModel.invoke(prompt)
    await hookService.sendCommand("navigate", {url, session: state.session})
    return {url}
}

const graph = new StateGraph(stateSchema)
.addNode("navigate", navigationNode)
.addEdge("__start__", "navigate")
.addEdge("navigate", "__end__")
.compile()

const output = graph.invoke({session: "leeglin", query: "Can you please find the bio for my insta profile"})
console.log(output)