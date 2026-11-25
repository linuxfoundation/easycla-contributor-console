// Copyright The Linux Foundation and each contributor to CommunityBridge.
// SPDX-License-Identifier: MIT

import {
  Component,
  EventEmitter,
  OnInit,
  Output,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { ClaContributorService } from 'src/app/core/services/cla-contributor.service';
import { AuthService } from 'src/app/shared/services/auth.service';
import { AppSettings } from 'src/app/config/app-settings';
import { StorageService } from 'src/app/shared/services/storage.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import {
  CompanyModel,
  OrganizationModel,
} from 'src/app/core/models/organization';
import { existingCompanySFID } from 'src/app/core/models/company-conflict';
import { AlertService } from 'src/app/shared/services/alert.service';
import { UserModel } from 'src/app/core/models/user';
import { LoaderService } from 'src/app/shared/services/loader.service';

@Component({
  selector: 'app-configure-cla-manager-modal',
  templateUrl: './configure-cla-manager-modal.component.html',
  styleUrls: ['./configure-cla-manager-modal.component.scss'],
})
export class ConfigureClaManagerModalComponent implements OnInit {
  @ViewChild('errorModal') errorModal: TemplateRef<any>;
  @ViewChild('warningModal') warningModal: TemplateRef<any>;
  @Output() showCloseBtnEmitter: EventEmitter<any> = new EventEmitter<any>();

  title: string;
  message: string;
  company: OrganizationModel;
  hasCLAManagerDesignee: boolean;
  spinnerMessage: string;
  failedCount: number;
  showRetryBtn: boolean;

  constructor(
    private claContributorService: ClaContributorService,
    private authService: AuthService,
    private storageService: StorageService,
    private modalService: NgbModal,
    private alertService: AlertService,
    private loaderService: LoaderService
  ) {
    this.hasCLAManagerDesignee = false;
    this.showCloseBtnEmitter.emit(false);
    setTimeout(() => {
      this.addOrganizationIfNotAdded();
    }, 100);
  }

  ngOnInit() {
    this.showRetryBtn = false;
    this.failedCount = 0;
    this.company = JSON.parse(
      this.storageService.getItem(AppSettings.SELECTED_COMPANY)
    );
  }

  manageAuthRedirection() {
    this.spinnerMessage =
      'Please wait while we configure the initial CLA Manager settings for this CLA.';
    const actionType = JSON.parse(
      this.storageService.getItem(AppSettings.ACTION_TYPE)
    );
    if (actionType === AppSettings.SIGN_CLA) {
      this.addContributorAsDesignee();
    } else {
      this.validateUserLFID();
    }
  }

  addOrganizationIfNotAdded() {
    const data = JSON.parse(
      this.storageService.getItem(AppSettings.NEW_ORGANIZATIONS)
    );
    if (data !== undefined && data !== null) {
      // Add organization if it is not created.
      this.spinnerMessage =
        'Please wait for a moment, we are adding the organization.';
      this.addNewOrganization(data);
    } else {
      this.manageAuthRedirection();
    }
  }

  addNewOrganization(data) {
    const userModel: UserModel = JSON.parse(
      this.storageService.getItem(AppSettings.USER)
    );
    this.claContributorService.addCompany(userModel.user_id, data).subscribe(
      (response: CompanyModel) => {
        this.storageService.removeItem(AppSettings.NEW_ORGANIZATIONS);
        this.getOrganizationInformation(response.companyID);
      },
      (exception) => {
        const existingSFID = existingCompanySFID(exception);
        if (existingSFID) {
          this.storageService.removeItem(AppSettings.NEW_ORGANIZATIONS);
          this.getOrganizationInformation(existingSFID);
          return;
        }
        this.title = 'Request Failed';
        this.message = exception.error.Message
          ? exception.error.Message
          : exception.error.message;
        this.openDialog(this.errorModal);
      }
    );
  }

  getOrganizationInformation(companySFID) {
    this.claContributorService.getOrganizationDetails(companySFID).subscribe(
      (response) => {
        this.storageService.setItem(AppSettings.SELECTED_COMPANY, response);
        this.company = response;
        this.manageAuthRedirection();
      },
      (exception) => {
        // To add org in salesforce take couple of seconds
        // So called getOrganizationInformation metod till result comes
        this.failedCount++;
        if (this.failedCount >= AppSettings.MAX_FAILED_COUNT) {
          // end API call after 20 time failed
          this.title = 'Request Failed';
          this.message = exception.error.Message;
          this.openDialog(this.errorModal);
        } else {
          this.getOrganizationInformation(companySFID);
        }
      }
    );
  }

  validateUserLFID() {
    if (this.claContributorService.getUserLFID()) {
      if (this.authService.loggedIn) {
        this.addContributorAsDesignee();
      } else {
        this.redirectToAuth0();
      }
    } else {
      // Handle usecase wheather LFID is not present but session already exist in browser.
      if (this.authService.loggedIn) {
        this.addContributorAsDesignee();
      } else {
        this.message =
          '<p>You will need to use your LF account to access the CLA Manager console,' +
          ' or create an LF Login account if you do not have one already.</p>' +
          '<p>After logging in, you will be redirected to ' +
          'the CLA Manager console where you can sign the CLA (or send it to an authorized signatory) and approve contributors on behalf of your organization.</p>';
        this.openDialog(this.warningModal);
      }
    }
  }

