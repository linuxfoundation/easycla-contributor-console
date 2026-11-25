// Copyright The Linux Foundation and each contributor to CommunityBridge.
// SPDX-License-Identifier: MIT

import { Component, ElementRef, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ClaContributorService } from 'src/app/core/services/cla-contributor.service';
import { StorageService } from 'src/app/shared/services/storage.service';
import { UserModel } from 'src/app/core/models/user';
import { ProjectModel } from 'src/app/core/models/project';
import { CompanyModel, OrganizationModel } from 'src/app/core/models/organization';
import { existingCompanySFID } from 'src/app/core/models/company-conflict';
import { AlertService } from 'src/app/shared/services/alert.service';
import { EmailValidator } from 'src/app/shared/validators/email-validator';
import { AppSettings } from 'src/app/config/app-settings';
import { IntercomService } from 'src/app/shared/services/intercom.service';
import { CompanyAdminDesigneeModel, CompnayAdminListModel } from 'src/app/core/models/company-admin-designee';

@Component({
  selector: 'app-identify-cla-manager-modal',
  templateUrl: './identify-cla-manager-modal.component.html',
  styleUrls: ['./identify-cla-manager-modal.component.scss']
})
export class IdentifyClaManagerModalComponent implements OnInit {
  @ViewChild('successModal') successModal: TemplateRef<any>;
  @ViewChild('inputBox') element: ElementRef;

  hasShowContactAdmin: boolean;
  loading: boolean;
  form: FormGroup;
  message: string;
  title: string;
  hasError: boolean;
  failedCount: number;

  constructor(
    private formBuilder: FormBuilder,
    private modalService: NgbModal,
    private claContributorService: ClaContributorService,
    private storageService: StorageService,
    private alertService: AlertService,
    private intercomService: IntercomService
  ) {
  }

  ngOnInit(): void {
    this.failedCount = 0;
    this.hasShowContactAdmin = false;
    this.loading = true;

    setTimeout(() => {
      this.hasShowContactAdminSection();
    }, 50);

    this.form = this.formBuilder.group({
      name: ['', Validators.compose([
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(255),
        Validators.pattern(new RegExp(AppSettings.USER_FIRST_LAST_NAME_REGEX)),
      ]
      )],
      email: ['', Validators.compose([
        Validators.required,
        EmailValidator.isValid,
        Validators.maxLength(255)
      ])],
    });
  }

  onClickSubmit() {
    const data = JSON.parse(this.storageService.getItem(AppSettings.NEW_ORGANIZATIONS));
    if (data !== undefined && data !== null) {
      // Add organization if it is not created.
      this.addNewOrganization(data);
    } else {
      this.inviteCLAManager(false);
    }
  }

  onClickContactAdmin() {
    this.inviteCLAManager(true);
  }

  onClickSupporticket() {
    this.intercomService.show();
  }

