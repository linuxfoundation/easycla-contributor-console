// Copyright The Linux Foundation and each contributor to CommunityBridge.
// SPDX-License-Identifier: MIT

import { HttpErrorResponse } from '@angular/common/http';

export interface CompanyConflictModel {
  Code?: string;
  Message?: string;
  companyID?: string;
  companyExternalID?: string;
  companyName?: string;
  signingEntityName?: string;
}

export function existingCompanySFID(exception: HttpErrorResponse): string | null {
  if (exception?.status !== 409) {
    return null;
  }
  const body: CompanyConflictModel = exception.error;
  const sfid = body?.companyExternalID;
  if (typeof sfid !== 'string' || sfid.trim() === '') {
    return null;
  }
  return sfid.trim();
}
