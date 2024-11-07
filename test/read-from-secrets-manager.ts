import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';


export default async function getSecrets(
    secretName: string,
    region: string = 'eu-west-2'
): Promise<string> {
    const client = new SecretsManagerClient({
        region,
    });

    const command = new GetSecretValueCommand({
        SecretId: secretName,
    });

    try {
        const secretValue = await client.send(command);

        if(secretValue.SecretString) {
            return secretValue.SecretString;
        }

        if (secretValue.SecretBinary) {
            return new TextDecoder().decode(secretValue.SecretBinary);
        }

        throw new Error(`Failed to find a secret with name '${secretName}'.`);
    }
    
    catch (error) {
        console.error('Error fetching secret:', error);
        throw error;
    }
}