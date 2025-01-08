import {tool} from "@langchain/core/tools";
import {z} from "zod";
import {buildSchema, GraphQLError, parse, print, validate} from "graphql";
import fs from "node:fs";

const schema = buildSchema(fs.readFileSync("schema.graphql", 'utf-8'))
const getRootTypesTool = tool(function getRootTypes() {
        console.log('called getRootTypesTool')
        return {
            query: schema.getQueryType()?.name,
            mutation: schema.getMutationType()?.name,
            subscription: schema.getSubscriptionType()?.name
        }
    },
    {
        name: "get_root_types",
        description: "Returns the names of schema root types. Do not accept any parameters.",
        schema: z.object({})
    }
);
const getTypeTool = tool(function getType({typename}: { typename: string }) {
        console.log('called getTypeTool', typename)
        const type = schema.getType(typename)!
        return print(type.astNode)
    },
    {
        name: "get_type",
        description: "Returns the SDL type definition of the given typename.",
        schema: z.object({
            typename: z.string(),
        }),
    }
);
const getPossibleTypesTool = tool(function getPossibleTypes({typename}: { typename: string }) {
        console.log('called getPossibleTypesTool', typename)
        const type = schema.getType(typename)!
        return schema.getPossibleTypes(type).map(t => t.name)
    },
    {
        name: "get_possible_types",
        description: "Returns the possible type names for the given typename of abstract type.",
        schema: z.object({
            typename: z.string(),
        }),
    }
);
const getDirectiveTool = tool(function getDirective({typename}: { typename: string }) {
        console.log('called getDirectiveTool', typename)
        const type = schema.getDirective(typename)!
        return print(type.astNode)
    },
    {
        name: "get_directive",
        description: "Returns SDL type definition of the directive for the given typename.",
        schema: z.object({
            typename: z.string(),
        }),
    }
);
const getDirectivesTool = tool(function getDirectives() {
        console.log('called getDirectivesTool')
        return schema.getDirectives().map(d => d.name)
    },
    {
        name: "get_directives",
        description: "Returns the names of directives of the schema. Do not accept any parameters.",
        schema: z.object({})
    }
);
const getTypesTool = tool(function getTypes() {
        console.log('called getTypesTool')
        return Object.keys(schema.getTypeMap())
    },
    {
        name: "get_types",
        description: "Returns the names of types of the schema. Do not accept any parameters.",
        schema: z.object({})
    }
);
const getImplementationsTool = tool(function getImplementations({typename}: { typename: string }) {
        console.log('called getImplementationsTool', typename)
        const type = schema.getType(typename)!
        const impls = schema.getImplementations(type)
        const objects = impls.objects.map(o => o.name)
        const interfaces = impls.interfaces.map(o => o.name)
        return {objects, interfaces}
    },
    {
        name: "get_implementations",
        description: "Returns the implementations(objects and interfaces) for type of the given typename.",
        schema: z.object({
            typename: z.string(),
        }),
    }
);

export const validQueryResponse = "Query is valid"

const validateQuery = tool(function validateQuery({query}: { query: string }) {
    console.log('called validateQueryTool', query)
    let queryAst;
    try {
        queryAst = parse(query)
    } catch (e: GraphQLError) {
        return e.toJSON()
    }
    const errors = validate(schema, queryAst)
    if (errors.length) {
        return errors.map(e => e.toJSON()).join('\n')
        // return errors.map((e, index) => `Error ${index + 1}: ${e.name} - ${e.message}
        // Locations
        // ${e.locations.map(loc => `  at ${loc.line}:${loc.column}`).join('\n')}
        // Path
        // ${e.path.map(p => `  at ${p}`).join('\n')}
        // `).join('\n')
    }
    return validQueryResponse
},
    {
        name: "validate_query_by_schema",
        description: `Validates the given GraphQL query by the schema. Returns json lines with errors or '${validQueryResponse}' if query is valid.`,
        schema: z.object({
            query: z.string(),
        }),
    }
);

export const tools = [getRootTypesTool, getTypeTool, getPossibleTypesTool, getDirectiveTool, getDirectivesTool, getTypesTool, getImplementationsTool, validateQuery];