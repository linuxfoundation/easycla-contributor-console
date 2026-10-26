// Copyright The Linux Foundation and each contributor to CommunityBridge.
// SPDX-License-Identifier: MIT

import {
  Component,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ClaContributorService } from 'src/app/core/services/cla-contributor.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PlatformLocation } from '@angular/common';
import {
  Organization,
  OrganizationListModel,
  OrganizationModel,
} from 'src/app/core/models/organization';
import { StorageService } from 'src/app/shared/services/storage.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertService } from 'src/app/shared/services/alert.service';
import { ProjectModel } from 'src/app/core/models/project';
import { AppSettings } from 'src/app/config/app-settings';
import { IntercomService } from 'src/app/shared/services/intercom.service';
import { Subscription } from 'rxjs';
import {
  groupOrganizations,
  UNSIGNED_DISPLAY_LIMIT,
} from './organization-ranking';

@Component({
  selector: 'app-corporate-dashboard',
  templateUrl: './corporate-dashboard.component.html',
  styleUrls: ['./corporate-dashboard.component.scss'],
})
export class CorporateDashboardComponent implements OnInit, OnDestroy {
  @ViewChild('configureCLAManager') configureCLAManager: TemplateRef<any>;
  @ViewChild('identifyCLAManager') identifyCLAManager: TemplateRef<any>;
  @ViewChild('addCompany') addCompany: TemplateRef<any>;
  @ViewChild('signedCLANotFoundModal') signedCLANotFoundModal: TemplateRef<any>;
  @ViewChild('successModal') successModal: TemplateRef<any>;
  @ViewChild('warningModal') warningModal: TemplateRef<any>;
  @ViewChild('errorModal') errorModal: TemplateRef<any>;

  selectedCompany: string;
  searchBoxValue: string;
  searchTimeout = null;
  projectId: string;
  userId: string;
  hasShowNoSignedCLAFoundDialog: boolean;
  hasShowDropdown: boolean;
  organization = new OrganizationModel();
  organizationList = new OrganizationListModel();
  signedOrganizations: Organization[] = [];
  unsignedOrganizations: Organization[] = [];
  unsignedTotal = 0;
  showUnsigned = false;
  form: FormGroup;
  noCompanyFound: boolean;
  minLengthValidationMsg: string;
  emptySearchError: boolean;
  hasError: boolean;
  title: string;
  message: string;
  openView: string;
  hideDialogCloseBtn: boolean;
  mySubscription: Subscription;
  proccedWithExistingOrganization: Subscription;
  attempt: boolean;
  hasTermAccepted = false;

  constructor(
    private route: ActivatedRoute,
    private claContributorService: ClaContributorService,
    private router: Router,
    private modalService: NgbModal,
    private location: PlatformLocation,
    private storageService: StorageService,
    private formBuilder: FormBuilder,
    private alertService: AlertService,
    private intercomService: IntercomService
  ) {
    this.projectId = this.route.snapshot.paramMap.get('projectId');
    this.userId = this.route.snapshot.paramMap.get('userId');
    this.openView = this.route.snapshot.queryParamMap.get('view');
    this.searchBoxValue = '';
    this.location.onPopState(() => {
      this.modalService.dismissAll();
    });
    this.mySubscription =
      this.claContributorService.openDialogModalEvent.subscribe((result) => {
        switch (result.action) {
          case 'CLA_NOT_SIGN':
            this.openWithDismiss(this.signedCLANotFoundModal);
            break;
          case 'IDENTIFY_CLA_MANAGER':
            this.openWithDismiss(this.identifyCLAManager);
            break;
          case 'BACK_TO_ADD_ORGANIZATION':
            this.openWithDismiss(this.addCompany);
            break;
          case 'RETRY_CONFIG_CLA_MANAGER':
            this.open(this.configureCLAManager);
            break;
          case 'ADD_NEW_ORGANIZATION':
            if (result.payload !== undefined && result.payload !== null) {
              if (result.payload.organization_id) {
                // If organization already exist in SF.
                this.onSelectCompany(result.payload);
                this.onClickProceed();
              } else {
                // If organization not in SF but present in clearbit.
                this.form.controls.companyName.setValue('');
                this.openWithDismiss(this.signedCLANotFoundModal);
              }
            } else {
              // Newly created organization
              this.form.controls.companyName.setValue('');
              this.openWithDismiss(this.signedCLANotFoundModal);
            }
            break;
          default:
            break;
        }
      });
  }

