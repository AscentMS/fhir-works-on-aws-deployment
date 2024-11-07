import { getFhirClient, randomPatient } from './utils';

jest.setTimeout(60 * 1000);

test('practitioner role can create new patient', async () => {
    const client = await getFhirClient({ role: 'practitioner' });
    const patientRecord: any = randomPatient();
    delete patientRecord.id;
    await expect(client.post('Patient', patientRecord)).resolves.toMatchObject({
        status: 201,
        data: patientRecord,
    });
});

test('auditor role can read new patient', async () => {
    const client = await getFhirClient({ role: 'auditor' });
    const patientRecord: any = randomPatient();
    delete patientRecord.id;
    await expect(client.get('Patient', patientRecord)).resolves.toMatchObject({
        status: 200
    });
});

describe('Negative tests', () => {
    test('invalid token', async () => {
        const client = await getFhirClient({ role: 'practitioner', providedAccessToken: 'Invalid token' });
        await expect(client.post('Patient', randomPatient())).rejects.toMatchObject({
            response: { status: 401 },
        });
    });

    test('auditor role cannot create new patient record', async () => {
        const client = await getFhirClient({ role: 'auditor' });
        await expect(client.post('Patient', randomPatient())).rejects.toMatchObject({
            response: { status: 401 },
        });
    });
});
