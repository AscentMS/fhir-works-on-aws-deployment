import { Duration } from 'aws-cdk-lib';
import {
    AccountRecovery,
    AdvancedSecurityMode,
    CfnUserPoolClient,
    CfnUserPoolDomain,
    CfnUserPoolGroup,
    Mfa,
    StringAttribute,
    UserPool,
    UserPoolEmail,
} from 'aws-cdk-lib/aws-cognito';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

export default class CognitoResources {
    userPool: UserPool;

    userPoolClient: CfnUserPoolClient;

    userPoolDomain: CfnUserPoolDomain;

    practitionerUserGroup: CfnUserPoolGroup;

    nonPractitionerUserGroup: CfnUserPoolGroup;

    auditorUserGroup: CfnUserPoolGroup;

    constructor(scope: Construct, stackName: string, cognitoOAuthDefaultRedirectURL: string, emailDomain: string) {
        const emailDomainConfig = emailDomain == 'verificationemail.com'
            ? UserPoolEmail.withCognito('no-reply@' + emailDomain)
            : UserPoolEmail.withSES({
                fromEmail: 'no-reply@' + emailDomain,
                sesRegion: 'eu-west-2',
                sesVerifiedDomain: emailDomain,
            });

        this.userPool = new UserPool(scope, 'userPool', {
            accountRecovery: AccountRecovery.EMAIL_AND_PHONE_WITHOUT_MFA,
            advancedSecurityMode: AdvancedSecurityMode.ENFORCED,
            autoVerify: {
                email: true,
            },
            email: emailDomainConfig,
            userPoolName: stackName,
            standardAttributes: {
                email: {
                    required: true,
                },
            },
            customAttributes: {
                cc_confirmed: new StringAttribute({ mutable: true }),
                tenantId: new StringAttribute({ mutable: true }),
                gmc_number: new StringAttribute({ mutable: true }),
            },
            passwordPolicy: {
                minLength: 8,
                requireDigits: true,
                requireLowercase: true,
                requireSymbols: true,
                requireUppercase: true,
                tempPasswordValidity: Duration.days(7)
                // As of CDK V2.165 there is no mechanism to set the password reuse parameter
            },
            selfSignUpEnabled: false,
            userInvitation: {
                emailSubject: 'Welcome to Evergreen Connect!',
                emailBody: 'Welcome to Evergreen Connect!<br /> \
                            <br /> \
                            Your username is {username} and your temporary password is {####}<br /> \
                            <br /> \
                            You will be prompted to change your password when you first log in.<br /> \
                            <br /> \
                            <br /> \
                            <img src="data:image/png;base64,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" /> \
                            \
                            <br /> \
                            <small style="color:#666">This communication is from Evergreen Health Solutions Ltd, trading as Evergreen Life, (Company no. 09484935) registered at Evergreen house, The Edge, Clowes, Street, Manchester, M3 5NA. This communication is for the exclusive use of the intended recipient(s). If you are not the intended recipient(s), please (1) notify admin@evergreen-life.co.uk by forwarding this email and delete all copies from your system and (2) note that disclosure, distribution, copying or use of this communication is strictly prohibited. Email communications cannot be guaranteed to be secure or free from error or viruses. To the extent permitted by law, Evergreen Health Solutions Ltd does not accept any liability for use of or reliance on the contents of this email by any person save by the intended recipient(s). Opinions, conclusions and other information in this email which have not been delivered by way of the business are neither given nor endorsed by it.</small>'
            },
            mfa: Mfa.OPTIONAL,
            mfaSecondFactor: {
                sms: true,
                otp: true,
                email: true
            },
            mfaMessage: "Your Evergreen Connect MFA token is {####}.",
            deletionProtection: true
        });
        NagSuppressions.addResourceSuppressions(this.userPool, [
            {
                id: 'AwsSolutions-COG2',
                reason: 'Only admins can create users in this user pool',
            },
            {
                id: 'AwsSolutions-COG3',
                reason: 'Only admins can create users in this user pool',
            },
        ]);

        this.userPoolClient = new CfnUserPoolClient(scope, 'userPoolClient', {
            allowedOAuthFlows: ['code', 'implicit'],
            allowedOAuthFlowsUserPoolClient: true,
            allowedOAuthScopes: ['email', 'openid', 'profile'],
            clientName: `${stackName}-UserPool`,
            userPoolId: this.userPool.userPoolId,
            callbackUrLs: [cognitoOAuthDefaultRedirectURL],
            defaultRedirectUri: cognitoOAuthDefaultRedirectURL,
            explicitAuthFlows: ['ALLOW_USER_PASSWORD_AUTH', 'ALLOW_REFRESH_TOKEN_AUTH'],
            supportedIdentityProviders: ['COGNITO'],
            preventUserExistenceErrors: 'ENABLED',
        });

        this.userPoolDomain = new CfnUserPoolDomain(scope, 'userPoolDomain', {
            userPoolId: this.userPool.userPoolId,
            domain: this.userPoolClient.ref,
        });

        this.practitionerUserGroup = new CfnUserPoolGroup(scope, 'practitionerUserGroup', {
            description: 'This is a member of the hospital staff, who directly helps patients',
            groupName: 'practitioner',
            precedence: 0,
            userPoolId: this.userPool.userPoolId,
        });

        this.nonPractitionerUserGroup = new CfnUserPoolGroup(scope, 'nonPractitionerUserGroup', {
            description: 'This is a member of the hospital staff who needs access to non-medical record',
            groupName: 'non-practitioner',
            precedence: 1,
            userPoolId: this.userPool.userPoolId,
        });

        this.auditorUserGroup = new CfnUserPoolGroup(scope, 'auditorUserGroup', {
            description: 'Someone who needs read, v_read and search access on patients',
            groupName: 'auditor',
            precedence: 2,
            userPoolId: this.userPool.userPoolId,
        });
    }
}
