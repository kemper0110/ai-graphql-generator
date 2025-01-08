import {buildSchema} from "graphql/index.js";
import fs from "node:fs";
import {introspectionFromSchema} from "graphql/utilities/index.js";


const schema = buildSchema(fs.readFileSync("clean-schema.graphql", 'utf-8'))

const ignoreSet = new Set([
    // "loc",
    // "extensions",
    // "_directives",
    "directives",
    "specifiedByURL",
    // "extensionASTNodes",
    // "_subTypeMap"

    // "operationTypes",
    // "_queryType",
    // "_directives",
    // "_typeMap",
    // "_subTypeMap",
    // "_implementationsMap",
])



fs.writeFileSync("schema-ast.json", JSON.stringify(introspectionFromSchema(schema), (key, value) => {
    if(ignoreSet.has(key))
        return undefined

    return value
}, 2))