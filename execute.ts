export async function execute(payload: { query: string, operationName?: string, variables?: Record<string, any> }) {
    const url = "http://localhost:4000/graphql"
    const fetchResult = await fetch(url, {
        method: "POST",
        headers: {
            'content-type': 'application/json',
            'accept': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    const response = await fetchResult.json()
    return response.data
}