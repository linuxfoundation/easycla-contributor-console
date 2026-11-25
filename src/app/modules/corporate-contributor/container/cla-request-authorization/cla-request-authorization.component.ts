// Copyright The Linux Foundation and each contributor to CommunityBridge.
// SPDX-License-Identifier: MIT

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { StorageService } from 'src/app/shared/services/storage.service';
import { PlatformLocation } from '@angular/common';
import { ClaContributorService } from 'src/app/core/services/cla-contributor.service';
import { OrganizationModel } from 'src/app/core/models/organization';
import { AlertService } from 'src/app/shared/services/alert.service';
import { CLAManagersModel, CLAManagerModel } from 'src/app/core/models/cla-manager';
import { ProjectModel } from 'src/app/core/models/project';
import { AppSettings } from 'src/app/config/app-settings';

@Component({
  selector: 'app-cla-request-authorization',
  templateUrl: './cla-request-authorization.component.html',
  styleUrls: ['./cla-request-authorization.component.scss']
})
export class ClaRequestAuthorizationComponent implements OnInit {
  projectId: string;
  userId: string;
  hasError: boolean;
  title: string;
  message: string;
  managers = new CLAManagersModel();
  selectedCompany: string;
  company: OrganizationModel;
  claManagerError: string;
  hasSelectAll: boolean;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private modalService: NgbModal,
    private storageService: StorageService,
    private location: PlatformLocation,
    private claContributorService: ClaContributorService,
    private alertService: AlertService
  ) {
    this.projectId = this.route.snapshot.paramMap.get('projectId');
    this.userId = this.route.snapshot.paramMap.get('userId');
    this.location.onPopState(() => this.modalService.dismissAll());
  }

  ngOnInit(): void {
    this.hasSelectAll = false;
    this.claManagerError = 'Wait... we are loading CLA manager(s).';
    this.company = JSON.parse(this.storageService.getItem(AppSettings.SELECTED_COMPANY));
    if (this.company) {
      this.selectedCompany = this.company.companyID;
      this.getCLAManagers();
    }
  }

  onClickBack() {
    this.modalService.dismissAll();
    const url = '/corporate-dashboard/' + this.projectId + '/' + this.userId;
    this.router.navigate([url]);
  }

  onClickSelectAll(status) {
    this.hasSelectAll = status;
    this.managers.list.map(manager => manager.hasChecked = status);
  }

  onClickCheckbox(status, manager: CLAManagerModel) {
    manager.hasChecked = status;
    if (!manager.hasChecked) {
      this.hasSelectAll = status;
    }
    if (this.hasAllManagerChecked()) {
      this.hasSelectAll = true;
    }
  }

  hasAllManagerChecked() {
    for (const manager of this.managers.list) {
      if (!manager.hasChecked) {
        return false;
      }
    }
    return true;
  }

  getSelectedCLAManagers() {
    const list = [];
    if (this.managers) {
      for (const manager of this.managers.list) {
        if (manager.hasChecked) {
          list.push({
            email: manager.email,
            name: manager.name
          });
        }
      }
    }
    return list;
  }

  onClickRequestAuthorization(content: any) {
    this.alertService.clearAlert();
    if (this.getSelectedCLAManagers().length > 0) {
      this.notifyCLAManagers(content);
    } else {
      this.alertService.error('Please select at least one CLA Manager.');
    }
  }

  notifyCLAManagers(content: any) {
    const project: ProjectModel = JSON.parse(this.storageService.getItem(AppSettings.PROJECT));
    const data = {
      companyName: this.company.companyName,
      companySFID: this.company.companyExternalID,
      claGroupID: project.project_id,
      userID: this.userId,
      list: this.getSelectedCLAManagers()
    };
    this.claContributorService.notifyCLAMangers(data).subscribe(
      () => {
        this.hasError = false;
        this.title = 'Request Submitted';
        this.message = 'The CLA Manager for <b>' + this.company.companyName + '</b> will be notified of your request to be authorized for contributions.' +
          ' You will be notified via email when the status has been approved or rejected.';
        this.showDialogModal(content);
        this.hasSelectAll = false;
        this.managers.list.map(manager => manager.hasChecked = false); // Reset checkbox.
      },
      () => {
        this.hasError = true;
        this.title = 'Request Failed';
        this.message = 'A request has been failed due to some technical error please contact your administrator';
        this.showDialogModal(content);
      }
    );
  }

  exitEasyCLA() {
    const redirectUrl = JSON.parse(this.storageService.getItem(AppSettings.REDIRECT));
    if (redirectUrl !== null) {
      window.open(redirectUrl, '_self');
    } else {
      const error = 'Unable to fetch redirect URL.';
      this.alertService.error(error);
    }
  }

  closeModal() {
    this.modalService.dismissAll();
    const redirectUrl = JSON.parse(this.storageService.getItem(AppSettings.REDIRECT));
    if (redirectUrl !== null) {
      window.open(redirectUrl, '_self');
    } else {
      const error = 'Unable to fetch redirect URL.';
      this.alertService.error(error);
    }
  }

  goback() {
    this.modalService.dismissAll();
  }

  getCLAManagers() {
    this.claContributorService.getProjectCLAManagers(this.projectId, this.selectedCompany).subscribe(
      (response: CLAManagersModel) => {
        this.managers = response;
        if (this.managers && !this.managers.list) {
          this.claManagerError = 'No CLA manager found.';
        }
      },
      (exception) => {
        this.claContributorService.handleError(exception);
      }
    );
  }

  showDialogModal(content) {
    this.modalService.open(content, {
      centered: true,
      backdrop: 'static',
      keyboard: false
    });
  }
}