  addContributorAsDesignee() {
    this.failedCount = 0;
    const interval = setInterval(() => {
      const authData = JSON.parse(
        this.storageService.getItem(AppSettings.AUTH_DATA)
      );
      if (authData) {
        const data = {
          userEmail: authData.user_email,
        };
        this.addAsCLAManagerDesignee(data);
        clearInterval(interval);
      } else {
        this.authService.login();
        clearInterval(interval);
      }
    }, 2000);
  }

  addAsCLAManagerDesignee(data: any) {
    const projectId = JSON.parse(
      this.storageService.getItem(AppSettings.PROJECT_ID)
    );
    this.claContributorService
      .addAsCLAManagerDesignee(this.company.companyID, projectId, data)
      .subscribe(
        () => {
          this.failedCount = 0;
          this.checkRoleAssignment();
        },
        (exception) => {
          if (exception.status === 409) {
            // User has already CLA manager designee.
            this.hasCLAManagerDesignee = true;
            this.proceedToCorporateConsole();
          } else if (exception.status === 401) {
            this.authService.login();
          } else {
            this.failedCount++;
            if (
              this.failedCount <=
              AppSettings.MAX_CLA_MANAGER_DESIGNEE_RETRY_COUNT
            ) {
              setTimeout(() => {
                this.addAsCLAManagerDesignee(data);
              }, 200);
            } else {
              this.title = 'Request Failed';
              this.storageService.removeItem(AppSettings.ACTION_TYPE);
              this.message = exception.error.Message
                ? exception.error.Message
                : exception.error.message;
              this.openDialog(this.errorModal);
            }
          }
        }
      );
  }

  checkRoleAssignment() {
    const projectId = JSON.parse(
      this.storageService.getItem(AppSettings.PROJECT_ID)
    );
    const authData = JSON.parse(
      this.storageService.getItem(AppSettings.AUTH_DATA)
    );
    this.claContributorService
      .hasRoleAssigned(
        this.company.companyExternalID,
        projectId,
        authData.userid
      )
      .subscribe(
        (result) => {
          if (result.hasRole) {
            this.hasCLAManagerDesignee = true;
            this.proceedToCorporateConsole();
          } else {
            this.retryRoleAssignement();
          }
        },
        (exception) => {
          this.title = 'Request Failed';
          this.message = exception.error.Message;
          this.openDialog(this.errorModal);
        }
      );
  }

  retryRoleAssignement() {
    this.failedCount++;
    if (this.failedCount <= AppSettings.MAX_ROLE_ASSIGN_FAILED_COUNT) {
      this.checkRoleAssignment();
    } else {
      this.showRetryBtn = true;
      this.title = 'Request Failed';
      this.message =
        'The initial CLA manager settings could not be assigned.</br>' +
        'Please click on Retry to allow platform more time to assign settings.</br>' +
        'Otherwise please contact support via the chat widget.' +
        ' Once the issue is resolved, you will be able to proceed with the CLA.';
      this.openDialog(this.errorModal);
    }
  }

  proceedToCorporateConsole() {
    if (this.hasCLAManagerDesignee) {
      this.storageService.removeItem(AppSettings.ACTION_TYPE);
      this.showCloseBtnEmitter.emit(true);
    }
  }

  onClickProceedBtn() {
    this.modalService.dismissAll();
    this.message =
      '<p>You will be redirected to the CLA Manager console where you can sign the CLA (or send it to an authorized signatory) and approve contributors on behalf of your organization.</p>';
    this.openDialog(this.warningModal);
  }

  onClickProceedModalBtn() {
    if (!this.hasCLAManagerDesignee) {
      this.redirectToAuth0();
    } else {
      this.modalService.dismissAll();
      this.loaderService.show();
      const corporateUrl = this.claContributorService.getLFXCorporateURL();
      if (corporateUrl !== '') {
        this.storageService.removeItem(AppSettings.ACTION_TYPE);
        window.open(corporateUrl, '_self');
      } else {
        this.alertService.error(
          'Error occurred during redirecting to the corporate console.'
        );
        this.loaderService.hide();
      }
    }
  }

  redirectToAuth0() {
    this.storageService.setItem(AppSettings.ACTION_TYPE, AppSettings.SIGN_CLA);
    this.authService.login();
  }

  onClickBackBtn() {
    const data = {
      action: 'CLA_NOT_SIGN',
      payload: false,
    };
    this.claContributorService.openDialogModalEvent.next(data);
  }

  onClickClose() {
    this.modalService.dismissAll();
  }

  onClickRetry() {
    this.modalService.dismissAll();
    const data = {
      action: 'RETRY_CONFIG_CLA_MANAGER',
      payload: false,
    };
    this.claContributorService.openDialogModalEvent.next(data);
  }

  openDialog(content) {
    this.modalService.open(content, {
      centered: true,
      backdrop: 'static',
      keyboard: false,
    });
  }
}
