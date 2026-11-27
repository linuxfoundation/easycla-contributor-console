// Copyright The Linux Foundation and each contributor to CommunityBridge.
// SPDX-License-Identifier: MIT

import {Injectable, isDevMode} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, Subject} from 'rxjs';
import {Project, ProjectModel} from '../models/project';
import {UpdateUserModel, UserModel, UserFromTokenModel} from '../models/user';
import {AlertService} from 'src/app/shared/services/alert.service';
import {ActiveSignatureModel} from '../models/active-signature';
import {IndividualRequestSignatureModel} from '../models/individual-request-signature';
import {ClearBitModel, CompanyModel, OrganizationListModel, OrganizationModel} from '../models/organization';
import {EmployeeSignatureModel} from '../models/employee-signature';
import {InviteCompanyModel} from '../models/invite-company';
import {CLAManagersModel} from '../models/cla-manager';
import {AppSettings} from 'src/app/config/app-settings';
import {StorageService} from 'src/app/shared/services/storage.service';
import {GerritUserModel} from '../models/gerrit';
import {CompanyAdminDesigneeModel, CompnayAdminListModel} from '../models/company-admin-designee';
import {OrgLensModel} from '../models/org-lens';
import {EnvConfig} from 'src/app/config/cla-env-utils';

declare const require: any;
const FileSaver = require('file-saver');

@Injectable({
  providedIn: 'root'
})
export class ClaContributorService {
  public openDialogModalEvent = new Subject<any>();

  localTesting = false;
  baseURL: string = EnvConfig.default['api-base'];
  v4BaseUrl: string = EnvConfig.default['api-v4-base'];
  corporateV2Base: string = EnvConfig.default['corporate-v2-base'] + '/';

  v1ClaAPIURLLocal = 'http://localhost:5000';
  v2ClaAPIURLLocal = 'http://localhost:5000';
  v3ClaAPIURLLocal = 'http://localhost:8080';
  v4ClaAPIURLLocal = 'http://localhost:8080';

  constructor(
    private httpClient: HttpClient,
    private alertService: AlertService,
    private storageService: StorageService,
  ) {
    // Determine if we're running in a local services (developer) mode - the USE_LOCAL_SERVICES environment variable
    // will be set to 'true', otherwise we're using normal services deployed in each environment
    // const localServicesMode = (process.env.USE_LOCAL_SERVICES || 'false').toLowerCase() === 'true';
    if (isDevMode()) {
      console.log('Running in local services mode');
    } else {
      console.log('Running in deployed services mode');
    }
    // this.localTesting = isDevMode();
  }


  getUser(userId: string): Observable<UserModel> {
    // LG:TODO
    const url = this.getV2Endpoint('/v2/user/' + userId);
    // const url = this.getV3Endpoint('/v3/user-compat/' + userId);
    return this.httpClient.get<UserModel>(url);
  }

  getUserFromToken(): Observable<UserFromTokenModel> {
    const url = this.getV4Endpoint('/v4/user-from-token');
    return this.httpClient.get<UserFromTokenModel>(url);
  }

  updateUser(data: any): Observable<UpdateUserModel> {
    const url = this.getV3Endpoint('/v3/users');
    return this.httpClient.put<UpdateUserModel>(url, data);
  }

  getProject(projectId: string): Observable<ProjectModel> {
    // LG:TODO
    const url = this.getV2Endpoint('/v2/project/' + projectId);
    // const url = this.getV4Endpoint('/v4/project-compat/' + projectId);
    return this.httpClient.get<ProjectModel>(url);
  }

  getUserActiveSignature(userId: string): Observable<ActiveSignatureModel> {
    // LG:TODO
    const url = this.getV2Endpoint('/v2/user/' + userId + '/active-signature');
    // const url = this.getV4Endpoint('/v4/user/' + userId + '/active-signature');
    return this.httpClient.get<ActiveSignatureModel>(url);
  }

  searchOrganization(organizationName: string, organizationWebsite?: string): Observable<OrganizationListModel> {
    let url = this.getV3Endpoint('/v3/organization/search?');
    if (organizationName) {
      url += 'companyName=' + organizationName;
    }
    if (organizationWebsite) {
      url += 'websiteName=' + organizationWebsite;
    }
    url += '&include-signing-entity-name=false';
    return this.httpClient.get<OrganizationListModel>(url);
  }

