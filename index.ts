// export LANGCHAIN_TRACING_V2="true"
// export LANGCHAIN_API_KEY="..."
// export LANGCHAIN_CALLBACKS_BACKGROUND=true


// import "cheerio";
import {ChatOllama} from "@langchain/ollama";
import {tools, validQueryResponse} from "./tools.js";
import {END, MessagesAnnotation, START, StateGraph} from "@langchain/langgraph";
import {ToolNode} from '@langchain/langgraph/prebuilt';
import {AIMessage} from "@langchain/core/messages";

const modelName = 'llama3.2'
// const modelName = 'nemotron-mini'

const model = new ChatOllama({model: modelName, temperature: 0, maxRetries: 2})
    .bindTools(tools);
// const embeddings = new OllamaEmbeddings({model})
// const vectorStore = new MemoryVectorStore(embeddings);

const toolNode = new ToolNode(tools)


function extractGraphqlQuery(content: string) {
    const graphqlStart = content.indexOf("\`\`\`graphql")
    const graphqlEnd = content.indexOf("\`\`\`", graphqlStart + 1)
    if (graphqlStart !== -1 && graphqlEnd !== -1) {
        return content.substring(graphqlStart + "\`\`\`graphql".length + 1, graphqlEnd)
    }
    return null
}


const shouldContinueTools = (state: typeof MessagesAnnotation.State) => {
    const {messages} = state;
    const lastMessage = messages[messages.length - 1];
    if ("tool_calls" in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls?.length) {
        return "tools";
    }
    return "";
}

const callModel = async (state: typeof MessagesAnnotation.State) => {
    const {messages} = state;
    const response = await model.invoke(messages);
    return {messages: response};
}

let validationId = 0;

const validation = async (state: typeof MessagesAnnotation.State) => {
    const {messages} = state;
    const res = messages[messages.length - 1].content as string;
    const query = extractGraphqlQuery(res)
    const validationMessage = new AIMessage({
        content: "",
        tool_calls: [
            {
                name: "validate_query_by_schema",
                args: { query },
                id: "validate_query_by_schema|node_call|" + validationId++,
                type: "tool_call",
            }
        ]
    })
    messages.push(validationMessage)
    const result = await toolNode.invoke({messages})
    messages.push(result)
    return {messages};
}

const validationCheck = async (state: typeof MessagesAnnotation.State) => {
    const {messages} = state;
    const res = messages[messages.length - 1].content as string;
    if(res === validQueryResponse)
        return END
    return "agent"
}

const workflow = new StateGraph(MessagesAnnotation)
    // Define the two nodes we will cycle between
    .addNode("agent", callModel)
    .addNode("tools", toolNode)
    .addNode("validation", validation)
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
                content: "You are GraphQL query generator." +
                    "You will generate Graphql query based on user request." +
                    "You must generate valid GraphQL queries based on information from schema." +
                    "You must use tools to get information about schema and entities." +
                    "You can use tools as much as you want." +
                    "Firstly you must start with calling `get_root_types` tool to choose query type and calling `get_types` to get all types of the schema." +
                    "Then you can call `get_type` with root type name parameter to get root fields" +
                    "Continue fetching type info and generating query as you long." +
                    "When you are ended with query generation you must call `validate_query_by_schema` tool to validate query." +
                    "Fix query if it is not valid." +
                    "When query is valid show it to user." +
                    "If you are not sure about type of the entity you can use get_type tool to get it."
            },
            {
                role: "user",
                content: "Write Graphql query to get all clinics with name and verbose address. Also fetch clinics doctors with their private information."
            }
        ],
    },
)

console.dir(result.messages[result.messages.length - 1].content)
