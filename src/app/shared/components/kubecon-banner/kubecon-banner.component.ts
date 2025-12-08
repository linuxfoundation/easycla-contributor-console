// Copyright The Linux Foundation and each contributor to CommunityBridge.
// SPDX-License-Identifier: MIT
// Assisted with Cursor, assisted with Claude AI

import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-kubecon-banner',
  templateUrl: './kubecon-banner.component.html',
  styleUrls: ['./kubecon-banner.component.scss']
})
export class KubeconBannerComponent {
  @Input() text?: string;
  @Input() ctaText?: string;
  @Input() url?: string;
}