  getClearBitData(organizationWebsite: string): Observable<ClearBitModel> {
    const url = this.getV4Endpoint('/v4/company/lookup?websiteName=' + organizationWebsite);
    return this.httpClient.get<ClearBitModel>(url);
  }

  hasOrganizationExist(organizationName: string, organizationWebsite: string): Observable<OrganizationListModel> {
    let url = this.getV3Endpoint('/v3/organization/search?');
    if (organizationName) {
      url += '$filter=name eq ' + organizationName;
    }
    if (organizationWebsite) {
      url += '$filter=website eq ' + organizationWebsite;
    }
    return this.httpClient.get<OrganizationListModel>(url);
  }

  getOrganizationDetails(companySFID: string): Observable<OrganizationModel> {
    const url = this.getV3Endpoint('/v3/company/external/' + companySFID);
    return this.httpClient.get<OrganizationModel>(url);
  }

  getSigningEntityNameDetails(signingEntityName: string, companySFID: string): Observable<OrganizationModel> {
    const url = this.getV3Endpoint('/v3/company/signing-entity-name?name=' + signingEntityName + '&companySFID=' + companySFID);
    return this.httpClient.get<OrganizationModel>(url);
  }

  postIndividualSignatureRequest(data: any): Observable<IndividualRequestSignatureModel> {
    const url = this.getV4Endpoint('/v4/request-individual-signature');
    return this.httpClient.post<IndividualRequestSignatureModel>(url, data);
  }

  CheckPreparedEmployeeSignature(data: any): Observable<any> {
    const url = this.getV2Endpoint('/v2/check-prepare-employee-signature');
    return this.httpClient.post<any>(url, data);
  }

  postEmployeeSignatureRequest(signatureRequest: any): Observable<EmployeeSignatureModel> {
    const url = this.getV2Endpoint('/v2/request-employee-signature');
    return this.httpClient.post<EmployeeSignatureModel>(url, signatureRequest);
  }

  getLastIndividualSignature(userId: string, projectId: string): Observable<any> {
    const url = this.getV2Endpoint('/v2/user/' + userId + '/project/' + projectId + '/last-signature');
    return this.httpClient.get<InviteCompanyModel>(url);
  }

  getGerritUserInfo(): Observable<GerritUserModel> {
    const url = this.getV1Endpoint('/v1/user/gerrit');
    return this.httpClient.post<GerritUserModel>(url, '');
  }

  getGerritProjectInfo(projectId: string): Observable<ProjectModel> {
    // LG:TODO
    const url = this.getV2Endpoint('/v2/project/' + projectId);
    // const url = this.getV4Endpoint('/v4/project-compat/' + projectId);
    return this.httpClient.get<ProjectModel>(url);
  }

  inviteManager(userLFID: string, data: any): Observable<CompanyAdminDesigneeModel> {
    const url = this.getV4Endpoint('/v4/user/' + userLFID + '/invite-company-admin');
    return this.httpClient.post<CompanyAdminDesigneeModel>(url, data);
  }

  getProjectCLAManagers(projectId: string, companyId: string): Observable<CLAManagersModel> {
    const url = this.getV4Endpoint('/v4/company/' + companyId + '/cla-group/' + projectId + '/cla-managers');
    return this.httpClient.get<CLAManagersModel>(url);
  }

  addCompany(userId: string, data: any): Observable<CompanyModel> {
    const url = this.getV4Endpoint('/v4/user/' + userId + '/company');
    return this.httpClient.post<CompanyModel>(url, data);
  }

  getCompanyAdminList(companySFID: string): Observable<CompnayAdminListModel> {
    const url = this.getV4Endpoint('/v4/company/' + companySFID + '/admin');
    return this.httpClient.get<CompnayAdminListModel>(url);
  }

  addAsCLAManagerDesignee(companyId: string, projectId: string, data: any): Observable<any> {
    const url = this.getV4Endpoint('/v4/company/' + companyId + '/claGroup/' + projectId + '/cla-manager-designee');
    return this.httpClient.post<any>(url, data);
  }

  getOrgLens(companyId: string, claGroupId: string): Observable<OrgLensModel> {
    const url = this.getV3Endpoint('/v3/company/' + companyId + '/cla-group/' + claGroupId + '/org-lens');
    return this.httpClient.get<OrgLensModel>(url);
  }

