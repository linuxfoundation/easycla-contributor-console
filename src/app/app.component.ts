// Copyright The Linux Foundation and each contributor to CommunityBridge.
// SPDX-License-Identifier: MIT

import { Component } from '@angular/core';
import { environment } from 'src/environments/environment';
import { AuthService } from './shared/services/auth.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'easycla-contributor-console';
  hasExpanded: boolean;
  links: any[];

  kubeconBanner = {
    text: 'Meet us in Amsterdam for KubeCon + CloudNativeCon Europe 2026 • Mar 23–26 •',
    ctaText: 'Register now',
    url: 'https://events.linuxfoundation.org/kubecon-cloudnativecon-europe/register/?utm_source=cla-contributor-console&utm_medium=homepage&utm_campaign=18269725-KubeCon-EU-2026&utm_content=hero'
  };

  constructor(private auth:AuthService, private route: ActivatedRoute){}

  onToggled() {
    this.hasExpanded = !this.hasExpanded;
  }

  ngOnInit() {
    this.mountHeader();
    this.hasExpanded = true;
  }

  private mountHeader(): void {
    const script = document.createElement('script');
    script.setAttribute('src', environment.lfxHeader + '/lfx-header-v2.js');
    script.setAttribute('async', 'true');
    document.head.appendChild(script);
  }
}
