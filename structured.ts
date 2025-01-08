import {ChatOllama} from "@langchain/ollama";
import {z} from "zod";
import {getFields} from "./schema-utils.js";

// const modelName = 'qwen2.5-coder:0.5b'
const modelName = 'llama3.2'

// const r = getFields("_Query")

const model = new ChatOllama({model: modelName, temperature: 0, maxRetries: 2})

// Also fetch clinics doctors with their private information.
const userPrompt = `Write Graphql query to get all clinics with name and verbose address.`.trim()


const rootTypeResponse = await model.withStructuredOutput(z.object({
    rootType: z.enum([
        "_Query",
        "_Mutation",
        "_Subscription",
    ]).describe("The root type of the query"),
}), {
    name: "root_type",
    includeRaw: true,
    // method: 'functionCalling',
}).invoke([
    {
        role: "system",
        content: "You must decide what is the root type of the GraphQL query and return it as a string. Do not answer anything else. Do not write full GraphQL query.",
    },
    {
        role: "user",
        content: userPrompt,
    }
]);

// const parsed = result.raw.tool_calls.map(tc => tc.args)

const rootType = rootTypeResponse.parsed.rootType
console.log("Root type:", rootType)


const rootFieldResponse = await model.withStructuredOutput(z.object({
    rootField: z.enum(getFields(rootType))
}), {
    name: "root_field",
    includeRaw: true,
    // method: 'functionCalling',
}).invoke([
    {
        role: "system",
        content: `You must decide what is the root field of the GraphQL ${rootType} and return it as a string. Do not answer anything else. Do not write full GraphQL query.`,
    },
    {
        role: "user",
        content: userPrompt,
    }
])

const rootField = rootFieldResponse.parsed.rootField
console.log("Root field:", rootField)

