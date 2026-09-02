import { ConditionalEdgeRouter, GraphNode, StateGraph, StateSchema, START, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import z from "zod";
import { Injectable, Logger } from "@nestjs/common";
import { DeviceHookService } from "./device-hook.service";

@Injectable()
export class UseBrowser {
    
    constructor(private readonly hookService: DeviceHookService, private readonly logger: Logger) {}

    private sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    private model = new ChatGoogleGenerativeAI({
        model: "gemini-3.5-flash-lite"
    })

    private dataArrayInterface = z.object({
        key: z.string("Property name which was scraped"),
        value: z.string("Value which was scraped")
    })

    private AGENT_ACTIONS = [
        "navigate",
        "click_ref",
        "fill_ref",
        "select_ref",
        "check_ref",
        "uncheck_ref",
        "hover_ref",
        "dialog_accept",
        "dialog_dismiss",
        "finish",
    ];

    private actionOutput = z.object({
        action: z.enum(this.AGENT_ACTIONS).describe(
            "The single next action to take. Use 'finish' when no more browser " +
            "action is needed this turn (e.g. you're only extracting data, or the task is done)."
        ).optional(),

        // navigate
        url: z.string().describe("Destination URL. REQUIRED for 'navigate'.").optional(),

        // click_ref / fill_ref / select_ref / check_ref / uncheck_ref / hover_ref
        ref: z.string().describe(
            "The exact ref id (e.g. 'r4') copied verbatim from the CURRENT accessibility tree. " +
            "REQUIRED for click_ref, fill_ref, select_ref, check_ref, uncheck_ref, hover_ref. " +
            "NEVER invent one — if the element you need isn't in the tree, you cannot act on it this turn."
        ).optional(),

        // fill_ref
        text: z.string().describe("Text to type. REQUIRED for 'fill_ref'.").optional(),

        // select_ref
        value: z.string().describe("Option value/label to select. REQUIRED for 'select_ref'.").optional(),

        // dialog_accept (optional prompt text for JS prompt() dialogs)
        promptText: z.string().describe("Optional text to enter when accepting a JS prompt() dialog.").optional(),
        humanInterventionRequired: z.boolean().describe("The agent won't be able to work without an intervention as the model doesn't have the capability to do what the page requires").optional().default(false),
        humanInterventionMessage: z.string().describe("What intervention is required from the human to complete the task").optional().default("")

    });

    private dataExtractionOutput = z.object({
        data: z.array(this.dataArrayInterface).optional(),
        finish: z.boolean(),
        waitRequired: z.boolean().describe(
            "True if the page is still loading, streaming, or generating content " +
            "and the extraction would be based on incomplete/partial data if done now."
        ).optional().default(false),
        waitReason: z.string().describe("Why the wait is necessary").optional().default(""),
        waitTiming: z.number().describe(
            "Milliseconds to wait before re-checking the page. Use a sensible estimate " +
            "(e.g. 3000-8000 for streaming text, more for image/video generation)."
        ).optional().default(0),
    })

    private stateSchema = new StateSchema({
        query: z.string().describe("user's query"),
        url: z.string().describe("URL to open"),
        accessibilityTree: z.string().describe("Extracted accessibility tree"),
        linksOpened: z.array(z.string()),
        dataFound: z.array(this.dataArrayInterface).describe("Data found on earlier pages").default([]),
        finish: z.boolean().describe("if all the data is recieved which the user asked, and the loop should end now"),
        session: z.string().describe("browser session name"),
        allActions: z.array(this.actionOutput).describe("All the actions taken so far").default([]),
        stepNumber: z.number().describe("current step number"),
        maxSteps: z.number().describe("Maximum number of steps allowed"),
        humanInterventionRequired: z.boolean().describe("The agent won't be able to work without an intervention as the model doesn't have the capability to do what the page requires"),
        humanInterventionMessage: z.string().describe("What intervention is required from the human to complete the task")
    })

    private navigateOutput = z.object({
        url: z.string().describe("URL to open")
    })



    private navigationModel = this.model.withStructuredOutput(this.navigateOutput)
    private actionModel = this.model.withStructuredOutput(this.actionOutput)

    private navigationNode: GraphNode<typeof this.stateSchema> = async (state) => {

        await this.hookService.sendCommand("launch", { sessionName: state.session })
        await this.sleep(500);
        const prompt = `You are an agent which decides the starting point which the browser should open to do the work that the user wants for the query: ${state.query}`
        const { url } = await this.navigationModel.invoke(prompt)
        console.log(`-> Navigating to ${url}`)
        await this.hookService.sendCommand("navigate", { url, sessionName: state.session })
        await this.sleep(500);
        return { url }
    }

    private dataExtractionNode: GraphNode<typeof this.stateSchema> = async (state) => {
        const extractionModel = this.model.withStructuredOutput(this.dataExtractionOutput);
        let newDataFound = [...state.dataFound];
        let accessibilityTree = "";

        while (true) {
            let payload = "";
            let retries = 0;

            while (retries < 5) {
                try {
                    const raw = await this.hookService.sendCommand("snapshot", { sessionName: state.session });
                    await this.sleep(1000);
                    const extracted = typeof raw === "string" ? raw : raw?.result || raw?.message;
                    if (extracted && typeof extracted === "string" && extracted.trim().length > 0) {
                        payload = extracted;
                        break;
                    }
                } catch (err: any) {
                    this.logger.warn(`Snapshot command failed on attempt ${retries + 1}/5: ${err.message}`);
                }
                retries++;
                this.logger.warn(`Snapshot returned empty payload on attempt ${retries}/5. Retrying after 1.5s...`);
                await this.sleep(1500);
            }

            if (!payload || payload.trim().length === 0) {
                this.logger.warn(`Snapshot command returned no usable payload after 5 attempts. Defaulting to empty fallback tree.`);
                accessibilityTree = "Page accessibility tree is loading or empty.";
            } else {
                accessibilityTree = payload;
            }

            console.log(`-> Tree Extracted`);

            const prompt = `
        You are an agent to extract data from the Accessibility tree of a webpage, and decide if the agent should loop or not depending on the fact that if all the information is collected or not.
        The data should be strictly that is asked by user in his query here: ${state.query}
        Already found data: ${JSON.stringify(newDataFound)}
        Actions taken so far on this page (use this to understand what state the page is in, e.g. was a button just clicked that triggers generation/loading?): ${JSON.stringify(state.allActions)}
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

        Do NOT finish merely because some data has been found.

        ## WAIT RULES

        Look at the recent actions taken on this page and the current tree together.
        If the page is mid-generation, mid-stream, or mid-load — e.g. a message is
        still being typed out token by token, a spinner/loading indicator is present,
        an image/video is still generating, or content looks visibly truncated/partial
        right after an action that would trigger such a process — set waitRequired=true,
        explain what you're waiting for in waitReason, and estimate waitTiming in ms.

        Do NOT extract partial/streaming content as if it were final when a wait is
        warranted — set finish=false and waitRequired=true instead, and leave the
        incomplete data out (or only include the parts that are clearly stable/final).

        Only set waitRequired=true if there's a real signal something is still in
        progress. Do not wait speculatively on a fully settled, static page.`;

            const modelOutput = await extractionModel.invoke(prompt);

            if (modelOutput.data?.length) {
                newDataFound = [...newDataFound, ...modelOutput.data];
            }

            if (modelOutput.waitRequired) {
                const waitMs = modelOutput.waitTiming ?? 0 > 0 ? modelOutput.waitTiming : 10000;
                console.log(`-> Waiting ${waitMs}ms: ${modelOutput.waitReason}`);
                await this.sleep(waitMs ?? 1000);
                continue; // loop back to extraction: re-snapshot + re-ask
            }

            return { accessibilityTree, dataFound: newDataFound, finish: modelOutput.finish };
        }
    };



    private actionNode: GraphNode<typeof this.stateSchema> = async (state) => {
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

    You have exactly these possible actions — use the "action" field to pick ONE:

    - "click_ref"
        - Click an interactive element such as a button, link, tab, or dropdown trigger.
        - Set "ref" to the exact ref id from the CURRENT accessibility tree (e.g. "r4").

    - "fill_ref"
        - Enter text into an input or textbox.
        - Set "ref" to the exact ref id of the input/textbox.
        - Set "text" to the value to enter.
        - Do NOT use fill_ref on buttons, links, or non-input elements.

    - "select_ref"
        - Choose an option in a <select> dropdown.
        - Set "ref" to the dropdown's ref id, and "value" to the option to select.

    - "check_ref" / "uncheck_ref"
        - Check or uncheck a checkbox or radio button.
        - Set "ref" to its ref id.

    - "hover_ref"
        - Hover over an element (e.g. to reveal a hidden menu or tooltip).
        - Set "ref" to its ref id.

    - "dialog_accept" / "dialog_dismiss"
        - Accept or dismiss a native browser dialog (confirm/alert/prompt) if one is blocking the page.
        - For dialog_accept on a text-prompt dialog, optionally set "promptText".

    - "navigate"
        - Go directly to a known URL. Set "url".
        - Prefer clicking a link (click_ref) over navigating directly when a suitable link exists in the tree.

    - "finish"
        - Use this when no browser action is needed this turn — e.g. you are only extracting
          visible data, or the task is fully complete.

    If the requested data is already available in the current accessibility tree, DO NOT perform an unnecessary action — return action="finish" and let data extraction happen separately.

    ## REF RULES
    - You may ONLY act on an element using its exact "ref" id shown in the CURRENT ACCESSIBILITY TREE (e.g. "r4").
    - Never invent a ref. Never write CSS selectors or role= syntax — refs are the only valid way to target an element.
    - If the element you need isn't listed in the tree, you cannot act on it this turn.

    ## LOOP BEHAVIOR

    Think about the current webpage state and the user's goal.

    Prefer this sequence:

    1. Check whether the requested information is already visible.
    2. Determine whether the requested information is complete.
    3. If incomplete, identify the single best next action from the list above.
    4. Return that action with its required fields, using an exact ref from the accessibility tree.
    5. If no action is needed this turn, return action="finish".

    Avoid:
    - Repeating an action that has already been performed unless necessary.
    - Clicking irrelevant elements.
    - Filling fields unnecessarily.
    - Navigating away from useful data.
    - Guessing refs.
    - Returning multiple browser actions in one response.
    - Fabricating data.

    ## IMPORTANT

    Your response MUST conform exactly to the provided structured output schema.
    The "action" field must be exactly one of: navigate, click_ref, fill_ref, select_ref,
    check_ref, uncheck_ref, hover_ref, dialog_accept, dialog_dismiss, finish.
    Only include the fields that are actually required for the chosen action; omit the rest.

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

    ## HUMAN INTERVENTION CHECK
    If you require a human to intervene or take an action to continue the task, and taking any action is difficult make the humanInterventionRequired as true and humanInterventionMessage to tell the user what exact action to take

    `;
        const modelOutput = await this.actionModel.invoke(prompt)
        const action = modelOutput.action

        // Every branch here maps 1:1 to a case in ProcessCliCommandAsync (MainWindow.cs).
        // Keep this switch and that C# switch in sync when either changes.
        switch (action) {
            case "navigate":
                if (modelOutput.url) {
                    await this.hookService.sendCommand("navigate", { url: modelOutput.url, sessionName: state.session });
                    await this.sleep(500);
                }
                break;
            case "click_ref":
                if (modelOutput.ref) {
                    await this.hookService.sendCommand("click_ref", { ref: modelOutput.ref, sessionName: state.session });
                    await this.sleep(500);
                }
                break;
            case "fill_ref":
                if (modelOutput.ref && modelOutput.text) {
                    await this.hookService.sendCommand("fill_ref", { ref: modelOutput.ref, text: modelOutput.text, sessionName: state.session });
                    await this.sleep(500);
                }
                break;
            case "select_ref":
                if (modelOutput.ref && modelOutput.value) {
                    await this.hookService.sendCommand("select_ref", { ref: modelOutput.ref, value: modelOutput.value, sessionName: state.session });
                    await this.sleep(500);
                }
                break;
            case "check_ref":
            case "uncheck_ref":
                if (modelOutput.ref) {
                    await this.hookService.sendCommand(action, { ref: modelOutput.ref, sessionName: state.session });
                    await this.sleep(500);
                }
                break;
            case "hover_ref":
                if (modelOutput.ref) {
                    await this.hookService.sendCommand("hover_ref", { ref: modelOutput.ref, sessionName: state.session });
                    await this.sleep(500);
                }
                break;
            case "dialog_accept":
                await this.hookService.sendCommand("dialog_accept", { promptText: modelOutput.promptText, sessionName: state.session });
                await this.sleep(500);
                break;
            case "dialog_dismiss":
                await this.hookService.sendCommand("dialog_dismiss", { sessionName: state.session });
                await this.sleep(500);
                break;
            case "finish":
            case undefined:
                // No browser action required this turn.
                break;
        }

        const newActions = [...state.allActions, modelOutput]

        return {
            allActions: newActions,
            stepNumber: state.stepNumber + 1,
            humanInterventionRequired: modelOutput.humanInterventionRequired ?? false,
            humanInterventionMessage: modelOutput.humanInterventionMessage ?? "",
            finish: action === "finish" ? true : state.finish
        }
    }

    private conditionalContinueEdge: ConditionalEdgeRouter<{
        InputSchema: typeof this.stateSchema,
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

    private conditionalAfterActionEdge: ConditionalEdgeRouter<{
        InputSchema: typeof this.stateSchema,
        Nodes:
        | "extract"
        | "__end__"
    }> = async (state) => {

        console.log(
            `-> After action: ` +
            `finish=${state.finish}, ` +
            `humanIntervention=${state.humanInterventionRequired}`
        );

        if (state.finish || state.humanInterventionRequired) {
            return "__end__";
        }

        return "extract";
    };

    graph = new StateGraph(this.stateSchema)
        .addNode("navigate", this.navigationNode)
        .addNode("extract", this.dataExtractionNode)
        .addNode("action", this.actionNode)

        // START
        .addEdge(START, "navigate")

        // Navigation → Extraction
        .addEdge("navigate", "extract")

        // Extraction → Conditional decision
        .addConditionalEdges(
            "extract",
            this.conditionalContinueEdge
        )
        .addConditionalEdges("action", this.conditionalAfterActionEdge)
        .compile();

}

// private output = await graph.invoke({ session: "leeglin", query: "Create and download my avatar from chatGPT", maxSteps: 20, stepNumber: 0 })
// console.log(output)