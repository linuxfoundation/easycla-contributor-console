// Copyright The Linux Foundation and each contributor to CommunityBridge.
// SPDX-License-Identifier: MIT

import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from './shared/services/auth.service';
import { IntercomService } from './shared/services/intercom.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnDestroy {
  title = 'easycla-contributor-console';
  hasExpanded: boolean;
  links: any[];

  kubeconBanner = {
    text: 'Meet us in Amsterdam for KubeCon + CloudNativeCon Europe 2026 • Mar 23–26 •',
    ctaText: 'Register now',
    url: 'https://events.linuxfoundation.org/kubecon-cloudnativecon-europe/register/?utm_source=cla-contributor-console&utm_medium=homepage&utm_campaign=18269725-KubeCon-EU-2026&utm_content=hero'
  };

  private intercomBootAttempted = false;
  private userProfileSub: Subscription;

  constructor(
    private auth: AuthService,
    private intercomService: IntercomService,
    private route: ActivatedRoute
  ) {}

  onToggled() {
    this.hasExpanded = !this.hasExpanded;
  }

  ngOnInit() {
    this.mountHeader();
    this.hasExpanded = true;
    this.setupIntercom();
  }

  ngOnDestroy() {
    if (this.userProfileSub) {
      this.userProfileSub.unsubscribe();
    }
  }

  private setupIntercom(): void {
    this.userProfileSub = this.auth.userProfile$.subscribe(userProfile => {
      if (userProfile) {
        if (!this.intercomBootAttempted && environment.intercomId) {
          const intercomJwt = userProfile[environment.auth0IntercomClaim];
          const userId = userProfile[environment.auth0UsernameClaim];

          if (userId && intercomJwt) {
            this.intercomBootAttempted = true;
            this.intercomService
              .boot({
                api_base: environment.intercomApiBase,
                app_id: environment.intercomId,
                intercom_user_jwt: intercomJwt,
                user_id: userId,
                name: userProfile.name,
                email: userProfile.email,
              })
              .catch((error: any) => {
                console.error('AppComponent: Failed to boot Intercom', error);
                this.intercomBootAttempted = false;
              });
          } else {
            console.warn('AppComponent: Intercom not booted — missing required claim(s)', {
              hasUserId: !!userId,
              hasIntercomJwt: !!intercomJwt,
            });
          }
        }
      } else if (userProfile == null) {
        if (this.intercomBootAttempted) {
          this.intercomService.shutdown();
          this.intercomBootAttempted = false;
        }
      }
    });
  }

  private mountHeader(): void {
    const script = document.createElement('script');
    script.setAttribute('src', environment.lfxHeader + '/lfx-header-v2.js');
    script.setAttribute('async', 'true');
    document.head.appendChild(script);
  }
}
