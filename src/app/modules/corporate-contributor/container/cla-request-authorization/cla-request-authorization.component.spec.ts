// Copyright The Linux Foundation and each contributor to CommunityBridge.
// SPDX-License-Identifier: MIT

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ClaRequestAuthorizationComponent } from './cla-request-authorization.component';
import { RouterTestingModule } from '@angular/router/testing';
import { AlertService } from 'src/app/shared/services/alert.service';
import { HttpClientModule } from '@angular/common/http';
import { StorageService } from 'src/app/shared/services/storage.service';
import { ClaContributorService } from 'src/app/core/services/cla-contributor.service';
import { AppSettings } from 'src/app/config/app-settings';
import { of } from 'rxjs';

describe('ClaRequestAuthorizationComponent', () => {
    let component: ClaRequestAuthorizationComponent;
    let fixture: ComponentFixture<ClaRequestAuthorizationComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [ClaRequestAuthorizationComponent],
            imports: [RouterTestingModule, HttpClientModule],
            providers: [AlertService, StorageService]
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(ClaRequestAuthorizationComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('sends the company Salesforce ID with the CLA manager notification', () => {
        const items = {
            [AppSettings.SELECTED_COMPANY]: JSON.stringify({ companyID: 'c-1', companyName: 'Acme', companyExternalID: '001000000000000AAA' }),
            [AppSettings.PROJECT]: JSON.stringify({ project_id: 'cla-group-1' })
        };
        spyOn(TestBed.inject(StorageService), 'getItem').and.callFake(((key: string) => items[key]) as any);
        const notify = spyOn(TestBed.inject(ClaContributorService), 'notifyCLAMangers').and.returnValue(of({}));
        spyOn(component, 'getSelectedCLAManagers').and.returnValue([]);
        spyOn(component, 'showDialogModal');
        component.company = JSON.parse(items[AppSettings.SELECTED_COMPANY]);

        component.notifyCLAManagers(null);

        expect(notify).toHaveBeenCalledWith(jasmine.objectContaining({
            companyName: 'Acme',
            companySFID: '001000000000000AAA',
            claGroupID: 'cla-group-1'
        }));
    });
});
