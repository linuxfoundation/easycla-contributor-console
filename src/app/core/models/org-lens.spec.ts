// Copyright The Linux Foundation and each contributor to CommunityBridge.
// SPDX-License-Identifier: MIT

import { orgLensRedirectURL } from './org-lens';

const LENS_URL = 'https://app.example.org/org/001000000000000AAA/easycla/00000000-0000-4000-8000-000000000001';

describe('orgLensRedirectURL', () => {
  it('returns the lens URL when the backend returns one', () => {
    expect(orgLensRedirectURL({ orgLensURL: LENS_URL })).toBe(LENS_URL);
  });

  it('trims surrounding whitespace', () => {
    expect(orgLensRedirectURL({ orgLensURL: '  ' + LENS_URL + ' ' })).toBe(LENS_URL);
  });

  it('returns null for an empty, blank or missing orgLensURL', () => {
    expect(orgLensRedirectURL({ orgLensURL: '' })).toBeNull();
    expect(orgLensRedirectURL({ orgLensURL: '   ' })).toBeNull();
    expect(orgLensRedirectURL({})).toBeNull();
    expect(orgLensRedirectURL(null)).toBeNull();
  });

  it('returns null for anything that is not an absolute https URL', () => {
    expect(orgLensRedirectURL({ orgLensURL: 'http://app.example.org/org/x/easycla/y' })).toBeNull();
    expect(orgLensRedirectURL({ orgLensURL: 'javascript:alert(1)' })).toBeNull();
    expect(orgLensRedirectURL({ orgLensURL: '/org/x/easycla/y' })).toBeNull();
  });
});
