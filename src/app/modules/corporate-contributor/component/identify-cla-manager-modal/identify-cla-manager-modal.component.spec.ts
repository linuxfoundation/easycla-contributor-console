// Copyright The Linux Foundation and each contributor to CommunityBridge.
// SPDX-License-Identifier: MIT

import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { of, throwError } from 'rxjs';
import { IdentifyClaManagerModalComponent } from './identify-cla-manager-modal.component';
import { ClaContributorService } from 'src/app/core/services/cla-contributor.service';
import { AlertService } from 'src/app/shared/services/alert.service';
import { StorageService } from 'src/app/shared/services/storage.service';
import { IntercomService } from 'src/app/shared/services/intercom.service';
import { AppSettings } from 'src/app/config/app-settings';

const SFID = '001000000000000AAA';
const EASYCLA_ID = '00000000-0000-4000-8000-000000000000';
const NEW_ORG = { companyName: 'Example Org', companyWebsite: 'https://example.org' };
const ORGANIZATION = { companyID: EASYCLA_ID, companyExternalID: SFID, companyName: 'Example Org' };

describe('IdentifyClaManagerModalComponent', () => {
  let component: IdentifyClaManagerModalComponent;
  let fixture: ComponentFixture<IdentifyClaManagerModalComponent>;
  let store: Map<string, string>;
  let claContributorService: jasmine.SpyObj<ClaContributorService>;
  let alertService: jasmine.SpyObj<AlertService>;

  beforeEach(waitForAsync(() => {
    store = new Map([
      [AppSettings.USER, JSON.stringify({ user_id: 'user-1' })],
      [AppSettings.NEW_ORGANIZATIONS, JSON.stringify(NEW_ORG)],
    ]);
    claContributorService = jasmine.createSpyObj('ClaContributorService', [
      'addCompany',
      'getOrganizationDetails',
    ]);
    alertService = jasmine.createSpyObj('AlertService', ['error', 'clearAlert']);
    const storageService = jasmine.createSpyObj('StorageService', ['getItem', 'setItem', 'removeItem']);
    storageService.getItem.and.callFake((key: string) => (store.get(key) ?? null) as any);
    storageService.setItem.and.callFake((key: string, value: any) => store.set(key, JSON.stringify(value)));
    storageService.removeItem.and.callFake((key: string) => store.delete(key));

    TestBed.configureTestingModule({
      declarations: [IdentifyClaManagerModalComponent],
      imports: [FormsModule, ReactiveFormsModule],
      providers: [
        { provide: ClaContributorService, useValue: claContributorService },
        { provide: StorageService, useValue: storageService },
        { provide: AlertService, useValue: alertService },
        { provide: NgbModal, useValue: jasmine.createSpyObj('NgbModal', ['open', 'dismissAll']) },
        { provide: IntercomService, useValue: jasmine.createSpyObj('IntercomService', ['show']) },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(IdentifyClaManagerModalComponent);
    component = fixture.componentInstance;
    component.failedCount = 0;
    spyOn(component, 'inviteCLAManager');
  });

  it('continues with the existing company when the create answers 409 with its ids', () => {
    claContributorService.addCompany.and.returnValue(
      throwError(new HttpErrorResponse({
        status: 409,
        error: {
          Message: 'organization already exists',
          companyID: EASYCLA_ID,
          companyExternalID: SFID,
          companyName: 'Example Org',
          signingEntityName: 'Example Org',
        },
      }))
    );
    claContributorService.getOrganizationDetails.and.returnValue(of(ORGANIZATION as any));

    component.onClickSubmit();

    expect(claContributorService.getOrganizationDetails).toHaveBeenCalledOnceWith(SFID);
    expect(store.has(AppSettings.NEW_ORGANIZATIONS)).toBeFalse();
    expect(JSON.parse(store.get(AppSettings.SELECTED_COMPANY))).toEqual(ORGANIZATION);
    expect(component.inviteCLAManager).toHaveBeenCalledWith(false);
    expect(alertService.error).not.toHaveBeenCalled();
  });

  it('keeps the error toast when the 409 carries no company ids', () => {
    claContributorService.addCompany.and.returnValue(
      throwError(new HttpErrorResponse({
        status: 409,
        error: { Code: 'company_create_in_progress', Message: 'a company is already being created for this website' },
      }))
    );

    component.onClickSubmit();

    expect(claContributorService.getOrganizationDetails).not.toHaveBeenCalled();
    expect(alertService.error).toHaveBeenCalledWith('a company is already being created for this website');
    expect(store.has(AppSettings.NEW_ORGANIZATIONS)).toBeTrue();
    expect(component.inviteCLAManager).not.toHaveBeenCalled();
  });
});
