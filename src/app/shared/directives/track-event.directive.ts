// Copyright The Linux Foundation and each contributor to CommunityBridge.
// SPDX-License-Identifier: MIT

import { Directive, Input, HostListener } from '@angular/core';
import { LfxAnalyticsService } from '../services/lfx-analytics.service';

@Directive({
  selector: '[lfxTrackEvent]'
})
export class TrackEventDirective {
  @Input() lfxTrackEvent = '';
  @Input() lfxTrackEventProperties: Record<string, any> = {};

  constructor(private analyticsService: LfxAnalyticsService) {}

  @HostListener('click', ['$event'])
  onClick(event: Event): void {
    if (this.lfxTrackEvent) {
      const properties = {
        element: (event.target as HTMLElement)?.tagName?.toLowerCase() || 'unknown',
        elementId: (event.target as HTMLElement)?.id || undefined,
        elementClass: (event.target as HTMLElement)?.className || undefined,
        ...this.lfxTrackEventProperties
      };

      this.analyticsService.trackEvent(this.lfxTrackEvent, properties).catch(error => {
        console.error('Failed to track event:', error);
      });
    }
  }
}
