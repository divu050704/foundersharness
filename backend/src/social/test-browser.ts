import { ConditionalEdgeRouter, GraphNode, StateGraph, StateSchema, START, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import z from "zod";
import { DeviceHookService } from "./device-hook.service";
interface SnapshotElement {
    ref: string;
    tag: string;
    role: string;
    name: string;
    depth: number;      // nesting depth from C# walk
    parentRef?: string; // optional, if easy to include
}
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));


const hookService = new DeviceHookService()
// hookService.onModuleInit();
const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash-lite"
})

const dataArrayInterface = z.object({
    key: z.string("Property name which was scraped"),
    value: z.string("Value which was scraped")
})

const actionOutput = z.object({
    action: z.string().describe("navigate | click_ref | fill_ref | finish").optional(),
    url: z.string().optional(),
    ref: z.string().describe("The ref id (e.g. 'r4') from the snapshot — REQUIRED for click_ref/fill_ref. NEVER invent one.").optional(),
    text: z.string().optional(),
});

const dataExtractionOutput = z.object({
    data: z.array(dataArrayInterface).optional(),
    finish: z.boolean(),
})

const stateSchema = new StateSchema({
    query: z.string().describe("user's query"),
    url: z.string().describe("URL to open"),
    accessibilityTree: z.string().describe("Extracted accessibility tree"),
    linksOpened: z.array(z.string()),
    dataFound: z.array(dataArrayInterface).describe("Data found on earlier pages").default([]),
    finish: z.boolean().describe("if all the data is recieved which the user asked, and the loop should end now"),
    session: z.string().describe("browser session name"),
    allActions: z.array(actionOutput).describe("All the actions taken so far").default([]),
    stepNumber: z.number().describe("current step number"),
    maxSteps: z.number().describe("Maximum number of steps allowed")
})

const navigateOutput = z.object({
    url: z.string().describe("URL to open")
})



const navigationModel = model.withStructuredOutput(navigateOutput)
const actionModel = model.withStructuredOutput(actionOutput)

const navigationNode: GraphNode<typeof stateSchema> = async (state) => {

    await hookService.sendCommand("launch", { sessionName: state.session })
    await sleep(2500);
    const prompt = `You are an agent which decides the starting point which the browser should open to do the work that the user wants for the query: ${state.query}`
    const { url } = await navigationModel.invoke(prompt)
    console.log(`-> Navigating to ${url}`)
    await hookService.sendCommand("navigate", { url, sessionName: state.session })
    await sleep(2500);
    return { url }
}

const dataExtractionNode: GraphNode<typeof stateSchema> = async (state) => {
    const raw = await hookService.sendCommand("snapshot", { sessionName: state.session });
    await sleep(2500);
    // snapshot resolves directly with the JSON string of elements
    const payload = typeof raw === "string" ? raw : raw?.result;

    if (!payload) {
        throw new Error(`snapshot command returned no usable payload. Got: ${JSON.stringify(raw)}`);
    }

    const elements: SnapshotElement[] = JSON.parse(payload);
    const accessibilityTree = elements
        .map((e) => `${"  ".repeat(e.depth)}[${e.ref}] ${e.role} "${e.name}"`)
        .join("\n");
    console.log(`-> Tree Extracted`)
    const  prompt = `
    You are an agent to exctract data from the Accessibility tree of a webpage, and decide if the agent should loop or not depending on the fact that if all the information is collected or not.
    The data should be strictly that is asked by user in his query here: ${state.query}
    Already found data: ${state.dataFound}
    accessibility tree: ${accessibilityTree}
    ## DATA EXTRACTION RULES

    Extract only data relevant to the user's request.

    When data is visible in the accessibility tree:
    - Extract it immediately.
    - Preserve the actual values from the webpage.
    - Do not fabricate missing information.
    - Do not infer values unless they are explicitly supported by the page.
    - If multiple records are visible, return all relevant records.
    - If some requested fields are unavailable, leave them absent rather than inventing values.

    You may return data AND an action in the same response if useful data was found before another navigation action is required.

    ## FINISH RULES

    Set finish=true ONLY when:
    - All data requested by the user has been collected, OR
    - The webpage clearly cannot provide any more relevant data, OR
    - The requested task is complete and no further browser action is necessary.

    Set finish=false when:
    - More navigation is required.
    - More results need to be loaded.
    - A search/filter needs to be performed.
    - Pagination is available and relevant.
    - The requested information has not yet been completely collected.

    Do NOT finish merely because some data has been found.`
    const extractionModel = model.withStructuredOutput(dataExtractionOutput)
    const modelOutput = await extractionModel.invoke(prompt)
    const newDataFound = modelOutput.data?.length ? [...state.dataFound, ...modelOutput.data] : [...state.dataFound]

    return { accessibilityTree, dataFound: newDataFound, finish: modelOutput.finish };
};



