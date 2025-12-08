// Copyright The Linux Foundation and each contributor to CommunityBridge.
// SPDX-License-Identifier: MIT

import { NgModule } from '@angular/core';
import { HeaderComponent } from './components/header/header.component';
import { CorporateIconComponent } from './svg/corporate-icon/corporate-icon.component';
import { IndividualIconComponent } from './svg/individual-icon/individual-icon.component';
import { ClaIconComponent } from './svg/cla-icon/cla-icon.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { LoaderComponent } from './components/loader/loader.component';
import { StorageService } from './services/storage.service';
import { ProjectTitleComponent } from './components/project-title/project-title.component';
import { TrimCharactersPipe } from './pipes/trim-characters';
import { CheckboxComponent } from './components/checkbox/checkbox.component';
import { AuthService } from './services/auth.service';
import { LfxHeaderService } from './services/lfx-header.service';
import { InterceptorService } from './services/interceptor.service';
import { FooterComponent } from './components/footer/footer.component';
import { ConsentComponent } from './components/consent/consent.component';
import { CommonModule } from '@angular/common';
import { TrackEventDirective } from './directives/track-event.directive';
import { KubeconBannerComponent } from './components/kubecon-banner/kubecon-banner.component';

@NgModule({
    declarations: [
        HeaderComponent,
        CorporateIconComponent,
        IndividualIconComponent,
        ClaIconComponent,
        PageNotFoundComponent,
        LoaderComponent,
        ProjectTitleComponent,
        TrimCharactersPipe,
        CheckboxComponent,
        FooterComponent,
        ConsentComponent,
        TrackEventDirective,
        KubeconBannerComponent
    ],
    imports: [
        CommonModule
    ],
    exports: [
        HeaderComponent,
        CorporateIconComponent,
        IndividualIconComponent,
        ClaIconComponent,
        PageNotFoundComponent,
        LoaderComponent,
        ProjectTitleComponent,
        TrimCharactersPipe,
        CheckboxComponent,
        FooterComponent,
        ConsentComponent,
        TrackEventDirective,
        KubeconBannerComponent
    ],
    providers: [StorageService, AuthService, LfxHeaderService, InterceptorService]
})
export class SharedModule { }
