/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { AwsStub, mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
// eslint-disable-next-line import/no-extraneous-dependencies
import moment from 'moment';

// @ts-ignore
import { exportCloudwatchLogs, deleteCloudwatchLogs } from './handler';
import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { CloudWatchClient, CloudWatchClientResolvedConfig, PutMetricDataCommand, ServiceInputTypes, ServiceOutputTypes } from '@aws-sdk/client-cloudwatch';
import { CloudWatchLogsClient, CreateExportTaskCommand, DeleteLogStreamCommand, DescribeLogStreamsCommand } from '@aws-sdk/client-cloudwatch-logs';

function checkEmitMetrics(
    putMetricDataSpy: AwsStub<ServiceInputTypes, ServiceOutputTypes, CloudWatchClientResolvedConfig>,
    metricPrefix: string,
    isSuccessful: boolean
) {
    //expect(putMetricDataSpy.calledTwice).toBeTruthy();
    expect(putMetricDataSpy.calls()).toHaveLength(2);
    const actualPutMetricData: any[] = [];
    //actualPutMetricData.push(putMetricDataSpy.getCall(0).args[0]);
    //actualPutMetricData.push(putMetricDataSpy.getCall(1).args[0]);
    actualPutMetricData.push(putMetricDataSpy.call(0).args[0].input); // putMetricDataSpy.getCall(0).args[0]);
    actualPutMetricData.push(putMetricDataSpy.call(1).args[0].input); //putMetricDataSpy.getCall(1).args[0]);

    actualPutMetricData.sort((metricA: any, metricB: any) => {
        return metricA.MetricData[0].MetricName.localeCompare(metricB.MetricData[0].MetricName);
    });

    const expectedPutMetricData = [
        {
            MetricData: [
                {
                    MetricName: `${metricPrefix}-Succeeded`,
                    Unit: 'Count',
                    Value: isSuccessful ? 1 : 0,
                },
            ],
            Namespace: 'Audit-Log-Mover',
        },
        {
            MetricData: [
                {
                    MetricName: `${metricPrefix}-Failed`,
                    Unit: 'Count',
                    Value: isSuccessful ? 0 : 1,
                },
            ],
            Namespace: 'Audit-Log-Mover',
        },
    ];

    expectedPutMetricData.sort((metricA, metricB) => {
        return metricA.MetricData[0].MetricName.localeCompare(metricB.MetricData[0].MetricName);
    });

    for (let i = 0; i < actualPutMetricData.length; i += 1) {
        expect(actualPutMetricData[i]).toMatchObject(expectedPutMetricData[i]);
    }
}

describe('exportCloudwatchLogs', () => {
    const s3Mock = mockClient(S3Client);
    const cloudwatchMock = mockClient(CloudWatchClient);
    const cloudwatchLogsMock = mockClient(CloudWatchLogsClient);

    afterAll(() => {
        //s3Mock.restore();
        //cloudwatchMock.restore();
        //cloudwatchLogsMock.restore();
    });
    
    beforeEach(() => {
        s3Mock.reset();
        cloudwatchMock.reset();
        cloudwatchLogsMock.reset();

        cloudwatchMock
            .on(PutMetricDataCommand)
            .resolves(
                {
                    $metadata: {
                        httpStatusCode: 200,
                    }
                }
            );
    });

    test('create export task succeed. exportCloudwatchLogs-Succeeded emit 1 and exportCloudwatchLogs-Failed emit 0', async () => {
        // BUILD
        cloudwatchLogsMock
            .on(CreateExportTaskCommand)
            .resolves({
                $metadata: {
                    httpStatusCode: 200,
                }
            });

        // OPERATE
        await exportCloudwatchLogs();

        // CHECK
        console.log('Calls:', cloudwatchMock.calls());
        expect(cloudwatchMock).toHaveReceivedCommandTimes(PutMetricDataCommand, 2);

        const sevenDaysAgo = moment.utc().subtract(7, 'days').format('YYYY-MM-DD');

        const expectedCreateExportParams = {
            destinationPrefix: sevenDaysAgo,
            taskName: `audit-log-export-${sevenDaysAgo}`,
        };

        const actualExportParam = cloudwatchLogsMock.call(0).args[0].input; //  createExportTaskSpy.getCall(0).args[0];
        expect(actualExportParam).toMatchObject(expectedCreateExportParams);

        checkEmitMetrics(cloudwatchMock, 'exportCloudwatchLogs', true);
    });

    test('create export task failed. exportCloudwatchLogs-Succeeded emit 0 and exportCloudwatchLogs-Failed emit 1', async () => {
        // BUILD
        cloudwatchLogsMock
            .on(CreateExportTaskCommand)
            .rejects(new Error('Failed to create export task'));
        /*
        AWSMock.mock('CloudWatchLogs', 'createExportTask', (params: any, callback: Function) => {
            createExportTaskSpy(params);
            const error = {
                message: 'Failed to create export task',
            };
            callback(error, {});
        });
        */
        
        try {
            // OPERATE
            expect.hasAssertions();
            await exportCloudwatchLogs();
        } catch (e) {
            // CHECK
            expect((e as any).message).toEqual('Failed to kick off all export tasks');
            expect(cloudwatchLogsMock).toHaveReceivedCommandTimes(CreateExportTaskCommand, 1);
            //expect(createExportTaskSpy.calledOnce).toBeTruthy();

            const sevenDaysAgo = moment.utc().subtract(7, 'days').format('YYYY-MM-DD');

            const params = {
                destinationPrefix: sevenDaysAgo,
                taskName: `audit-log-export-${sevenDaysAgo}`,
            };

            const actualExportParam = cloudwatchLogsMock.call(0).args[0].input; //createExportTaskSpy.getCall(0).args[0];
            expect(actualExportParam).toMatchObject(params);

            //expect(putMetricDataSpy.calledTwice).toBeTruthy();
            expect(cloudwatchMock).toHaveReceivedCommandTimes(PutMetricDataCommand, 2);

            const actualPutMetricData: any[] = [];
            actualPutMetricData.push(cloudwatchMock.call(0).args[0].input); // putMetricDataSpy.getCall(0).args[0]);
            actualPutMetricData.push(cloudwatchMock.call(1).args[0].input); // putMetricDataSpy.getCall(1).args[0]);

            checkEmitMetrics(cloudwatchMock, 'exportCloudwatchLogs', false);
        }
    });
});

describe('deleteCloudwatchLogs', () => {
    const logStreamName = '1b80d2ffe808890e47f94dc4adc5617a';
    const s3Mock = mockClient(S3Client);
    const cloudwatchMock = mockClient(CloudWatchClient);
    const cloudwatchLogsMock = mockClient(CloudWatchLogsClient);
    
    beforeEach(() => {
        s3Mock.reset();
        cloudwatchMock.reset();
        cloudwatchLogsMock.reset();

        cloudwatchLogsMock
            .on(DeleteLogStreamCommand)
            .resolves(
                {
                    $metadata: {
                        httpStatusCode: 200,
                    }
                }
            );
        cloudwatchLogsMock
            .on(DescribeLogStreamsCommand)
            .resolves(
                {
                    $metadata: {
                        httpStatusCode: 200,
                    },
                    logStreams: [
                        {
                            logStreamName: logStreamName,
                            firstEventTimestamp: moment('2020-07-04').add(1, 'minutes').valueOf(),
                            lastEventTimestamp: moment('2020-07-04').add(2, 'minutes').valueOf(),
                        },
                    ],
                }
            );
        cloudwatchMock
            .on(PutMetricDataCommand)
            .resolves(
                {
                    $metadata: {
                        httpStatusCode: 200,
                    }
                }
            );

        /*
        AWSMock.mock('CloudWatchLogs', 'deleteLogStream', (params: any, callback: Function) => {
            callback(null, {});
        });

        AWSMock.mock('CloudWatch', 'putMetricData', (params: any, callback: Function) => {
            putMetricDataSpy(params);
            callback(null, {});
        });

        AWSMock.mock('CloudWatchLogs', 'describeLogStreams', (params: any, callback: Function) => {
            callback(null, {
                logStreams: [
                    {
                        logStreamName,
                        firstEventTimestamp: moment('2020-07-04').add(1, 'minutes').valueOf(),
                        lastEventTimestamp: moment('2020-07-04').add(2, 'minutes').valueOf(),
                    },
                ],
            });
        });
        */
    });

    test('delete cloudwatch logs succeed. deleteCloudwatchLogs-Succeeded emit 1 and deleteCloudwatchLogs-Failed emit 0', async () => {
        // BUILD
        s3Mock
            .on(ListObjectsV2Command)
            .resolvesOnce(
                {
                    $metadata: {
                        httpStatusCode: 200,
                    },
                    CommonPrefixes: [
                        {
                            Prefix: '2020-07-04/',
                        },
                    ],
                }
            );

        cloudwatchLogsMock
            .on(DeleteLogStreamCommand)
            .resolvesOnce(
                {
                    $metadata: {
                        httpStatusCode: 200,
                    }
                }
            );
        /*
        AWSMock.mock('S3', 'listObjectsV2', (params: any, callback: Function) => {
            callback(null, {
                CommonPrefixes: [
                    {
                        Prefix: '2020-07-04/',
                    },
                ],
            });
        });

        const deleteLogStreamsSpy = sinon.spy();
        AWSMock.mock('CloudWatchLogs', 'deleteLogStream', (params: any, callback: Function) => {
            deleteLogStreamsSpy(params);
            callback(null, {});
        });
        */

        // OPERATE
        await deleteCloudwatchLogs({
            daysExported: ['2020-07-04'],
        });

        // CHECK
        //expect(deleteLogStreamsSpy.calledOnce).toBeTruthy();
        expect(cloudwatchLogsMock).toHaveReceivedCommandTimes(DeleteLogStreamCommand, 1);
        expect(cloudwatchLogsMock).toHaveReceivedCommandTimes(DescribeLogStreamsCommand, 1);
        console.log('Calls', cloudwatchLogsMock.calls());
        const actualLogstreamDeleted = cloudwatchLogsMock.commandCalls(DeleteLogStreamCommand)[0].args[0].input; //deleteLogStreamsSpy.getCall(0).args[0];
        expect(actualLogstreamDeleted).toMatchObject({ logStreamName });

        checkEmitMetrics(cloudwatchMock, 'deleteCloudwatchLogs', true);
    });

    test('delete cloudwatch logs failed. deleteCloudwatchLogs-Succeeded emit 0 and deleteCloudwatchLogs-Failed emit 1', async () => {
        // BUILD
        s3Mock
            .on(ListObjectsV2Command)
            .resolvesOnce(
                {
                    $metadata: {
                        httpStatusCode: 200,
                    },
                    CommonPrefixes: [
                        {
                            Prefix: '2020-06-01/',
                        },
                    ]
                }
            );

        /*
        AWSMock.mock('S3', 'listObjectsV2', (params: any, callback: Function) => {
            callback(null, {
                CommonPrefixes: [
                    {
                        Prefix: '2020-06-01/',
                    },
                ],
            });
        });
        */
        
        try {
            // OPERATE
            await deleteCloudwatchLogs({
                daysExported: ['2020-07-04'],
            });
        } catch (e) {
            // CHECK
            expect((e as any).message).toEqual(
                'Failed to delete Cloudwatch Logs because some Cloudwatch Logs have not been exported to S3',
            );
            checkEmitMetrics(cloudwatchMock, 'deleteCloudwatchLogs', false);
        }
    });
});