  ngOnInit(): void {
    this.selectedCompany = '';
    this.hasShowDropdown = false;
    this.emptySearchError = true;
    this.noCompanyFound = false;
    this.hideDialogCloseBtn = false;

    this.minLengthValidationMsg =
      'Minimum 2 characters are required to search organization name';

    this.form = this.formBuilder.group({
      companyName: [
        '',
        Validators.compose([
          Validators.required,
          Validators.minLength(2),
          Validators.pattern(new RegExp(AppSettings.NON_WHITE_SPACE_REGEX)),
        ]),
      ],
    });
    this.openAuthRedirectionModal();
    this.handledBrowserBack();
  }

  ngOnDestroy() {
    if (this.mySubscription !== undefined && this.mySubscription !== null) {
      this.mySubscription.unsubscribe();
    }
  }

  openAuthRedirectionModal() {
    setTimeout(() => {
      if (this.openView === AppSettings.SIGN_CLA) {
        window.location.href = window.location.href.split('?view=signCLA')[0];
        this.open(this.configureCLAManager);
      }
    }, 250);
  }

  onClickProceed() {
    this.storageService.removeItem(AppSettings.NEW_ORGANIZATIONS);
    this.getOrganizationInformation();
  }

  onClickAddOrganization() {
    // Clear org persist data and error messages.
    this.storageService.removeItem(AppSettings.ORGANIZATION_DETAILS);
    this.alertService.clearAlert();
    this.open(this.addCompany);
  }

  onSelectCompany(organization: Organization) {
    if (organization !== null) {
      this.hasShowDropdown = false;
      this.selectedCompany = organization.organization_id;
      this.searchBoxValue = organization.organization_name;
      this.form.controls.companyName.setValue(this.searchBoxValue);
    }
  }

  getOrganizationInformation() {
    this.claContributorService
      .getOrganizationDetails(this.selectedCompany)
      .subscribe(
        (response) => {
          this.organization = response;
          this.storageService.setItem(
            AppSettings.SELECTED_COMPANY,
            this.organization
          );
          // Do NOT block on the persisted (possibly stale) isSanctioned flag. If the company is
          // currently marked for additional trade-compliance review, show a non-blocking WARNING but still proceed to the
          // decisive step. checkEmployeeSignature() runs the live SSS check
          // (/v2/check-prepare-employee-signature), which clears a stale sss-origin block on a
          // clean result and blocks (errors.sanctioned, handled below) when it is genuinely
          // flagged. openWithDismiss() dismisses any open modal first, so the live (decisive)
          // result cleanly supersedes this warning.
          // organization.isSanctioned is typed as a string in the model; normalize so both a
          // boolean false and a literal "false" are correctly treated as not-flagged.
          if (String(this.organization.isSanctioned).toLowerCase() === 'true') {
            this.title = 'Compliance Review Required';
            this.message =
              'Heads up: this organization currently requires additional trade compliance screening review. We\'ll re-verify in the next step, and if it is still flagged you won\'t be able to acknowledge the CLA. If you believe this is an error, please contact EasyCLA Support via the chat widget.';
            this.openWithDismiss(this.warningModal);
            this.intercomService.show();
          }
          this.checkEmployeeSignature();
        },
        () => {
          this.storageService.removeItem(AppSettings.SELECTED_COMPANY);
          const companyName = this.form.controls.companyName.value;
          this.title = 'Setup Required';
          this.message =
            'The selected company ' +
            companyName +
            ' has not been fully setup.</br>' +
            ' Please contact support via the chat widget' +
            ' to get the Organization Administrator assigned. Once the Organization Administrator is assigned to ' +
            companyName +
            ' you will be able to proceed with the CLA.';
          this.openWithDismiss(this.warningModal);
          this.intercomService.show();
        }
      );
  }

