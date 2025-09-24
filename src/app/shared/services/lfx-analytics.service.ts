// Copyright The Linux Foundation and each contributor to CommunityBridge.
// SPDX-License-Identifier: MIT

import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

declare global {
  interface Window {
    LfxAnalytics?: {
      LfxSegmentsAnalytics?: any;
    };
  }
}

@Injectable({
  providedIn: 'root'
})
export class LfxAnalyticsService {
  private analytics: any;
  private isInitialized = false;
  private isScriptLoaded = false;
  private initializationPromise: Promise<void> | null = null;

  constructor(private router: Router) {
    this.initializeService();
  }

  async trackPageView(pageName: string, properties?: Record<string, any>): Promise<void> {
    if (!this.isInitialized || !this.analytics) {
      await this.initializeService();
    }

    if (this.isInitialized && this.analytics) {
      try {
        const pageProperties = {
          path: pageName,
          url: window.location.href,
          title: document.title,
          referrer: document.referrer,
          ...properties
        };

        await this.analytics.page(pageName, pageProperties);
      } catch (error) {
        console.error('Failed to track page view:', error);
      }
    }
  }

  async trackEvent(eventName: string, properties?: Record<string, any>): Promise<void> {
    if (!this.isInitialized || !this.analytics) {
      await this.initializeService();
    }

    if (this.isInitialized && this.analytics) {
      try {
        const eventProperties = {
          url: window.location.href,
          path: window.location.pathname,
          ...properties
        };

        await this.analytics.track(eventName, eventProperties);
      } catch (error) {
        console.error('Failed to track event:', error);
      }
    }
  }

  async identifyAuth0User(auth0User: any): Promise<void> {
    if (!this.isInitialized || !this.analytics) {
      await this.initializeService();
    }

    if (this.isInitialized && this.analytics && auth0User) {
      try {
        await this.analytics.identifyAuth0User(auth0User);
      } catch (error) {
        console.error('Failed to identify Auth0 user:', error);
      }
    }
  }

  async reset(): Promise<void> {
    if (this.isInitialized && this.analytics) {
      try {
        await this.analytics.reset();
      } catch (error) {
        console.error('Failed to reset analytics:', error);
      }
    }
  }

  isAnalyticsInitialized(): boolean {
    return this.isInitialized;
  }

  private async initializeService(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      if (!this.isScriptLoaded) {
        await this.loadAnalyticsScript();
        this.isScriptLoaded = true;
      }

      await this.waitForAnalytics();

      this.analytics = window.LfxAnalytics.LfxSegmentsAnalytics.getInstance();
      await this.analytics.init();
      this.isInitialized = true;

      this.setupRouteTracking();

    } catch (error) {
      console.error('Failed to initialize LFX Segments Analytics:', error);
    }
  }

  private loadAnalyticsScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.LfxAnalytics?.LfxSegmentsAnalytics) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = environment.lfxSegmentAnalyticsUrl;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        resolve();
      };

      script.onerror = (error) => {
        console.error('Failed to load LFX Segments Analytics script:', error);
        reject(new Error('Failed to load analytics script'));
      };

      document.head.appendChild(script);
    });
  }

  private async waitForAnalytics(): Promise<void> {
    const maxAttempts = 50; // 5 seconds max wait time
    let attempts = 0;

    while (!window.LfxAnalytics?.LfxSegmentsAnalytics && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!window.LfxAnalytics?.LfxSegmentsAnalytics) {
      throw new Error('LFX Segments Analytics library not available after timeout');
    }
  }

  private setupRouteTracking(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd)
      )
      .subscribe((event: NavigationEnd) => {
        this.trackPageView(event.urlAfterRedirects || event.url);
      });

    this.trackPageView(this.router.url);
  }
}