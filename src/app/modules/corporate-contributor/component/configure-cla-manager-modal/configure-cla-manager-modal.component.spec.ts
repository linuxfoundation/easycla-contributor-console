// Copyright The Linux Foundation and each contributor to CommunityBridge.
// SPDX-License-Identifier: MIT

import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { of, throwError } from 'rxjs';
import { ConfigureClaManagerModalComponent } from './configure-cla-manager-modal.component';
import { ClaContributorService } from 'src/app/core/services/cla-contributor.service';
import { AuthService } from 'src/app/shared/services/auth.service';
import { StorageService } from 'src/app/shared/services/storage.service';
import { AlertService } from 'src/app/shared/services/alert.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { AppSettings } from 'src/app/config/app-settings';

const SFID = '001000000000000AAA';
const EASYCLA_ID = '00000000-0000-4000-8000-000000000000';
const NEW_ORG = { companyName: 'Example Org', companyWebsite: 'https://example.org' };
const ORGANIZATION = { companyID: EASYCLA_ID, companyExternalID: SFID, companyName: 'Example Org' };

describe('ConfigureClaManagerModalComponent', () => {
  let component: ConfigureClaManagerModalComponent;
  let fixture: ComponentFixture<ConfigureClaManagerModalComponent>;
  let store: Map<string, string>;
  let claContributorService: jasmine.SpyObj<ClaContributorService>;
  let storageService: jasmine.SpyObj<StorageService>;
  let modalService: jasmine.SpyObj<NgbModal>;

  beforeEach(() => {
    store = new Map([
      [AppSettings.USER, JSON.stringify({ user_id: 'user-1' })],
      [AppSettings.NEW_ORGANIZATIONS, JSON.stringify(NEW_ORG)],
    ]);
    claContributorService = jasmine.createSpyObj('ClaContributorService', [
      'addCompany',
      'getOrganizationDetails',
      'getOrgLens',
      'getLFXCorporateURL',
    ]);
    storageService = jasmine.createSpyObj('StorageService', ['getItem', 'setItem', 'removeItem']);
    storageService.getItem.and.callFake((key: string) => (store.get(key) ?? null) as any);
    storageService.setItem.and.callFake((key: string, value: any) => store.set(key, JSON.stringify(value)));
    storageService.removeItem.and.callFake((key: string) => store.delete(key));
    modalService = jasmine.createSpyObj('NgbModal', ['open', 'dismissAll']);

    TestBed.configureTestingModule({
      declarations: [ConfigureClaManagerModalComponent],
      providers: [
        { provide: ClaContributorService, useValue: claContributorService },
        { provide: StorageService, useValue: storageService },
        { provide: NgbModal, useValue: modalService },
        { provide: AuthService, useValue: {} },
        { provide: AlertService, useValue: jasmine.createSpyObj('AlertService', ['error']) },
        { provide: LoaderService, useValue: jasmine.createSpyObj('LoaderService', ['show', 'hide']) },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
  });

  function createAndRunCreate() {
    fixture = TestBed.createComponent(ConfigureClaManagerModalComponent);
    component = fixture.componentInstance;
    spyOn(component, 'manageAuthRedirection');
    fixture.detectChanges();
    tick(100);
  }

  it('continues with the created company on success', fakeAsync(() => {
    claContributorService.addCompany.and.returnValue(of({ companyID: SFID } as any));
    claContributorService.getOrganizationDetails.and.returnValue(of(ORGANIZATION as any));

    createAndRunCreate();

    expect(claContributorService.getOrganizationDetails).toHaveBeenCalledWith(SFID);
    expect(store.has(AppSettings.NEW_ORGANIZATIONS)).toBeFalse();
    expect(JSON.parse(store.get(AppSettings.SELECTED_COMPANY))).toEqual(ORGANIZATION);
    expect(component.manageAuthRedirection).toHaveBeenCalled();
    expect(modalService.open).not.toHaveBeenCalled();
  }));

  it('continues with the existing company when the create answers 409 with its ids', fakeAsync(() => {
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

    createAndRunCreate();

    expect(claContributorService.getOrganizationDetails).toHaveBeenCalledOnceWith(SFID);
    expect(store.has(AppSettings.NEW_ORGANIZATIONS)).toBeFalse();
    expect(JSON.parse(store.get(AppSettings.SELECTED_COMPANY))).toEqual(ORGANIZATION);
    expect(component.manageAuthRedirection).toHaveBeenCalled();
    expect(modalService.open).not.toHaveBeenCalled();
  }));

  it('keeps the pending organization when the existing company never loads after a 409', fakeAsync(() => {
    claContributorService.addCompany.and.returnValue(
      throwError(new HttpErrorResponse({
        status: 409,
        error: { Message: 'organization already exists', companyID: EASYCLA_ID, companyExternalID: SFID },
      }))
    );
    claContributorService.getOrganizationDetails.and.returnValue(
      throwError(new HttpErrorResponse({ status: 404, error: { Message: 'not found' } }))
    );

    createAndRunCreate();

    expect(claContributorService.getOrganizationDetails).toHaveBeenCalledTimes(AppSettings.MAX_FAILED_COUNT);
    expect(component.title).toBe('Request Failed');
    expect(modalService.open).toHaveBeenCalledWith(component.errorModal, jasmine.any(Object));
    expect(store.has(AppSettings.NEW_ORGANIZATIONS)).toBeTrue();
    expect(component.manageAuthRedirection).not.toHaveBeenCalled();
  }));

  it('keeps the Request Failed dialog when the 409 carries no company ids', fakeAsync(() => {
    claContributorService.addCompany.and.returnValue(
      throwError(new HttpErrorResponse({
        status: 409,
        error: { Code: 'company_create_in_progress', Message: 'a company is already being created for this website' },
      }))
    );

    createAndRunCreate();

    expect(claContributorService.getOrganizationDetails).not.toHaveBeenCalled();
    expect(component.title).toBe('Request Failed');
    expect(component.message).toBe('a company is already being created for this website');
    expect(modalService.open).toHaveBeenCalledWith(component.errorModal, jasmine.any(Object));
    expect(store.has(AppSettings.NEW_ORGANIZATIONS)).toBeTrue();
    expect(component.manageAuthRedirection).not.toHaveBeenCalled();
  }));

  describe('proceeding to the CLA Manager console after the designee step', () => {
    const CLA_GROUP_ID = '00000000-0000-4000-8000-000000000001';
    const LENS_URL = 'https://app.example.org/org/' + SFID + '/easycla/' + CLA_GROUP_ID;
    const CORPORATE_URL = 'https://corporate.example.org/company/dashboard';

    function createDesignee() {
      store.delete(AppSettings.NEW_ORGANIZATIONS);
      store.set(AppSettings.PROJECT_ID, JSON.stringify(CLA_GROUP_ID));
      store.set(AppSettings.ACTION_TYPE, JSON.stringify(AppSettings.SIGN_CLA));
      store.set(AppSettings.SELECTED_COMPANY, JSON.stringify(ORGANIZATION));
      createAndRunCreate();
      component.hasCLAManagerDesignee = true;
      spyOn(component, 'navigateTo');
      claContributorService.getLFXCorporateURL.and.returnValue(CORPORATE_URL);
    }

    it('opens the Company lens URL the backend returns', fakeAsync(() => {
      createDesignee();
      claContributorService.getOrgLens.and.returnValue(of({ orgLensURL: LENS_URL } as any));

      component.onClickProceedModalBtn();

      expect(claContributorService.getOrgLens).toHaveBeenCalledOnceWith(EASYCLA_ID, CLA_GROUP_ID);
      expect(component.navigateTo).toHaveBeenCalledOnceWith(LENS_URL);
      expect(claContributorService.getLFXCorporateURL).not.toHaveBeenCalled();
      expect(store.has(AppSettings.ACTION_TYPE)).toBeFalse();
    }));

    it('opens the Corporate Console when the lens URL is empty', fakeAsync(() => {
      createDesignee();
      claContributorService.getOrgLens.and.returnValue(of({ orgLensURL: '' } as any));

      component.onClickProceedModalBtn();

      expect(component.navigateTo).toHaveBeenCalledOnceWith(CORPORATE_URL);
      expect(store.has(AppSettings.ACTION_TYPE)).toBeFalse();
    }));

    it('opens the Corporate Console when the lens lookup fails', fakeAsync(() => {
      createDesignee();
      claContributorService.getOrgLens.and.returnValue(
        throwError(new HttpErrorResponse({ status: 404, error: { Message: 'cla group not found' } }))
      );

      component.onClickProceedModalBtn();

      expect(component.navigateTo).toHaveBeenCalledOnceWith(CORPORATE_URL);
    }));

    it('opens the Corporate Console when the lens URL is not https', fakeAsync(() => {
      createDesignee();
      claContributorService.getOrgLens.and.returnValue(of({ orgLensURL: 'javascript:alert(1)' } as any));

      component.onClickProceedModalBtn();

      expect(component.navigateTo).toHaveBeenCalledOnceWith(CORPORATE_URL);
    }));

    it('opens the Corporate Console without a lookup when the CLA group is unknown', fakeAsync(() => {
      createDesignee();
      store.delete(AppSettings.PROJECT_ID);

      component.onClickProceedModalBtn();

      expect(claContributorService.getOrgLens).not.toHaveBeenCalled();
      expect(component.navigateTo).toHaveBeenCalledOnceWith(CORPORATE_URL);
    }));
  });
});