  checkEmployeeSignature() {
    this.alertService.clearAlert();
    const data = {
      project_id: this.projectId,
      company_id: this.organization.companyID,
      user_id: this.userId,
    };
    this.claContributorService.CheckPreparedEmployeeSignature(data).subscribe(
      (response) => {
        if (response.errors) {
          if (
            Object.prototype.hasOwnProperty.call(response.errors, 'sanctioned')
          ) {
            // Authoritative live SSS verdict from check-prepare/request-employee-signature:
            // the company requires additional trade-compliance review (the persisted flag may
            // have been stale; this is the live result). Show the dedicated compliance message.
            this.title = 'Compliance Review Required';
            this.message =
              'We\'re sorry, but this organization requires additional trade compliance review, so the Contributor License Agreement (CLA) cannot be completed at this time. If you believe this is an error, please contact EasyCLA Support via the chat widget.';
            this.openWithDismiss(this.warningModal);
            this.intercomService.show();
            return;
          } else if (
            Object.prototype.hasOwnProperty.call(
              response.errors,
              'missing_ccla'
            )
          ) {
            this.openWithDismiss(this.signedCLANotFoundModal);
          } else if (
            Object.prototype.hasOwnProperty.call(
              response.errors,
              'ccla_approval_list'
            )
          ) {
            const url =
              '/corporate-dashboard/request-authorization/' +
              this.projectId +
              '/' +
              this.userId;
            // Dismiss the advisory "Heads up" warning so it doesn't linger over the new route.
            this.modalService.dismissAll();
            this.router.navigate([url]);
            return;
          } else {
            this.alertService.error(response.errors.project_id);
          }
        } else {
          this.postEmployeeSignatureRequest();
        }
      },
      (exception) => {
        this.claContributorService.handleError(exception);
      }
    );
  }

  postEmployeeSignatureRequest() {
    const hasGerrit = JSON.parse(
      this.storageService.getItem(AppSettings.HAS_GERRIT)
    );
    const signatureRequest = {
      project_id: this.projectId,
      company_id: this.organization.companyID,
      user_id: this.userId,
      return_url_type: hasGerrit
        ? AppSettings.GERRIT
        : this.claContributorService.getTypeByUrl(),
    };
    this.claContributorService
      .postEmployeeSignatureRequest(signatureRequest)
      .subscribe(
        (response: any) => {
          // /v2/request-employee-signature can return a legacy HTTP-200 body carrying a
          // compliance block ({code:403, errors:{sanctioned}}) — don't treat every 200 as
          // success; mirror the precheck handling so a trade-compliance review flag still blocks here.
          if (response && response.errors) {
            if (
              Object.prototype.hasOwnProperty.call(response.errors, 'sanctioned')
            ) {
              this.title = 'Compliance Review Required';
              this.message =
                'We\'re sorry, but this organization requires additional trade compliance review, so the Contributor License Agreement (CLA) cannot be completed at this time. If you believe this is an error, please contact EasyCLA Support via the chat widget.';
              this.openWithDismiss(this.warningModal);
              this.intercomService.show();
              return;
            }
            this.alertService.error(
              response.errors.project_id ||
                response.errors.server ||
                'Unable to complete the CLA request.'
            );
            return;
          }
          const project: ProjectModel = JSON.parse(
            this.storageService.getItem(AppSettings.PROJECT)
          );
          if (project.project_ccla_requires_icla_signature && !this.attempt) {
            this.checkIndividualLastSignature();
          } else {
            this.showSuccessAndRedirectToGit();
          }
        },
        (exception) => {
          this.claContributorService.handleError(exception);
        }
      );
  }

  checkIndividualLastSignature() {
    this.claContributorService
      .getLastIndividualSignature(this.userId, this.projectId)
      .subscribe(
        (response) => {
          this.attempt = true;
          if (response === null) {
            // User has no icla, they need one. Redirect to ICLA/
            this.showICLASignModal();
          } else {
            // get whether icla is up to date
            if (response.requires_resigning) {
              this.showICLASignModal();
            } else {
              // show success and redirect to github.
              this.postEmployeeSignatureRequest();
            }
          }
        },
        (exception) => {
          this.claContributorService.handleError(exception);
        }
      );
  }

  showSuccessAndRedirectToGit() {
    const hasGerrit = JSON.parse(
      this.storageService.getItem(AppSettings.HAS_GERRIT)
    );
    this.hasError = false;
    this.title = 'You are done!';
    this.message =
      'You have completed the CLA steps necessary to contribute. You can now return to writing awesome stuff.';
    if (hasGerrit) {
      this.message =
        'You have completed the CLA steps necessary to contribute. Please note that you will need to logout and log back in to your Gerrit account to get the updated permissions.' +
        ' You can now return to writing awesome stuff.';
    }
    this.openWithDismiss(this.successModal);
  }

  showICLASignModal() {
    const project: ProjectModel = JSON.parse(
      this.storageService.getItem(AppSettings.PROJECT)
    );
    this.hasError = true;
    this.title = 'Sign ICLA Required';
    this.message =
      project.project_name +
      ' requires contributors covered by a corporate CLA to also sign an individual CLA. Click the button below to sign an individual CLA.';
    this.openWithDismiss(this.successModal);
  }