  hasRoleAssigned(companyId: string, projectId: string, userLFID: string): Observable<any> {
    const url = this.getV4Endpoint('/v4/company/' + companyId + '/user/' + userLFID + '/claGroupID/' + projectId + '/is-cla-manager-designee');
    return this.httpClient.get<any>(url);
  }

  notifyCLAMangers(data: any): Observable<any> {
    const url = this.getV4Endpoint('/v4/notify-cla-managers');
    return this.httpClient.post<any>(url, data);
  }

  handleError(errorObj: any) {
    const errors = errorObj.error.errors;
    if (errors) {
      for (const property in errors) {
        if (property) {
          const errorMsg = property + ': ' + errors[property];
          this.alertService.error(errorMsg);
        }
      }
    }
  }

  getUserLFID(): string {
    const hasGerrit = JSON.parse(this.storageService.getItem(AppSettings.HAS_GERRIT));
    const userModel: UserModel = JSON.parse(this.storageService.getItem(AppSettings.USER));
    const gerritUserModel: GerritUserModel = JSON.parse(this.storageService.getItem(AppSettings.AUTH_DATA));
    if (hasGerrit) {
      return gerritUserModel.lf_username;
    } else {
      return userModel.lf_username;
    }
  }

  getLFXCorporateURL(): string {
    // Load the CLA Group models from local storage - should only be 1 CLA Group
    const claGroupModel: ProjectModel = JSON.parse(this.storageService.getItem(AppSettings.PROJECT));
    // We may have zero or more SF Projects attached to this CLA Group
    const projectDetails = claGroupModel.projects;

    // No SF Projects for this CLA Group
    if (projectDetails.length === 0) {
      // No SFID associated with project so redirect at corporate console dashboard.
      return this.corporateV2Base + 'company/dashboard';
    }

    // Signed at foundation level - the CLA lives on the foundation, not on an individual project.
    // Derive this from the CLA Group's own mappings rather than signed_at_foundation_level: the
    // backend computes that flag per *foundation* (SignedAtFoundationLevel queries every CLA Group
    // sharing the foundation SFID), so a child CLA Group inherits true whenever any sibling under
    // the same foundation is foundation-level. projectDetails is scoped to this CLA Group alone.
    const foundationEntry = projectDetails.find((p) => p.project_sfid === claGroupModel.foundation_sfid);
    if (foundationEntry) {
      return this.corporateV2Base + 'foundation/' + foundationEntry.foundation_sfid + '/cla';
    }

    // Pick the SF Project matching the repository the contributor came from. This only resolves
    // when the stored redirect is a repository URL, i.e. when arriving from a PR/MR check.
    // Contributors arriving from LFX Self Serve carry a console URL instead, which never matches.
    const project = this.getProjectFromRepo(projectDetails) || (projectDetails.length === 1 ? projectDetails[0] : null);
    if (project !== null) {
      // For standalone project we must redirect to the SFID of The Linux Foundation
      return this.corporateV2Base + 'foundation/' + project.foundation_sfid + '/project/' + project.project_sfid + '/cla';
    }

    // The repository could not be matched against any of this CLA Group's projects and the CLA
    // Group spans several of them, so there is no single project page to land on. Fall back to
    // the company dashboard rather than leaving the contributor with no way forward.
    return this.corporateV2Base + 'company/dashboard';
  }

  getProjectFromRepo(projects: Project[]) {
    const repoURL = JSON.parse(this.storageService.getItem(AppSettings.REDIRECT));
    if (repoURL) {
      for (const project of projects) {
        // Checked in Github Repo
        if (project.github_repos.length > 0) {
          const repos = project.github_repos;
          for (const repo of repos) {
            if (repoURL.indexOf(repo.repository_name) >= 0) {
              return project;
            }
          }
        }

        // Checked in Gitlab Repo
        if (project.gitlab_repos.length > 0) {
          const repos = project.gitlab_repos;
          for (const repo of repos) {
            if (repoURL.indexOf(repo.repository_name) >= 0) {
              return project;
            }
          }
        }

        // Checked in Gerrit Repo
        if (project.gerrit_repos.length > 0) {
          const repos = project.gerrit_repos;
          for (const repo of repos) {
            if (repoURL.indexOf(repo.gerrit_url) >= 0) {
              return project;
            }
          }
        }
      }
    }
    return null;
  }

