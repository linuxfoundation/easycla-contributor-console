// Copyright The Linux Foundation and each contributor to CommunityBridge.
// SPDX-License-Identifier: MIT

import { HttpErrorResponse } from '@angular/common/http';
import { existingCompanySFID } from './company-conflict';

const SFID = '001000000000000AAA';
const EASYCLA_ID = '00000000-0000-4000-8000-000000000000';

function httpError(status: number, error: any): HttpErrorResponse {
  return new HttpErrorResponse({ status, error });
}

describe('existingCompanySFID', () => {
  it('returns companyExternalID from a 409 that names the existing company', () => {
    const exception = httpError(409, {
      Message: 'organization already exists',
      companyID: EASYCLA_ID,
      companyExternalID: SFID,
      companyName: 'Example Org',
      signingEntityName: 'Example Org',
    });
    expect(existingCompanySFID(exception)).toBe(SFID);
  });

  it('never falls back to companyID', () => {
    const exception = httpError(409, {
      Message: 'organization already exists',
      companyID: EASYCLA_ID,
    });
    expect(existingCompanySFID(exception)).toBeNull();
  });

  it('returns null for a 409 without company ids', () => {
    const exception = httpError(409, {
      Code: 'company_create_in_progress',
      Message: 'a company is already being created for this website',
    });
    expect(existingCompanySFID(exception)).toBeNull();
  });

  it('returns null for an empty or blank companyExternalID', () => {
    expect(existingCompanySFID(httpError(409, { companyExternalID: '' }))).toBeNull();
    expect(existingCompanySFID(httpError(409, { companyExternalID: '   ' }))).toBeNull();
  });

  it('returns null for a 409 with no body', () => {
    expect(existingCompanySFID(httpError(409, null))).toBeNull();
  });

  it('returns null for a non-409 even when it carries an id', () => {
    expect(existingCompanySFID(httpError(400, { companyExternalID: SFID }))).toBeNull();
  });
});