  onClickModalSuccessBtn() {
    this.modalService.dismissAll();
    if (this.hasError) {
      const url = '/individual-dashboard/' + this.projectId + '/' + this.userId;
      this.router.navigate([url]);
    } else {
      this.redirectToSource();
    }
  }

  onClickExitCLA() {
    this.modalService.dismissAll();
  }

  redirectToSource() {
    const redirectUrl = JSON.parse(
      this.storageService.getItem(AppSettings.REDIRECT)
    );
    if (redirectUrl !== null) {
      window.open(redirectUrl, '_self');
    } else {
      const error = 'Unable to fetch redirect URL.';
      this.alertService.error(error);
    }
  }

  onCompanyKeypress(event) {
    this.hasShowDropdown = true;
    this.noCompanyFound = false;
    this.emptySearchError = false;
    if (this.form.valid) {
      const companyName = event.target.value;
      if (this.selectedCompany !== companyName) {
        this.selectedCompany = '';
      }
      if (this.searchTimeout !== null) {
        clearTimeout(this.searchTimeout);
      }
      this.searchTimeout = setTimeout(() => {
        this.searchOrganization(encodeURIComponent(companyName));
      }, 500);
    } else {
      this.selectedCompany = '';
      this.organizationList.list = [];
      this.updateOrganizationGroups();
      this.resetEmptySearchMessage();
    }
  }

  get unsignedListVisible(): boolean {
    return this.signedOrganizations.length === 0 || this.showUnsigned;
  }

  get addOrganizationVisible(): boolean {
    return this.unsignedListVisible || this.unsignedTotal === 0;
  }

  get hiddenUnsignedCount(): number {
    return Math.max(0, this.unsignedTotal - UNSIGNED_DISPLAY_LIMIT);
  }

  onShowUnsigned() {
    this.showUnsigned = true;
  }

  updateOrganizationGroups() {
    const groups = groupOrganizations(
      this.organizationList.list,
      this.form.controls.companyName.value
    );
    this.signedOrganizations = groups.signed;
    this.unsignedOrganizations = groups.unsigned.slice(
      0,
      UNSIGNED_DISPLAY_LIMIT
    );
    this.unsignedTotal = groups.unsigned.length;
    this.showUnsigned = false;
  }

  resetEmptySearchMessage() {
    if (this.form.controls.companyName.value === '') {
      this.emptySearchError = true;
    }
  }

  toggleDropdown() {
    this.hasShowDropdown = !this.hasShowDropdown;
  }

  hideShowCloseBtn(isHide: boolean) {
    this.hideDialogCloseBtn = isHide;
  }

  searchOrganization(companyName: string) {
    this.alertService.clearAlert();
    this.organizationList.list = [];
    this.updateOrganizationGroups();
    this.claContributorService.searchOrganization(companyName).subscribe(
      (response) => {
        this.noCompanyFound = false;
        this.organizationList = response;
        if (this.organizationList.list.length <= 0) {
          this.noCompanyFound = true;
        }
        // Changed error message from organization not found to 2 char required.
        if (this.form.controls.companyName.value.length < 2) {
          this.organizationList.list = [];
        }
        this.updateOrganizationGroups();
        this.resetEmptySearchMessage();
      },
      (exception) => {
        this.noCompanyFound = true;
        this.claContributorService.handleError(exception);
      }
    );
  }

  onClickBack() {
    const redirectUrl = JSON.parse(
      this.storageService.getItem(AppSettings.REDIRECT)
    );
    this.router.navigate(
      ['/cla/project/' + this.projectId + '/user/' + this.userId],
      { queryParams: { redirect: redirectUrl } }
    );
  }

  open(content) {
    this.modalService.open(content, {
      centered: true,
      backdrop: 'static',
      keyboard: false,
    });
  }

  openWithDismiss(content) {
    this.modalService.dismissAll();
    this.open(content);
  }

  onClickClose() {
    this.modalService.dismissAll();
  }

  onClickNoBtn(content) {
    this.modalService.open(content);
  }

  handledBrowserBack() {
    if (
      window.performance &&
      window.performance.navigation.type ===
        window.performance.navigation.TYPE_BACK_FORWARD
    ) {
      const company: OrganizationModel = JSON.parse(
        this.storageService.getItem(AppSettings.SELECTED_COMPANY)
      );
      this.selectedCompany = company.companyExternalID;
    }
  }
}