  addNewOrganization(data) {
    const userModel: UserModel = JSON.parse(this.storageService.getItem(AppSettings.USER));
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
        const msg = exception.error.Message ? exception.error.Message : exception.error.message;
        this.alertService.error(msg);
      }
    );
  }

  getOrganizationInformation(companySFID) {
    this.claContributorService.getOrganizationDetails(companySFID).subscribe(
      (response) => {
        this.storageService.setItem(AppSettings.SELECTED_COMPANY, response);
        this.inviteCLAManager(false);
      },
      (exception) => {
        // To add org in salesforce take couple of seconds
        // So called getOrganizationInformation method till result comes
        this.failedCount++;
        if (this.failedCount >= AppSettings.MAX_FAILED_COUNT) { // end API call after 20 time failed
          this.hasError = true;
          this.title = 'Request Failed';
          this.message = exception.error.message;
          this.openDialogModal();
        } else {
          this.getOrganizationInformation(companySFID);
        }
      }
    );
  }

  inviteCLAManager(hasCompanyAdmin: boolean) {
    const company: OrganizationModel = JSON.parse(this.storageService.getItem(AppSettings.SELECTED_COMPANY));
    const project: ProjectModel = JSON.parse(this.storageService.getItem(AppSettings.PROJECT));
    const data = {
      companyID: company.companyID,
      contactAdmin: hasCompanyAdmin,
      claGroupID: project.project_id,
      name: hasCompanyAdmin ? '' : this.form.controls.name.value,
      userEmail: hasCompanyAdmin ? '' : this.form.controls.email.value
    };
    this.callInviteManagerAPI(data, hasCompanyAdmin);
  }

  callInviteManagerAPI(data: any, hasCompanyAdmin: boolean) {
    this.alertService.clearAlert();
    const user: UserModel = JSON.parse(this.storageService.getItem(AppSettings.USER));
    if (user.user_id) {
      this.claContributorService.inviteManager(user.user_id, data).subscribe(
        (response: any) => {
          this.handleSuccess(hasCompanyAdmin, response);
        },
        (exception) => {
          if (exception.status === 400) {
            // user already assigned cla-manager
            this.hasError = false;
            this.title = '';
            this.message = 'This user is already a CLA Manager for this organization and project. Please contact them to process your CLA Request.';
            this.openDialogModal();
          } else {
            this.handleError(exception);
          }
        }
      );
    }
  }

  handleSuccess(hasCompanyAdmin: boolean, response: CompanyAdminDesigneeModel) {
    this.hasError = false;
    if (hasCompanyAdmin) {
      this.title = 'Request Submitted to Company Admin';
      this.message = 'Your Company Admin ';
      if (response.list) {
        const adminList = response.list.filter(admin => admin.name !== '');
        for (const [index, admin] of adminList.entries()) {
          this.message += '<b>' + admin.name + '</b>';
          if (index !== adminList.length - 1 && admin.name !== null) {
            this.message += ', ';
          }
        }
      }
      this.message += ' has been contacted, you will need to follow up with them to process your CLA request.';
    } else {
      // Two different success message as per from which screen he came
      // Add Organization or from Company search page.
      if (this.hasShowContactAdmin) {
        // Came from Search organization flow.
        this.title = 'Request Submitted';
        this.message = 'Your authorized representative has been contacted. You will need to follow up with them to process your CLA request.';
      } else {
        // Came from Add organization flow.
        this.title = 'Notification Sent';
        this.message = 'An email has been sent to <b>' + this.form.controls.email.value + '</b> to request that they start the CLA signature process.';
      }
    }
    this.openDialogModal();
  }

  hasShowContactAdminSection() {
    const selectedCompany: OrganizationModel = JSON.parse(this.storageService.getItem(AppSettings.SELECTED_COMPANY));
    this.claContributorService.getCompanyAdminList(selectedCompany.companyExternalID).subscribe(
      (response: CompnayAdminListModel) => {
        this.loading = false;
        this.element.nativeElement.focus();
        if (response.list.length > 0) {
          this.hasShowContactAdmin = true;
        }
      },
      (exception) => {
        this.loading = false;
        this.hasShowContactAdmin = false;
        this.claContributorService.handleError(exception);
      }
    );
  }

  handleError(exception) {
    this.hasError = true;
    this.title = 'Request Failed';
    this.message = 'Your request is Failed due to internal server error please try later.';
    if (exception.error?.Message) {
      this.message = exception.error.Message;
    }
    this.openDialogModal();
  }

  onClickExitCLABtn() {
    const redirectUrl = JSON.parse(this.storageService.getItem(AppSettings.REDIRECT));
    if (redirectUrl !== null) {
      window.open(redirectUrl, '_self');
    } else {
      const error = 'Unable to fetch redirect URL.';
      this.alertService.error(error);
      this.modalService.dismissAll();
    }
  }

  openDialogModal() {
    this.modalService.dismissAll();
    this.modalService.open(this.successModal, {
      centered: true,
      backdrop: 'static',
      keyboard: false
    });
  }

  onClickBackToCLANotFound() {
    const data = {
      action: 'CLA_NOT_SIGN',
      payload: false
    };
    this.claContributorService.openDialogModalEvent.next(data);
  }

  onClickGoBackToIdentifyCLAManger() {
    const data = {
      action: 'IDENTIFY_CLA_MANAGER',
      payload: ''
    };
    this.claContributorService.openDialogModalEvent.next(data);
  }
}
