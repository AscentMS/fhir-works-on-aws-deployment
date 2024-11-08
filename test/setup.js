// eslint-disable-next-line @typescript-eslint/no-require-imports
const { default: getSecrets } = require("./read-from-secrets-manager");

// NB - running the tests requires you to have access to the Sandbox environment configured
//      on the machine you are running the tests on.

module.exports = async function setup() {

	console.log('\nGlobal setup starting...');

	if (process.env.NODE_ENV !== 'production') {
		console.log('Reading the secret values required for testing...');
		const secretValues = JSON.parse(await getSecrets('fhir-works-on-aws/test-values'));
		console.log('Setting up environment variables for testing...');
		process.env.AWS_REGION = 'eu-west-2';
		process.env.AWS_XRAY_CONTEXT_MISSING = "LOG_ERROR";
		process.env.AWS_XRAY_LOG_LEVEL = "silent";
		process.env.API_URL = secretValues.api_url;
		process.env.API_KEY = secretValues.api_key;
		process.env.API_AWS_REGION = 'eu-west-2';
		process.env.COGNITO_CLIENT_ID = secretValues.cognito_client_id;
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		process.env.COGNITO_USERNAME_PRACTITIONER = secretValues.cognito_username_practitioner,
		process.env.COGNITO_USERNAME_AUDITOR = secretValues.cognito_username_auditor;
		process.env.COGNITO_PASSWORD = secretValues.cognito_password;
		process.env.COGNITO_USERNAME_PRACTITIONER_ANOTHER_TENANT = secretValues.cognito_username_practitioner_another_tenant;
		process.env.MULTI_TENANCY_ENABLED = 'true';
	}

	console.log('Global setup complete.');
}