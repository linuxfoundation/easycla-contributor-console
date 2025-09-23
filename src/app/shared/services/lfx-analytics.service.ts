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

  /**
   * Track a page view
   */
  async trackPageView(url: string, properties?: Record<string, any>): Promise<void> {
    if (!this.isInitialized || !this.analytics) {
      await this.initializeService();
    }

    if (this.isInitialized && this.analytics) {
      try {
        // Extract page name from URL
        const pathSegments = url.split('/').filter(segment => segment);
        const pageName = pathSegments.length > 0
          ? pathSegments[pathSegments.length - 1]
          : 'Home';

        const pageProperties = {
          path: url,
          url: window.location.href,
          title: document.title,
          referrer: document.referrer,
          timestamp: new Date().toISOString(),
          ...properties
        };

        await this.analytics.page(pageName, pageProperties);
        console.log('Page view tracked:', pageName, pageProperties);
      } catch (error) {
        console.error('Failed to track page view:', error);
      }
    }
  }

  /**
   * Track a custom event
   */
  async trackEvent(eventName: string, properties?: Record<string, any>): Promise<void> {
    if (!this.isInitialized || !this.analytics) {
      await this.initializeService();
    }

    if (this.isInitialized && this.analytics) {
      try {
        const eventProperties = {
          timestamp: new Date().toISOString(),
          url: window.location.href,
          path: window.location.pathname,
          ...properties
        };

        await this.analytics.track(eventName, eventProperties);
        console.log('Event tracked:', eventName, eventProperties);
      } catch (error) {
        console.error('Failed to track event:', error);
      }
    }
  }

  /**
   * Identify a user with Auth0 integration
   */
  async identifyAuth0User(auth0User: any): Promise<void> {
    if (!this.isInitialized || !this.analytics) {
      await this.initializeService();
    }

    if (this.isInitialized && this.analytics && auth0User) {
      try {
        // Use the dedicated Auth0 method for better integration
        await this.analytics.identifyAuth0User(auth0User);
        console.log('Auth0 user identified:', auth0User.sub);

        // Track authentication event
        await this.trackEvent('User Authenticated', {
          method: 'auth0',
          userId: auth0User.sub,
          email: auth0User.email,
          name: auth0User.name
        });
      } catch (error) {
        console.error('Failed to identify Auth0 user:', error);
      }
    }
  }

  /**
   * Reset analytics state (typically called on logout)
   */
  async reset(): Promise<void> {
    if (!this.isInitialized || !this.analytics) {
      await this.initializeService();
    }

    if (this.isInitialized && this.analytics) {
      try {
        await this.analytics.reset();
        console.log('Analytics state reset');
      } catch (error) {
        console.error('Failed to reset analytics:', error);
      }
    }
  }

  /**
   * Check if analytics is initialized
   */
  isAnalyticsInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Initialize the analytics service
   */
  private async initializeService(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      // Load the script if not already loaded
      if (!this.isScriptLoaded) {
        await this.loadAnalyticsScript();
        this.isScriptLoaded = true;
      }

      // Wait for the library to be available
      await this.waitForAnalytics();

      // Initialize the analytics instance
      this.analytics = window.LfxAnalytics.LfxSegmentsAnalytics.getInstance();
      await this.analytics.init();
      this.isInitialized = true;

      // Set up route tracking
      this.setupRouteTracking();

      console.log('LFX Segments Analytics initialized successfully');
    } catch (error) {
      console.error('Failed to initialize LFX Segments Analytics:', error);
    }
  }

  /**
   * Dynamically load the analytics script based on environment
   */
  private loadAnalyticsScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      if (window.LfxAnalytics?.LfxSegmentsAnalytics) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = environment.lfxSegmentAnalyticsUrl;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        console.log('LFX Segments Analytics script loaded');
        resolve();
      };

      script.onerror = (error) => {
        console.error('Failed to load LFX Segments Analytics script:', error);
        reject(new Error('Failed to load analytics script'));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Wait for the analytics library to be available
   */
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

  /**
   * Set up automatic route change tracking
   */
  private setupRouteTracking(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd)
      )
      .subscribe((event: NavigationEnd) => {
        this.trackPageView(event.urlAfterRedirects || event.url);
      });

    // Track initial page view
    this.trackPageView(this.router.url);
  }
}