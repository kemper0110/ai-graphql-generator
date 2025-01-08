import {buildSchema} from "graphql";
import fs from "node:fs";

const schema = buildSchema(fs.readFileSync("schema.graphql", 'utf-8'))


export function getRootTypes() {
    return {
        query: schema.getQueryType()?.name,
        mutation: schema.getMutationType()?.name,
        subscription: schema.getSubscriptionType()?.name
    }
}

export function getTypes() {
    return Object.keys(schema.getTypeMap())
}

export function getFields(typename: string): string[] {
    const type = schema.getType(typename)!
    return Object.keys(type.getFields())
}

