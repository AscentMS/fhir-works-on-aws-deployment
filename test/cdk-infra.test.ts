import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import FhirWorksStack from '../lib/cdk-infra-stack';

test('Resources created', () => {
    const app = new cdk.App();
    const stage = 'dev';
    // WHEN
    const stack = new FhirWorksStack(
        app, 
        `fhir-service-${stage}`,
        {
            stage: stage,
            region: 'eu-west-2',
            enableMultiTenancy: true,
            enableSubscriptions: false,
            enableBackup: false,
            useHapiValidator: false,
            enableESHardDelete: false,
            logLevel: 'INFO',
            oauthRedirect: 'http://localhost:8080',
            fhirVersion: '4.01',
            emailDomain: 'eglsandbox.co.uk'
        }
    );
    // THEN
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const template = Template.fromStack(stack);

    //   template.hasResourceProperties('AWS::SQS::Queue', {
    //     VisibilityTimeout: 300
    //   });
});