const actionNode: GraphNode<typeof stateSchema> = async (state) => {
    console.log("-> Running Action")
    const prompt = `
    You are a browser automation agent. Your job is to navigate a webpage using ONLY the provided accessibility tree, perform the minimum necessary actions.

    ## USER REQUEST
    ${state.query}

    ## DATA COLLECTED SO FAR
    ${state.dataFound || "No data collected yet."}

    ## ACTIONS TAKEN SO FAR
    ${state.allActions || "No actions taken yet."}

    ## CURRENT ACCESSIBILITY TREE
    ${state.accessibilityTree}

    ## YOUR TASK

    Analyze the current accessibility tree and decide the NEXT best action.

    You have only two possible browser actions:

    1. click
    - Click an interactive element such as a button, link, checkbox, tab, dropdown, etc.
    - You MUST provide a selector that corresponds to an element in the provided accessibility tree.
    - You MUST NOT invent a selector.
    - force MUST be provided for click actions.

    2. fill
    - Enter text into an input or textbox.
    - You MUST provide a selector that corresponds to an input/textbox in the provided accessibility tree.
    - You MUST provide the text to enter.
    - Do NOT use fill on buttons, links, or non-input elements.

    If the requested data is already available in the current accessibility tree, DO NOT perform an unnecessary action. Extract the data instead.

    ## REF RULES
    - You may ONLY click or fill an element using its exact "ref" id shown in the CURRENT ACCESSIBILITY TREE (e.g. "r4").
    - Never invent a ref. Never write CSS or role= syntax. If the element you need isn't listed, you cannot act on it this turn.


    ## LOOP BEHAVIOR

    Think about the current webpage state and the user's goal.

    Prefer this sequence:

    1. Check whether the requested information is already visible.
    2. Extract any relevant information.
    3. Determine whether the requested information is complete.
    4. If incomplete, identify the single best next action.
    5. Return that action using an exact selector from the accessibility tree.
    6. If complete, set finish=true.

    Avoid:
    - Repeating an action that has already been performed unless necessary.
    - Clicking irrelevant elements.
    - Filling fields unnecessarily.
    - Navigating away from useful data.
    - Guessing selectors.
    - Returning multiple browser actions.
    - Fabricating data.

    ## IMPORTANT

    Your response MUST conform exactly to the provided structured output schema.

    The "action" field should contain ONLY:
    - "click"
    - "fill"
    - or be omitted when no action is required.

    For click:
    - action = "click"
    - selector = exact selector from accessibility tree
    - force = true or false

    For fill:
    - action = "fill"
    - selector = exact selector from accessibility tree
    - text = text to enter

    For data extraction:
    - data = array containing only data relevant to the user's request.

    For completion:
    - finish = true

    Otherwise:
    - finish = false


    ## TREE FORMAT
    Indentation reflects DOM nesting. An element indented under another is a
    descendant of it (contained inside it). Elements that sit at the same
    indentation level, near each other under a common ancestor, belong to
    the same logical group — e.g. a "card", "post", "row", or "item" — even
    though no element is explicitly labeled as such.

    When multiple sibling elements under one ancestor include: an account/user
    name, a block of free-flowing paragraph text, and metadata like a date,
    like count, or tags — treat all of them as belonging to ONE record/item,
    not separate unrelated pieces of data.

    ## LONG-TEXT CONTENT RULE
    Within a grouped block (see TREE FORMAT above), look for an element whose
    text is multi-line / multi-sentence and much longer than nearby elements
    (which are typically short labels like "Like", "Comment", button names,
    or single words). That long text is the primary content of that item
    (e.g. a caption, description, review body, or post text) — extract it
    in FULL, exactly as shown, do not truncate or summarize it.

    Do NOT re-extract the same content twice if it appears in more than one
    element (e.g. once as a short "name" on a wrapping element, and again in
    full on an inner element) — always prefer the LONGEST version you see for
    that piece of content, and only emit it once as one data entry.

    Never return explanations, reasoning, markdown, or prose outside the structured response.

    `;
    const modelOutput = await actionModel.invoke(prompt)
    const action = modelOutput.action
    if (action === "click_ref" && modelOutput.ref) {
        await hookService.sendCommand("click_ref", { ref: modelOutput.ref, sessionName: state.session });
        await sleep(2500);
    } else if (action === "fill_ref" && modelOutput.ref && modelOutput.text) {
        await hookService.sendCommand("fill_ref", { ref: modelOutput.ref, text: modelOutput.text, sessionName: state.session });
        await sleep(2500);
    }
    const newActions = [...state.allActions, modelOutput]

    return {
        allActions: newActions,
        stepNumber: state.stepNumber + 1   // <-- was missing
    }
}

const conditionalEdge: ConditionalEdgeRouter<{
    InputSchema: typeof stateSchema,
    Nodes:
        | "action"
        | "__end__"
}> = async (state) => {

    console.log(
        `-> Deciding loop: finish=${state.finish}, step=${state.stepNumber}`
    );

    if (
        state.finish ||
        state.stepNumber >= state.maxSteps
    ) {
        return "__end__";
    }

    return "action";
};

const graph = new StateGraph(stateSchema)
    .addNode("navigate", navigationNode)
    .addNode("extract", dataExtractionNode)
    .addNode("action", actionNode)

    // START
    .addEdge(START, "navigate")

    // Navigation → Extraction
    .addEdge("navigate", "extract")

    // Extraction → Conditional decision
    .addConditionalEdges(
        "extract",
        conditionalEdge
    )

    // Action → Extraction
    .addEdge("action", "extract")

    .compile();

// const output = await graph.invoke({ session: "leeglin", query: "Send hello to dhruv rana from my instagram account", maxSteps: 5, stepNumber: 0 })
// console.log(output.dataFound)