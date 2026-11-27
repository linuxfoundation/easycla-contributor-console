// Copyright The Linux Foundation and each contributor to CommunityBridge.
// SPDX-License-Identifier: MIT

import { TestBed } from '@angular/core/testing';

import { ClaContributorService } from './cla-contributor.service';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { of } from 'rxjs';
import { AlertService } from 'src/app/shared/services/alert.service';
import { RouterTestingModule } from '@angular/router/testing';
import { StorageService } from 'src/app/shared/services/storage.service';
import { AppSettings } from 'src/app/config/app-settings';

describe('ClaContributorService', () => {
    let service: ClaContributorService;
    let storageService: StorageService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [RouterTestingModule, HttpClientModule],
            providers: [AlertService, StorageService]
        });
        service = TestBed.inject(ClaContributorService);
        storageService = TestBed.inject(StorageService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('getOrgLens', () => {
        it('asks the v3 API for the lens of the company and CLA Group', () => {
            const httpClient = TestBed.inject(HttpClient);
            spyOn(httpClient, 'get').and.returnValue(of({}));

            service.getOrgLens('00000000-0000-4000-8000-000000000000', '00000000-0000-4000-8000-000000000001').subscribe();

            expect(httpClient.get).toHaveBeenCalledOnceWith(
                new URL(service.baseURL + '/v3/company/00000000-0000-4000-8000-000000000000' +
                    '/cla-group/00000000-0000-4000-8000-000000000001/org-lens').toString()
            );
        });
    });

    describe('getLFXCorporateURL', () => {
        const repo = (repository_name: string) => ({ repository_name });
        const sfProject = (project_sfid: string, repos: any[] = []) => ({
            project_sfid,
            foundation_sfid: 'FOUNDATION_SFID',
            github_repos: repos,
            gitlab_repos: [],
            gerrit_repos: []
        });

        // Stubs the two localStorage keys the method reads: the CLA Group and the redirect URL
        // the contributor arrived with.
        const givenStoredState = (claGroup: any, redirect: string | null) => {
            spyOn(storageService, 'getItem').and.callFake((key: string): any => {
                if (key === AppSettings.PROJECT) {
                    return JSON.stringify(claGroup);
                }
                if (key === AppSettings.REDIRECT) {
                    return JSON.stringify(redirect);
                }
                return null;
            });
        };

        it('redirects to the company dashboard when the CLA Group has no SF projects', () => {
            givenStoredState({ foundation_sfid: 'FOUNDATION_SFID', projects: [], signed_at_foundation_level: false }, 'https://github.com/org/repo/pull/1');

            expect(service.getLFXCorporateURL()).toBe(service.corporateV2Base + 'company/dashboard');
        });

        it('redirects to the foundation CLA page when the CLA Group maps the foundation itself', () => {
            givenStoredState({
                foundation_sfid: 'FOUNDATION_SFID',
                projects: [sfProject('FOUNDATION_SFID')],
                signed_at_foundation_level: true
            }, 'https://github.com/org/repo/pull/1');

            expect(service.getLFXCorporateURL()).toBe(service.corporateV2Base + 'foundation/FOUNDATION_SFID/cla');
        });

        // A foundation-level CLA Group spanning many projects, reached without a repository match.
        // Previously threw a TypeError, because the foundation-level condition dereferenced the
        // unmatched (null) project before the null check below it.
        it('redirects to the foundation CLA page when signed at foundation level and the repository is unmatched', () => {
            givenStoredState({
                foundation_sfid: 'FOUNDATION_SFID',
                projects: [
                    sfProject('SUB_PROJECT_SFID', [repo('org/sub')]),
                    sfProject('FOUNDATION_SFID')
                ],
                signed_at_foundation_level: true
            }, 'https://app.lfx.dev/profile/clas');

            expect(service.getLFXCorporateURL()).toBe(service.corporateV2Base + 'foundation/FOUNDATION_SFID/cla');
        });

        // This CLA Group maps the foundation itself, so the CLA lives on the foundation and a
        // matched sub-project does not override it.
        it('redirects to the foundation CLA page when the CLA Group maps the foundation even if the repository matches a sub-project', () => {
            givenStoredState({
                foundation_sfid: 'FOUNDATION_SFID',
                projects: [
                    sfProject('SUB_PROJECT_SFID', [repo('org/repo')]),
                    sfProject('FOUNDATION_SFID')
                ],
                signed_at_foundation_level: true
            }, 'https://github.com/org/repo/pull/1');

            expect(service.getLFXCorporateURL()).toBe(service.corporateV2Base + 'foundation/FOUNDATION_SFID/cla');
        });

        // signed_at_foundation_level is computed per foundation, not per CLA Group: the backend
        // queries every CLA Group sharing the foundation SFID, so a child CLA Group inherits true
        // whenever a sibling under the same foundation is foundation-level. This group maps only
        // sub-projects, so its CLA lives on a project and must not route to the foundation.
        it('does not redirect to the foundation CLA page for a child CLA Group that inherits the flag', () => {
            givenStoredState({
                foundation_sfid: 'FOUNDATION_SFID',
                projects: [sfProject('CHILD_PROJECT_SFID', [repo('org/repo')])],
                signed_at_foundation_level: true
            }, 'https://github.com/org/repo/pull/1');

            expect(service.getLFXCorporateURL())
                .toBe(service.corporateV2Base + 'foundation/FOUNDATION_SFID/project/CHILD_PROJECT_SFID/cla');
        });

        // The same child CLA Group reached from Self Serve, where no repository match is possible.
        it('falls back to the only project for a child CLA Group reached without a repository match', () => {
            givenStoredState({
                foundation_sfid: 'FOUNDATION_SFID',
                projects: [sfProject('CHILD_PROJECT_SFID', [repo('org/repo')])],
                signed_at_foundation_level: true
            }, 'https://app.lfx.dev/profile/clas');

            expect(service.getLFXCorporateURL())
                .toBe(service.corporateV2Base + 'foundation/FOUNDATION_SFID/project/CHILD_PROJECT_SFID/cla');
        });

        it('redirects to the project matching the repository the contributor came from', () => {
            givenStoredState({
                foundation_sfid: 'FOUNDATION_SFID',
                projects: [
                    sfProject('OTHER_SFID', [repo('org/other')]),
                    sfProject('MATCHED_SFID', [repo('org/repo')])
                ],
                signed_at_foundation_level: false
            }, 'https://github.com/org/repo/pull/1');

            expect(service.getLFXCorporateURL())
                .toBe(service.corporateV2Base + 'foundation/FOUNDATION_SFID/project/MATCHED_SFID/cla');
        });

        // Contributors arriving from LFX Self Serve carry a console URL, not a repository URL,
        // so the repository match can never succeed for them.
        it('falls back to the only project when the redirect is not a repository URL', () => {
            givenStoredState({
                foundation_sfid: 'FOUNDATION_SFID',
                projects: [sfProject('ONLY_SFID', [repo('org/repo')])],
                signed_at_foundation_level: false
            }, 'https://app.lfx.dev/profile/clas');

            expect(service.getLFXCorporateURL())
                .toBe(service.corporateV2Base + 'foundation/FOUNDATION_SFID/project/ONLY_SFID/cla');
        });

        it('falls back to the company dashboard when the repository is unmatched and the CLA Group spans several projects', () => {
            givenStoredState({
                foundation_sfid: 'FOUNDATION_SFID',
                projects: [
                    sfProject('FIRST_SFID', [repo('org/first')]),
                    sfProject('SECOND_SFID', [repo('org/second')])
                ],
                signed_at_foundation_level: false
            }, 'https://app.lfx.dev/profile/clas');

            expect(service.getLFXCorporateURL()).toBe(service.corporateV2Base + 'company/dashboard');
        });

        it('never returns an empty URL when no redirect was stored', () => {
            givenStoredState({
                foundation_sfid: 'FOUNDATION_SFID',
                projects: [sfProject('ONLY_SFID', [repo('org/repo')])],
                signed_at_foundation_level: false
            }, null);

            expect(service.getLFXCorporateURL()).toBe(service.corporateV2Base + 'foundation/FOUNDATION_SFID/project/ONLY_SFID/cla');
        });
    });
});
