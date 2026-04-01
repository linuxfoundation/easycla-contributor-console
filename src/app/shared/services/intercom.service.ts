// Copyright The Linux Foundation and each contributor to CommunityBridge.
// SPDX-License-Identifier: MIT

import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface IntercomBootOptions {
  [key: string]: any;
  api_base?: string;
  app_id?: string;
  user_id?: string;
  name?: string;
  email?: string;
  created_at?: number;
  intercom_user_jwt?: string;
}

declare global {
  interface Window {
    Intercom?: any;
    intercomSettings?: any;
  }
}

@Injectable({ providedIn: 'root' })
export class IntercomService {
  private isLoaded = false;
  private isBooted = false;
  private isLoading = false;
  private bootedWithIdentity = false;

  public boot(options: IntercomBootOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Window is undefined'));
        return;
      }

      if (!environment.intercomId) {
        reject(new Error('No Intercom ID configured'));
        return;
      }

      if (this.isBooted) {
        if (options.user_id && !this.bootedWithIdentity) {
          this.shutdownForReboot();
        } else {
          this.update(this.stripBootKeys(options));
          resolve();
          return;
        }
      }

      if (!this.isLoaded && !this.isLoading) {
        this.isLoading = true;
        this.loadIntercomScript();
      }

      if (options.intercom_user_jwt) {
        window.intercomSettings = window.intercomSettings || {};
        window.intercomSettings.intercom_user_jwt = options.intercom_user_jwt;
      }

      const checkLoaded = setInterval(() => {
        if (this.isLoaded && window.Intercom) {
          clearInterval(checkLoaded);
          clearTimeout(timeoutHandle);

          if (this.isBooted) {
            if (options.user_id && !this.bootedWithIdentity) {
              this.shutdownForReboot();
            } else {
              this.update(this.stripBootKeys(options));
              resolve();
              return;
            }
          }

          this.isBooted = true;

          try {
            const bootOptions = this.stripJwt(options);

            window.Intercom('boot', {
              api_base: environment.intercomApiBase,
              app_id: environment.intercomId,
              ...bootOptions,
            });
            this.bootedWithIdentity = !!bootOptions.user_id;

            if (bootOptions.user_id) {
              try {
                window.Intercom('update', {
                  user_id: bootOptions.user_id,
                  name: bootOptions.name,
                  email: bootOptions.email,
                });
              } catch (updateError) {
                console.warn('IntercomService: Update after boot failed', updateError);
              }
            }

            resolve();
          } catch (error) {
            this.isBooted = false;
            console.error('IntercomService: Boot failed', error);
            reject(error);
          }
        }
      }, 100);

      const timeoutHandle = setTimeout(() => {
        clearInterval(checkLoaded);
        if (!this.isBooted) {
          this.isLoading = false;
          reject(new Error('Intercom script failed to load — check network, CSP, or ad blockers'));
        }
      }, 10000);
    });
  }

  public update(data?: Partial<IntercomBootOptions>): void {
    if (typeof window !== 'undefined' && window.Intercom && this.isBooted) {
      try {
        window.Intercom('update', data || {});
      } catch (error) {
        console.error('IntercomService: Update failed', error);
      }
    }
  }

  public show(): void {
    if (typeof window !== 'undefined' && window.Intercom && this.isBooted) {
      try {
        window.Intercom('show');
      } catch (error) {
        console.error('IntercomService: Show failed', error);
      }
    }
  }

  public hide(): void {
    if (typeof window !== 'undefined' && window.Intercom && this.isBooted) {
      try {
        window.Intercom('hide');
      } catch (error) {
        console.error('IntercomService: Hide failed', error);
      }
    }
  }

  public shutdown(): void {
    if (typeof window !== 'undefined') {
      if (window.intercomSettings?.intercom_user_jwt) {
        delete window.intercomSettings.intercom_user_jwt;
      }

      if (window.Intercom && this.isBooted) {
        try {
          window.Intercom('shutdown');
          this.isBooted = false;
          this.bootedWithIdentity = false;
        } catch (error) {
          console.error('IntercomService: Shutdown failed', error);
        }
      }
    }
  }

  public trackEvent(eventName: string, metadata?: Record<string, any>): void {
    if (typeof window !== 'undefined' && window.Intercom && this.isBooted) {
      try {
        window.Intercom('trackEvent', eventName, metadata);
      } catch (error) {
        console.error('IntercomService: Track event failed', error);
      }
    }
  }

  public isIntercomBooted(): boolean {
    return this.isBooted;
  }

  private shutdownForReboot(): void {
    if (typeof window !== 'undefined' && window.Intercom) {
      try {
        window.Intercom('shutdown');
      } catch (error) {
        console.warn('IntercomService: Shutdown for reboot failed', error);
      }
    }
    this.isBooted = false;
    this.bootedWithIdentity = false;
  }

  private stripJwt(options: IntercomBootOptions): IntercomBootOptions {
    const result = { ...options };
    delete result.intercom_user_jwt;
    return result;
  }

  private stripBootKeys(options: IntercomBootOptions): IntercomBootOptions {
    const result = { ...options };
    delete result.intercom_user_jwt;
    delete result.app_id;
    delete result.api_base;
    return result;
  }

  private loadIntercomScript(): void {
    if (this.isLoaded || typeof window === 'undefined') {
      return;
    }

    this.initializeIntercomFunction();

    window.intercomSettings = {
      ...(window.intercomSettings || {}),
      api_base: environment.intercomApiBase,
      app_id: environment.intercomId,
    };

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = `https://widget.intercom.io/widget/${environment.intercomId}`;

    script.onload = () => {
      this.isLoaded = true;
      this.isLoading = false;
    };

    script.onerror = error => {
      this.isLoading = false;
      console.error('IntercomService: Failed to load script', error);
    };

    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript?.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      (document.head || document.body).appendChild(script);
    }
  }

  private initializeIntercomFunction(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const w = window as any;
    const ic = w.Intercom;

    if (typeof ic === 'function') {
      ic('reattach_activator');
      ic('update', w.intercomSettings);
    } else {
      const i: any = (...args: any[]) => { i.c(args); };
      i.q = [];
      i.c = (args: any) => { i.q.push(args); };
      w.Intercom = i;
    }
  }
}
