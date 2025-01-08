import {buildSchema, DocumentNode, parse, TypeInfo, validate, visit, visitWithTypeInfo} from "graphql";
import fs from "node:fs";

const schema = buildSchema(fs.readFileSync("schema.graphql", 'utf-8'))

const query = /* GraphQL */ `
  query {
    searchClinic {
        id
    }
  }
`;

// Парсим запрос в AST
let ast: DocumentNode;
try {
    ast = parse(query);
} catch (error) {
    console.error('Ошибка парсинга:', error.message);
}

console.log(JSON.stringify(ast, (key, value) => key === 'loc' ? undefined : value, 2));

// const errors = validate(schema, ast, undefined, {
//     maxErrors: 4,
// }, new TypeInfo(schema));
//
// console.log(errors.map(e => e.toJSON()))
//
// const typeInfo = new TypeInfo(schema);
//
// visit(ast, visitWithTypeInfo(typeInfo, {
//     Field(node) {
//         const type = typeInfo.getType()
//         const fieldDef = typeInfo.getFieldDef()
//         console.log('Field', node.name.value, type)
//     }
// }))