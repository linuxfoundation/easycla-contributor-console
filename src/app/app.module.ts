// Copyright The Linux Foundation and each contributor to CommunityBridge.
// SPDX-License-Identifier: MIT

import { BrowserModule } from '@angular/platform-browser';
import { NgModule, APP_INITIALIZER } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from './shared/shared.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { LoaderInterceptorService } from './shared/services/loader-interceptor.service';
import { AlertService } from './shared/services/alert.service';
import { AlertComponent } from './shared/components/alert/alert.component';
import { IndividualContributorModule } from './modules/individual-contributor/individual-contributor.module';
import { CorporateContributorModule } from './modules/corporate-contributor/corporate-contributor.module';
import { FormsModule } from '@angular/forms';
import { InterceptorService } from './shared/services/interceptor.service';
import { LfxAnalyticsService } from './shared/services/lfx-analytics.service';

// Add initialization factory
export function initializeAnalytics(analyticsService: LfxAnalyticsService) {
  return () => {
    // Initialize analytics and track app start
    analyticsService.trackEvent('Application Initialized', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      app: 'easycla-contributor-console'
    }).catch(error => {
      console.error('Failed to track application initialization:', error);
    });
  };
}

@NgModule({
  declarations: [
    AppComponent,
    AlertComponent
  ],
  imports: [
    HttpClientModule,
    BrowserModule,
    AppRoutingModule,
    NgbModule,
    SharedModule,
    DashboardModule,
    IndividualContributorModule,
    CorporateContributorModule,
    FormsModule,
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: LoaderInterceptorService,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: InterceptorService,
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAnalytics,
      deps: [LfxAnalyticsService],
      multi: true,
    },
    AlertService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
