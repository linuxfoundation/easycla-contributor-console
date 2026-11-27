// Copyright The Linux Foundation and each contributor to CommunityBridge.
// SPDX-License-Identifier: MIT

export interface OrgLensModel {
  companyID?: string;
  companySFID?: string;
  claGroupID?: string;
  foundationSFID?: string;
  orgLensURL?: string;
}

export function orgLensRedirectURL(response: OrgLensModel): string | null {
  const value = response?.orgLensURL;
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}
