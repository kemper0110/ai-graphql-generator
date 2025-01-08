import {FilterTypes, PruneSchema, wrapSchema} from "@graphql-tools/wrap";
import {buildSchema, parse, printSchema} from "graphql";
import fs from "node:fs";

const query = parse(/* GraphQL */ `{
    searchClinic {
        elems {
            id name
            address {
                city
                flatNo
                street
            }
            clinicDoctorList {
                elems {
                    doctor {
                        entity{
                            doctorType
                            person {
                                entity{
                                    firstName
                                    lastName
                                    sex
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}`)

const q1 = /* GraphQL */ `
    query {
        searchClinic(cond: "name = 'ABC Clinic'", limit: 10, offset: 0) {
            elems {
                id
                name
                sys_ver
                type
                clinicDoctorList {
                    elems {
                        id
                        type
                        doctor {
                            entity {
                                id
                                sys_ver
                                type
                            }
                        }
                    }
                }
            }
        }
    }
`

const initialSchema = buildSchema(fs.readFileSync("schema.graphql", 'utf-8'));
console.log(Object.keys(initialSchema.getTypeMap()).length)

const schema = wrapSchema({
    schema: initialSchema,
    transforms: [
        new FilterTypes(type => {
            return type.name !== "_Mutation"
                && !type.name.startsWith("_R_")
                && !(type.name.startsWith("_G_") && type.name.endsWith("Reference"))
                && type.name !== '_Calculation'
        }),
        new PruneSchema()
    ]
})

fs.writeFileSync("clean-schema.graphql", printSchema(schema))