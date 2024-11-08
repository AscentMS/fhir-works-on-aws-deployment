/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { handleDdbToEsEvent } from 'fhir-works-on-aws-persistence-ddb';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
exports.handler = async (event: any) => {
    await handleDdbToEsEvent(event);
};
