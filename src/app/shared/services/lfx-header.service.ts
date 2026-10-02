// Copyright The Linux Foundation and each contributor to CommunityBridge.
// SPDX-License-Identifier: MIT

import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { IntercomService } from './intercom.service';
import { EnvConfig } from '../../config/cla-env-utils';
import { AppSettings } from '../../config/app-settings';

@Injectable({
  providedIn: 'root',
})
export class LfxHeaderService {
  links: any[];

  constructor(private auth: AuthService, private intercomService: IntercomService) {
    this.setUserInLFxHeader();
    this.setLinks();
    this.setCallBackUrl();
  }

  setLinks() {
    this.links = [
      {
        title: 'Project Login',
        url: EnvConfig.default[AppSettings.PROJECT_CONSOLE_LINK_V2],
      },
      {
        title: 'CLA Manager Login',
        url: EnvConfig.default[AppSettings.CORPORATE_CONSOLE_LINK_V2],
      },
      {
        title: 'Developer',
        url: AppSettings.LEARN_MORE,
      },
    ];
    const element: any = document.getElementById('lfx-header-v2');
    if (!element) {
      return;
    }
    element.links = this.links;
  }

  setSupportClickHandler(): void {
    const lfHeaderEl: any = document.getElementById('lfx-header-v2');
    if (!lfHeaderEl) {
      return;
    }
    lfHeaderEl.onsupportclick = () => {
      if (window.Intercom) {
        window.Intercom('show');
      }
    };
  }

  setCallBackUrl() {
    const lfHeaderEl: any = document.getElementById('lfx-header-v2');
    if (lfHeaderEl) {
      lfHeaderEl.callbackurl = this.auth.auth0Options.callbackUrl;
    }
  }

  setUserInLFxHeader(): void {
    setTimeout(() => {
      const lfHeaderEl: any = document.getElementById('lfx-header-v2');
      if (lfHeaderEl) {
        this.auth.userProfile$.subscribe((data) => {
          if (data) {
            // The header logout redirects to Auth0 before userProfile$ emits null, so
            // clear the Intercom session here. Must be set before authuser.
            lfHeaderEl.beforeLogout = () => this.intercomService.shutdown();
            lfHeaderEl.authuser = data;
          }
        });
      }
    }, 2000);
  }
}
