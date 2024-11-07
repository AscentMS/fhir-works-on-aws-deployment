import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
 * @param {Object} context
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */
const dynamoDb = new DynamoDB();

const { TABLE_NAME } = process.env;

if (TABLE_NAME === undefined) {
    throw new Error(`Required env variable TABLE_NAME is not defined`);
}

export async function lambdaHandler(event) {
    const { path, httpMethod, headers, body } = event;

    const item = {
        path,
        timestamp: Date.now(),
        httpMethod,
        headers,
        body,
    };

    console.log('Received notification:', JSON.stringify(item, null, 2));

    await dynamoDb
        .putItem({
            TableName: TABLE_NAME,
            Item: marshall(item),
        })
        .promise();

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'ok',
        }),
    };
}
