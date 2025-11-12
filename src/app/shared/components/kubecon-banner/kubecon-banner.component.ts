// Copyright The Linux Foundation and each contributor to CommunityBridge.
// SPDX-License-Identifier: MIT
// Assisted with Cursor, assisted with Claude AI

import { Component } from '@angular/core';

@Component({
  selector: 'app-kubecon-banner',
  templateUrl: './kubecon-banner.component.html',
  styleUrls: ['./kubecon-banner.component.scss']
})
export class KubeconBannerComponent {
  private utmSource = 'CLA-Contributor-Console';

  get registrationUrl(): string {
    return `https://events.linuxfoundation.org/kubecon-cloudnativecon-north-america/register/?utm_source=${this.utmSource}&utm_medium=banner&utm_campaign=KubeCon-NA-2025&utm_content=hero`;
  }
}