  getUserPublicEmail(): string {
    const hasGerrit = JSON.parse(this.storageService.getItem(AppSettings.HAS_GERRIT));
    const userModel: UserModel = JSON.parse(this.storageService.getItem(AppSettings.USER));
    const gerritUserModel: GerritUserModel = JSON.parse(this.storageService.getItem(AppSettings.USER));
    let emails;
    if (hasGerrit) {
      return gerritUserModel.lf_email;
    } else {
      if (userModel.lf_email) {
        return userModel.lf_email;
      }
      emails = userModel.user_emails;
    }
    return this.findPublicEmail(emails);
  }

  findPublicEmail(emailArray) {
    for (const email of emailArray) {
      if (email.indexOf(AppSettings.GITHUB_EMAIL_CONTENT) < 0) {
        return email;
      }
    }
    return null;
  }

  downloadFile(projectId: string, claType: string) {
    const url = this.getV4Endpoint('/v4/template/' + projectId + '/preview?watermark=true&claType=' + claType);
    let fileName = claType === 'icla' ? 'Individual_Contributor' : 'Corporate_Contributor';
    fileName += '_License_Agreement.pdf';
    this.saveAs(url, fileName);
  }

  saveAs(URLToPDF, fileName) {
    const oReq = new XMLHttpRequest();
    oReq.open('GET', URLToPDF, true);
    oReq.responseType = 'blob';
    oReq.onload = () => {
      const file = new Blob([oReq.response], {
        type: 'application/pdf'
      });
      FileSaver.saveAs(file, fileName);
    };

    oReq.send();
  }

  public getTypeByUrl(): string {
    const redirectUrl = JSON.parse(
      this.storageService.getItem(AppSettings.REDIRECT)
    );
    if (redirectUrl) {
      if (redirectUrl.indexOf(AppSettings.GITHUB_DOMAIN) >= 0) {
        return AppSettings.GITHUB;
      }
      if (redirectUrl.indexOf(AppSettings.GITLAB_DOMAIN) >= 0) {
        return AppSettings.GITLAB;
      }
    }
    return AppSettings.GITHUB;
  }

  /**
   * Constructs a URL based on the path and endpoint host:port.
   * @param path the URL path
   * @returns a URL to the V1 endpoint with the specified path. If running in local mode, the endpoint will point to a
   * local host:port - otherwise the endpoint will point the appropriate environment endpoint running in the cloud.
   */
  private getV1Endpoint(path: string): string {
    let url: URL;
    if (this.localTesting) {
      url = new URL(this.v1ClaAPIURLLocal + path);
    } else {
      url = new URL(this.baseURL + path);
    }
    return url.toString();
  }

  /**
   * Constructs a URL based on the path and endpoint host:port.
   * @param path the URL path
   * @returns a URL to the V2 endpoint with the specified path. If running in local mode, the endpoint will point to a
   * local host:port - otherwise the endpoint will point the appropriate environment endpoint running in the cloud.
   */
  private getV2Endpoint(path: string): string {
    let url: URL;
    if (this.localTesting) {
      url = new URL(this.v2ClaAPIURLLocal + path);
    } else {
      url = new URL(this.baseURL + path);
    }
    return url.toString();
  }

  /**
   * Constructs a URL based on the path and endpoint host:port.
   * @param path the URL path
   * @returns a URL to the V3 endpoint with the specified path. If running in local mode, the endpoint will point to a
   * local host:port - otherwise the endpoint will point the appropriate environment endpoint running in the cloud.
   */
  private getV3Endpoint(path: string): string {
    let url: URL;
    if (this.localTesting) {
      url = new URL(this.v3ClaAPIURLLocal + path);
    } else {
      url = new URL(this.baseURL + path);
    }
    return url.toString();
  }

  /**
   * Constructs a URL based on the path and endpoint host:port.
   * @param path the URL path
   * @returns a URL to the V4 endpoint with the specified path. If running in local mode, the endpoint will point to a
   * local host:port - otherwise the endpoint will point the appropriate environment endpoint running in the cloud.
   */
  private getV4Endpoint(path: string): string {
    let url: URL;
    if (this.localTesting) {
      url = new URL(this.v4ClaAPIURLLocal + path);
    } else {
      url = new URL(this.v4BaseUrl + path);
    }
    return url.toString();
  }
}
