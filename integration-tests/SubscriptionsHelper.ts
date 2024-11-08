/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

export interface SubscriptionNotification {
    httpMethod: string;
    path: string;
    body?: string | null;
    headers?: string[];
}

export class SubscriptionsHelper {
    private readonly notificationsTableName: string;

    private readonly dynamodbClient: DynamoDB;

    constructor(notificationsTableName: string) {
        this.notificationsTableName = notificationsTableName;
        this.dynamodbClient = new DynamoDB();
    }

    /**
     * Gets all notifications received for a given path.
     * @param path - The path where the notifications were sent. It is recommended to use unique paths for each test run (e.g. by appending an uui to it)
     */
    async getNotifications(path: string): Promise<SubscriptionNotification[]> {
        const { Items } = await this.dynamodbClient
            .query({
                TableName: this.notificationsTableName,
                KeyConditionExpression: '#path = :pathValue',
                ExpressionAttributeNames: { '#path': 'path' },
                ExpressionAttributeValues: { ':pathValue': { S: path } },
            })

        if (Items === undefined) {
            return [];
        }

        return Items.map((item) => unmarshall(item) as SubscriptionNotification);
    }
}
