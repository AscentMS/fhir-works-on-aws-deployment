/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { AxiosInstance } from 'axios';
import waitForExpect from 'wait-for-expect';
import { cloneDeep } from 'lodash';
import { Chance } from 'chance';
// NOTE this needs to be the same version as what is going to be downloaded. Please see /.github/workflows/deploy.yaml to verify
// This json is version STU3.1.1 from https://www.hl7.org/fhir/us/core/STU3.1.1/CapabilityStatement-us-core-server.json
// We're using the JSON instead of downloading from the URL because the SSL cert at that domain has expired

// NB - had to mock these tests as I could not find a US core FHIR Server to test against. 

import STU311UsCoreCapStatement from './STU3_1_1UsCoreCapStatement.json';
import {
    expectResourceToBeInBundle,
    expectResourceToBePartOfSearchResults,
    expectResourceToNotBeInBundle,
    getFhirClient,
    randomPatient,
    waitForResourceToBeSearchable,
} from './utils';
import { CapabilityStatement } from './types';

jest.setTimeout(60 * 1000);

describe('Implementation Guides - US Core', () => {
    let client: AxiosInstance;
    beforeAll(async () => {
        client = await getFhirClient();
    });

    beforeEach(() => {
        jest.resetAllMocks();
    });

    function getResourcesWithSupportedProfile(capStatement: CapabilityStatement) {
        const resourcesWithSupportedProfile: Record<string, string[]> = {};
        capStatement.rest[0].resource
            .filter((resource) => {
                return resource.supportedProfile;
            })
            .forEach((resource) => {
                if (resource.type) {
                    resourcesWithSupportedProfile[resource.type] = resource.supportedProfile!.sort();
                }
            });

        return resourcesWithSupportedProfile;
    }

    test('capability statement includes search parameters, supportedProfile, and operations', async () => {
        jest.spyOn(client, 'get').mockImplementationOnce(() => Promise.resolve({ data: STU311UsCoreCapStatement }));

        const actualCapabilityStatement: CapabilityStatement = (await client.get('metadata')).data;

        const usCorePatientSearchParams = actualCapabilityStatement.rest[0].resource
            .filter((resource) => resource.type === 'Patient')
            .flatMap((resource) => resource.searchParam ?? [])
            .filter((searchParam) =>
                searchParam.definition.startsWith('http://hl7.org/fhir/us/core/SearchParameter'),
            );

        console.log(JSON.stringify(usCorePatientSearchParams, undefined, 3));

        // Check for expected search params
        expect(usCorePatientSearchParams).toEqual(
            // There are many more search parameters in US Core but they are all loaded into FWoA in the same way.
            // Checking only a few of them is good enough
            expect.arrayContaining([
                {
                    "extension": [{
                            "url": "http://hl7.org/fhir/StructureDefinition/capabilitystatement-expectation",
                            "valueCode": "SHALL"
                        }
                    ],
                    "name": "_id",
                    "definition": "http://hl7.org/fhir/us/core/SearchParameter/us-core-patient-id",
                    "type": "token"
                }, {
                    "extension": [{
                            "url": "http://hl7.org/fhir/StructureDefinition/capabilitystatement-expectation",
                            "valueCode": "MAY"
                        }
                    ],
                    "name": "birthdate",
                    "definition": "http://hl7.org/fhir/us/core/SearchParameter/us-core-patient-birthdate",
                    "type": "date"
                }, {
                    "extension": [{
                            "url": "http://hl7.org/fhir/StructureDefinition/capabilitystatement-expectation",
                            "valueCode": "MAY"
                        }
                    ],
                    "name": "family",
                    "definition": "http://hl7.org/fhir/us/core/SearchParameter/us-core-patient-family",
                    "type": "string"
                }, {
                    "extension": [{
                            "url": "http://hl7.org/fhir/StructureDefinition/capabilitystatement-expectation",
                            "valueCode": "MAY"
                        }
                    ],
                    "name": "gender",
                    "definition": "http://hl7.org/fhir/us/core/SearchParameter/us-core-patient-gender",
                    "type": "token"
                }, {
                    "extension": [{
                            "url": "http://hl7.org/fhir/StructureDefinition/capabilitystatement-expectation",
                            "valueCode": "MAY"
                        }
                    ],
                    "name": "given",
                    "definition": "http://hl7.org/fhir/us/core/SearchParameter/us-core-patient-given",
                    "type": "string"
                }, {
                    "extension": [{
                            "url": "http://hl7.org/fhir/StructureDefinition/capabilitystatement-expectation",
                            "valueCode": "SHALL"
                        }
                    ],
                    "name": "identifier",
                    "definition": "http://hl7.org/fhir/us/core/SearchParameter/us-core-patient-identifier",
                    "type": "token"
                }, {
                    "extension": [{
                            "url": "http://hl7.org/fhir/StructureDefinition/capabilitystatement-expectation",
                            "valueCode": "SHALL"
                        }
                    ],
                    "name": "name",
                    "definition": "http://hl7.org/fhir/us/core/SearchParameter/us-core-patient-name",
                    "type": "string"
                }
            ]),
        );

        const actualResourcesWithSupportedProfile: Record<string, string[]> =
            getResourcesWithSupportedProfile(actualCapabilityStatement);

        // @ts-expect-error - missing fields
        const expectedCapStatement: CapabilityStatement = STU311UsCoreCapStatement;

        const expectedResourcesWithSupportedProfile: Record<string, string[]> =
            getResourcesWithSupportedProfile(expectedCapStatement);

        // Check for expected supportedProfile
        expect(actualResourcesWithSupportedProfile).toEqual(expectedResourcesWithSupportedProfile);

        const usCoreDocumentReference = actualCapabilityStatement.rest[0].resource.find(
            (resource) => resource.type === 'DocumentReference',
        );

        // Check for docref operation
        expect(usCoreDocumentReference).toMatchObject({
            operation: [
                {
                    extension: [
                        {
                            url: "http://hl7.org/fhir/StructureDefinition/capabilitystatement-expectation",
                            valueCode: "SHALL"
                        }
                    ],
                    name: "docref",
                    definition: "http://hl7.org/fhir/us/core/OperationDefinition/docref",
                    documentation: "A server **SHALL** be capable of responding to a $docref operation and  capable of returning at least a reference to a generated CCD document, if available. **MAY** provide references to other 'on-demand' and 'stable' documents (or 'delayed/deferred assembly') that meet the query parameters as well. If a context date range is supplied the server ** SHOULD**  provide references to any document that falls within the date range If no date range is supplied, then the server **SHALL** provide references to last or current encounter.  **SHOULD** document what resources, if any, are returned as included resources\n\n`GET [base]/DocumentReference/$docref?patient=[id]`"
                }
            ]
        });
    });

    const ethnicityCode = '2148-5';
    const raceCode = '2106-3';
    function getRandomPatientWithEthnicityAndRace() {
        const patient = {
            ...randomPatient(),
            ...{
                extension: [
                    {
                        extension: [
                            {
                                url: 'ombCategory',
                                valueCoding: {
                                    system: 'urn:oid:2.16.840.1.113883.6.238',
                                    code: raceCode,
                                    display: 'White',
                                },
                            },
                            {
                                url: 'text',
                                valueString: 'Caucasian',
                            },
                        ],
                        url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race',
                    },
                    {
                        extension: [
                            {
                                url: 'detailed',
                                valueCoding: {
                                    system: 'urn:oid:2.16.840.1.113883.6.238',
                                    code: ethnicityCode,
                                    display: 'Mexican',
                                },
                            },
                            {
                                url: 'text',
                                valueString: 'Hispanic',
                            },
                        ],
                        url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity',
                    },
                ],
            },
        };
        return patient;
    }

    const noTextFieldErrorResponse = {
        status: 400,
        data: {
            resourceType: 'OperationOutcome',
            text: {
                status: 'generated',
                div: '<div xmlns="http://www.w3.org/1999/xhtml"><h1>Operation Outcome</h1><table border="0"><tr><td style="font-weight: bold;">error</td><td>[]</td><td><pre>Patient.extension[0].extension[1] - The property extension must be an Array, not null (at Patient.extension[0].extension[1])\nPatient.extension[1].extension[1] - The property extension must be an Array, not null (at Patient.extension[1].extension[1])\nPatient.extension[0] - Extension.extension:text: minimum required = 1, but only found 0 (from http://hl7.org/fhir/us/core/StructureDefinition/us-core-race)\nPatient.extension[1] - Extension.extension:text: minimum required = 1, but only found 0 (from http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity)</pre></td></tr></table></div>',
            },
            issue: [
                {
                    severity: 'error',
                    code: 'invalid',
                    diagnostics:
                        'Patient.extension[0].extension[1] - The property extension must be an Array, not null (at Patient.extension[0].extension[1])\nPatient.extension[1].extension[1] - The property extension must be an Array, not null (at Patient.extension[1].extension[1])\nPatient.extension[0] - Extension.extension:text: minimum required = 1, but only found 0 (from http://hl7.org/fhir/us/core/StructureDefinition/us-core-race)\nPatient.extension[1] - Extension.extension:text: minimum required = 1, but only found 0 (from http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity)',
                },
            ],
        },
    };

    describe('Updating patient', () => {
        let patientId = '';
        beforeAll(async () => {
            const patient = getRandomPatientWithEthnicityAndRace();
            jest.spyOn(client, 'post').mockImplementationOnce(() => Promise.resolve({ data: { id: 'Testing12345'} }));            
            const { data } = await client.post('Patient', patient);
            patientId = data.id;
        });

        beforeEach(() => {
            jest.resetAllMocks();
        });

        test('valid US Core patient', async () => {
            const patient = getRandomPatientWithEthnicityAndRace();
            patient.id = patientId;

            jest.spyOn(client, 'put').mockImplementationOnce(() => Promise.resolve(
                { 
                    status: 200,
                    data: patient 
                }
            ));

            await expect(client.put(`Patient/${patientId}`, patient)).resolves.toMatchObject({
                status: 200,
                data: patient,
            });
        });

        test('invalid US Core patient: no text field', async () => {
            const patient = getRandomPatientWithEthnicityAndRace();
            patient.id = patientId;

            // Remove text field
            delete patient.extension[0].extension[1];
            delete patient.extension[1].extension[1];

            jest.spyOn(client, 'put').mockImplementationOnce(() => Promise.reject(
                {
                    response: noTextFieldErrorResponse
                }
            ));

            await expect(client.put(`Patient/${patientId}`, patient)).rejects.toMatchObject({
                response: noTextFieldErrorResponse,
            });
        });
    });

    describe('Creating patient', () => {
        beforeEach(() => {
            jest.resetAllMocks();
        });
        
        test('valid US Core patient', async () => {
            const patient = getRandomPatientWithEthnicityAndRace();

            const expectedPatient: any = cloneDeep(patient);
            delete expectedPatient.id;

            jest.spyOn(client, 'post').mockImplementationOnce(() => Promise.resolve(
                {
                    status: 201,
                    data: expectedPatient
                }
            ));

            await expect(client.post('Patient', patient)).resolves.toMatchObject({
                status: 201,
                data: expectedPatient,
            });
        });

        test('invalid US Core patient: no text field', async () => {
            const patient = getRandomPatientWithEthnicityAndRace();
            // Remove text field
            delete patient.extension[0].extension[1];
            delete patient.extension[1].extension[1];

            jest.spyOn(client, 'post').mockImplementationOnce(() => Promise.reject(
                { 
                    response: noTextFieldErrorResponse
                }
            ));

            await expect(client.post('Patient', patient)).rejects.toMatchObject({
                response: noTextFieldErrorResponse,
            });
        });
    });

    test('query using search parameters', async () => {
        const patient = getRandomPatientWithEthnicityAndRace();

        jest.spyOn(client, 'post').mockImplementationOnce(() => Promise.resolve({ data: patient }));

        const testPatient: ReturnType<typeof randomPatient> = (await client.post('Patient', patient)).data;

        // wait for the patient to be asynchronously written to ES
        await waitForExpect(
            expectResourceToBePartOfSearchResults.bind(
                null,
                client,
                {
                    url: 'Patient',
                    params: {
                        _id: testPatient.id,
                    },
                },
                testPatient,
            ),
            20000,
            3000,
        );

        const p = (params: any) => ({ url: 'Patient', params });
        const testsParams = [
            p({ race: raceCode, name: testPatient.name[0].family }),
            p({ ethnicity: ethnicityCode, name: testPatient.name[0].family }),
            p({ given: testPatient.name[0].given[0] }), // US Core "given" is functionally the same as the base FHIR "given"
        ];

        // run tests serially for easier debugging and to avoid throttling
         
        for (const testParams of testsParams) {
             
            await expectResourceToBePartOfSearchResults(client, testParams, testPatient);
        }
    });

    describe('$docref', () => {
        const basicDocumentReference = () => ({
            subject: {
                reference: 'Patient/lala',
            },
            content: [
                {
                    attachment: {
                        url: '/Binary/1-note',
                    },
                },
            ],
            type: {
                coding: [
                    {
                        system: 'http://loinc.org',
                        code: '34133-9',
                        display: 'Summary of episode note',
                    },
                ],
            },
            context: {
                period: {
                    start: '2020-12-10T00:00:00Z',
                    end: '2021-12-20T00:00:00Z',
                },
            },
            id: '8dc58795-be85-4786-9538-6835eb2bf7b8',
            resourceType: 'DocumentReference',
            status: 'current',
        });
        let patientRef: string;
        let latestCCDADocRef: any;
        let oldCCDADocRef: any;
        let otherTypeDocRef: any;

        beforeAll(async () => {
            const chance = new Chance();
            patientRef = `Patient/${chance.word({ length: 15 })}`;

            jest.spyOn(client, 'post').mockImplementationOnce(() => Promise.resolve(
                { 
                    data: {
                        ...basicDocumentReference(),
                        subject: {
                            reference: patientRef,
                        },
                        context: {
                            period: {
                                start: '2020-12-10T00:00:00Z',
                                end: '2020-12-20T00:00:00Z',
                            },
                        },
                    }
                }
            ));

             
            latestCCDADocRef = (
                await client.post('DocumentReference', {
                    ...basicDocumentReference(),
                    subject: {
                        reference: patientRef,
                    },
                    context: {
                        period: {
                            start: '2020-12-10T00:00:00Z',
                            end: '2020-12-20T00:00:00Z',
                        },
                    },
                })
            ).data;

            jest.spyOn(client, 'post').mockImplementationOnce(() => Promise.resolve(
                {
                    data: {
                        ...basicDocumentReference(),
                        subject: {
                            reference: patientRef,
                        },
                        context: {
                            period: {
                                start: '2010-12-10T00:00:00Z',
                                end: '2010-12-20T00:00:00Z',
                            },
                        },
                    }
                }
            ));
             
            oldCCDADocRef = (
                await client.post('DocumentReference', {
                    ...basicDocumentReference(),
                    subject: {
                        reference: patientRef,
                    },
                    context: {
                        period: {
                            start: '2010-12-10T00:00:00Z',
                            end: '2010-12-20T00:00:00Z',
                        },
                    },
                })
            ).data;

            jest.spyOn(client, 'post').mockImplementationOnce(() => Promise.resolve(
                {
                    data: {
                        ...basicDocumentReference(),
                        subject: {
                            reference: patientRef,
                        },
                        type: {
                            coding: [
                                {
                                    system: 'http://fwoa-codes.org',
                                    code: '1111',
                                },
                            ],
                        },
                    }
                }
            ));

            otherTypeDocRef = (
                await client.post('DocumentReference', {
                    ...basicDocumentReference(),
                    subject: {
                        reference: patientRef,
                    },
                    type: {
                        coding: [
                            {
                                system: 'http://fwoa-codes.org',
                                code: '1111',
                            },
                        ],
                    },
                })
            ).data;

            // wait for resource to be asynchronously written to ES
            await waitForResourceToBeSearchable(client, otherTypeDocRef);
        });

        beforeEach(() => {
            jest.resetAllMocks();
        });

        test('minimal params', async () => {

            const mockClient = jest.spyOn(client, 'get').mockImplementationOnce(() => Promise.resolve(
                { 
                    data: {
                        resourceType: 'Bundle',
                        entry: [
                            latestCCDADocRef
                        ]
                    }
                }
            ));

            const docrefResponse = (await client.get('DocumentReference/$docref', { params: { patient: patientRef } }))
                .data;

            expect(mockClient).toHaveBeenCalledWith('DocumentReference/$docref', { params: { patient: patientRef } });
            expectResourceToBeInBundle(latestCCDADocRef, docrefResponse);
            expectResourceToNotBeInBundle(oldCCDADocRef, docrefResponse);
            expectResourceToNotBeInBundle(otherTypeDocRef, docrefResponse);
        });

        test('date params', async () => {
            const mockClient = jest.spyOn(client, 'get').mockImplementationOnce(() => Promise.resolve(
                { 
                    data: {
                        resourceType: 'Bundle',
                        entry: [
                            latestCCDADocRef,
                            oldCCDADocRef
                        ]
                    }
                }
            ));

            const docrefResponse = (
                await client.get('DocumentReference/$docref', {
                    params: { patient: patientRef, start: '1999-01-01', end: '2030-01-01' },
                })
            ).data;

            expect(mockClient).toHaveBeenCalledWith('DocumentReference/$docref', { params: { patient: patientRef, start: '1999-01-01', end: '2030-01-01' } });
            expectResourceToBeInBundle(latestCCDADocRef, docrefResponse);
            expectResourceToBeInBundle(oldCCDADocRef, docrefResponse);
            expectResourceToNotBeInBundle(otherTypeDocRef, docrefResponse);
        });

        test('POST document type params', async () => {
            jest.spyOn(client, 'post').mockImplementationOnce(() => Promise.resolve(
                { 
                    data: {
                        resourceType: 'Bundle',
                        entry: [
                            otherTypeDocRef
                        ]
                    }
                }
            ));

            const docrefResponse = (
                await client.post('DocumentReference/$docref', {
                    resourceType: 'Parameters',
                    parameter: [
                        {
                            name: 'patient',
                            valueId: patientRef,
                        },
                        {
                            name: 'codeableConcept',
                            valueCodeableConcept: {
                                coding: {
                                    system: 'http://fwoa-codes.org',
                                    code: '1111',
                                },
                            },
                        },
                    ],
                })
            ).data;

            expectResourceToBeInBundle(otherTypeDocRef, docrefResponse);
        });

        test('missing required params', async () => {
            jest.spyOn(client, 'get').mockImplementationOnce(() => Promise.reject(
                {
                    response: { status: 400 },
                }
            ));

            await expect(() => client.get('DocumentReference/$docref')).rejects.toMatchObject({
                response: { status: 400 },
            });
        });

        test('bad extra params', async () => {
            jest.spyOn(client, 'get').mockImplementationOnce(() => Promise.reject(
                {
                    response: { status: 400 },
                }
            ));

            await expect(() =>
                client.get('DocumentReference/$docref', { params: { patient: patientRef, someBadParam: 'someValue' } }),
            ).rejects.toMatchObject({
                response: { status: 400 },
            });
        });
    });
});
