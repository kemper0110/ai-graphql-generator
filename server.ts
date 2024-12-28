import express from 'express'
import { ruruHTML } from "ruru/server";
import {createSchema, createYoga} from 'graphql-yoga'
import {addMocksToSchema} from "@graphql-tools/mock";
import * as fs from "node:fs";
import {introspectionFromSchema} from "graphql/utilities/index.js";

export const schema = addMocksToSchema({
    schema: createSchema({
        typeDefs: fs.readFileSync('schema.graphql', 'utf8'),
        // resolvers: {
        //     Query: {
        //         hello: () => 'world'
        //     }
        // }
    }),
})
introspectionFromSchema()

const yoga = createYoga({ schema })

const app = express()

app.use(yoga.graphqlEndpoint, yoga)

app.get("/", (req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(ruruHTML({endpoint: yoga.graphqlEndpoint}));
});

app.listen(4000, () => console.log('Running a GraphQL API server at http://localhost:4000/graphql'))