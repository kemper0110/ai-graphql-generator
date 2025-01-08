// export LANGCHAIN_TRACING_V2="true"
// export LANGCHAIN_API_KEY="..."
// export LANGCHAIN_CALLBACKS_BACKGROUND=true


import {ChatOllama} from "@langchain/ollama";
import {tools, validQueryResponse} from "./tools.js";
import {END, MessagesAnnotation, START, StateGraph} from "@langchain/langgraph";
import {ToolNode} from '@langchain/langgraph/prebuilt';
import {AIMessage} from "@langchain/core/messages";
import fs from "node:fs";

// const modelName = 'qwen2.5-coder:0.5b'
const modelName = 'llama3.2'
// const modelName = 'nemotron-mini'

const model = new ChatOllama({model: modelName, temperature: 0, maxRetries: 2})
    .bindTools(tools);
// const embeddings = new OllamaEmbeddings({model})
// const vectorStore = new MemoryVectorStore(embeddings);

const toolNode = new ToolNode(tools)

let call_id = 0;


function extractGraphqlQuery(content: string, sep: string = "\`\`\`graphql") {
    const graphqlStart = content.indexOf(sep)
    const graphqlEnd = content.indexOf("\`\`\`", graphqlStart + 1)
    if (graphqlStart !== -1 && graphqlEnd !== -1) {
        return content.substring(graphqlStart + sep.length + 1, graphqlEnd)
    }
    return null
}


const shouldContinueTools = (state: typeof MessagesAnnotation.State) => {
    const {messages} = state;
    const lastMessage = messages[messages.length - 1];
    if ("tool_calls" in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls?.length) {
        return "tools";
    }
    return "validation";
}


const initialInfo = async (state: typeof MessagesAnnotation.State) => {
    const {messages} = state;
    messages.push(new AIMessage({
        content: "",
        tool_calls: [
            {
                name: "get_root_types",
                args: {},
                id: "get_root_types|manual_node_call|" + call_id++,
                type: "tool_call",
            }
        ]
    }))
    messages.push(...(await toolNode.invoke({messages})).messages)
    messages.push(new AIMessage({
        content: "",
        tool_calls: [
            {
                name: "get_types",
                args: {},
                id: "get_types|manual_node_call|" + call_id++,
                type: "tool_call",
            }
        ]
    }))
    messages.push(...(await toolNode.invoke({messages})).messages)
    return {messages};
}

const callModel = async (state: typeof MessagesAnnotation.State) => {
    const {messages} = state;
    const response = await model.invoke(messages);
    return {messages: response};
}

const validation = async (state: typeof MessagesAnnotation.State) => {
    const {messages} = state;
    const res = messages[messages.length - 1].content as string;
    const query = extractGraphqlQuery(res)
    // const json = "\`\`\`json"
    const validationMessage = new AIMessage({
        content: "",
        tool_calls: [
            {
                name: "validate_query_by_schema",
                args: {query},
                id: "validate_query_by_schema|manual_node_call|" + call_id++,
                type: "tool_call",
            }
        ]
    })
    messages.push(validationMessage)
    const result = await toolNode.invoke({messages})
    messages.push(...result.messages)
    return {messages};
}

const validationCheck = async (state: typeof MessagesAnnotation.State) => {
    const {messages} = state;
    const res = messages[messages.length - 1].content as string;
    if (res === validQueryResponse)
        return END
    return "agent"
}

const workflow = new StateGraph(MessagesAnnotation)
    // Define the two nodes we will cycle between
    // .addNode("initialInfo", initialInfo)
    .addNode("agent", callModel)
    .addNode("tools", toolNode)
    .addNode("validation", validation)
    // .addEdge(START, "initialInfo")
    // .addEdge("initialInfo", "agent")
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinueTools, ["tools", "validation"])
    .addConditionalEdges("validation", validationCheck, ["agent", END])
    .addEdge("tools", "agent");

const app = workflow.compile()
const result = await app.invoke(
    {
        messages: [
            {
                role: "system",
                content: "You are GraphQL query writer." +
                    "You write GraphQL query based on user request." +
                    "You only write GraphQL queries, instead full code to run this query." +
                    "You must write valid GraphQL queries based on information from schema." +
                    "You must use tools to get information about schema and entities." +
                    "You can use tools as much as you want." +
                    "Firstly you must start with calling `get_root_types` tool to choose query type and calling `get_types` to get all types of the schema." +
                    "Then you can call `get_type` with root type name parameter to get root fields" +
                    // "You have info about names of types of schema" +
                    "You can call tool `get_type` with type name parameter to get fields" +
                    "Continue fetching type info and generating query as you long." +
                    "When you are ended with query generation you must call tool `validate_query_by_schema` to validate query." +
                    "Fix query based on returned errors." +
                    "When query is valid show it to user." +
                    "If you are not sure about type of the entity you can use `get_type` tool to get it."
                    // + "You must write GraphQL query step-by-step starting with simple working query and continue adding more fields to complete users request."
            },
            {
                role: "user",
                content: `Write Graphql query to get all clinics with name and verbose address. Also fetch clinics doctors with their private information. GraphQL schema provided. 
\`\`\`graphql
${fs.readFileSync("clean-schema.graphql", 'utf-8')}
\`\`\``
            },
        ],
    },
)

console.dir(result.messages[result.messages.length - 1].content)
