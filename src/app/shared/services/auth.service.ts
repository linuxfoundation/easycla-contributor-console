/* eslint-disable eqeqeq */
/* eslint-disable @typescript-eslint/prefer-for-of */
// Copyright The Linux Foundation and each contributor to CommunityBridge.
// SPDX-License-Identifier: MIT

import { Injectable } from '@angular/core';
import { BehaviorSubject, from, Observable, of, throwError } from 'rxjs';
import createAuth0Client from '@auth0/auth0-spa-js';
import Auth0Client from '@auth0/auth0-spa-js/dist/typings/Auth0Client';
import { catchError, concatMap, shareReplay, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import * as querystring from 'query-string';
import Url from 'url-parse';
import { EnvConfig } from '../../config/cla-env-utils';
import { AppSettings } from 'src/app/config/app-settings';
import { StorageService } from './storage.service';
import { LfxAnalyticsService } from './lfx-analytics.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  public openCLADialog$ = new BehaviorSubject<any>(false);
  auth0Options = {
    domain: EnvConfig.default['auth0-domain'], // e.g linuxfoundation-dev.auth0.com
    clientId: EnvConfig.default['auth0-clientId'],
    callbackUrl: window.location.origin + '/#/auth'
  };

  currentHref = window.location.href;
  loading$ = new BehaviorSubject<any>(true);

  // Create an observable of Auth0 instance of client
  auth0Client$ = (from(
    createAuth0Client({
      domain: this.auth0Options.domain,
      client_id: this.auth0Options.clientId,
    })
  ) as Observable<Auth0Client>).pipe(
    shareReplay(1), // Every subscription receives the same shared value
    catchError((err) => {
      this.loading$.next(false);
      return throwError(err);
    })
  );

  // Define observables for SDK methods that return promises by default
  // For each Auth0 SDK method, first ensure the client instance is ready
  // concatMap: Using the client instance, call SDK method; SDK returns a promise
  // from: Convert that resulting promise into an observable

  isAuthenticated$ = this.auth0Client$.pipe(
    concatMap((client: Auth0Client) => from(client.isAuthenticated())),
    tap((res: any) => {
      this.loggedIn = res;
    })
  );

  handleRedirectCallback$ = this.auth0Client$.pipe(
    concatMap((client: Auth0Client) =>
      from(client.handleRedirectCallback(this.currentHref))
    )
  );

  // Create subject and public observable of user profile data

  loggedIn = false;
  userProfile;
  userProfileSubject$ = new BehaviorSubject<any>(null);
  userProfile$ = this.userProfileSubject$.asObservable();

  // Create a local property for login status

  constructor(
    private router: Router,
    private storageService: StorageService,
    private analyticsService: LfxAnalyticsService
  ) {

    this.initializeApplication();
  }

  async initializeApplication() {
    await this.localAuthSetup();
    this.handlerReturnToAfterLogout();
  }

  handlerReturnToAfterLogout() {
    const hasGerrit = JSON.parse(this.storageService.getItem(AppSettings.HAS_GERRIT));
    this.storageService.removeItem(AppSettings.AUTH_DATA);
    if (!hasGerrit) {
      const { query } = querystring.parseUrl(this.currentHref);
      const returnTo = query.returnTo;
      if (returnTo) {
        const target = this.getTargetRouteFromReturnTo(returnTo);
        this.router.navigate([target]);
      }
    }
  }
  // When calling, options can be passed if desired
  // https://auth0.github.io/auth0-spa-js/classes/auth0client.html#getuser

  getUser$(options?): Observable<any> {
    return this.auth0Client$.pipe(
      concatMap((client: Auth0Client) => from(client.getUser(options))),
      tap((user) => {
        this.setSession(user);
        this.setUserInHeader(user);
        this.userProfileSubject$.next(user);
        // Identify user in analytics
        if (user) {
          this.analyticsService.identifyAuth0User(user).catch(error => {
            console.error('Failed to identify user in analytics:', error);
          });
        }
      })
    );
  }

  setUserInHeader(user) {
    const lfHeaderEl: any = document.getElementById('lfx-header-v2');
    lfHeaderEl.authuser = user;
  }

  login() {
    // Need to increase timeout to 1500 as for slower network it gives an error
    // Cannot read property 'querySelector' of null
    // TODO: verify this still works
    setTimeout(() => {
      const button = document
        .querySelector('#lfx-header-v2')
        .shadowRoot.querySelector('app-lfx-user-icon') as HTMLElement;
      if (button) {
        button.click();
      }
    }, 500);
  }

  logout() {
    // Reset analytics state before logout
    this.analyticsService.reset().catch(error => {
      console.error('Failed to reset analytics state:', error);
    });

    const { query, fragmentIdentifier } = querystring.parseUrl(
      window.location.href,
      { parseFragmentIdentifier: true }
    );
    const qs = {
      ...query,
      returnTo: window.location.href,
    };
    const searchStr = querystring.stringify(qs);
    const searchPart = searchStr ? `?${searchStr}` : '';
    const fragmentPart = fragmentIdentifier ? `#${fragmentIdentifier}` : '';
    const request = {
      client_id: this.auth0Options.clientId,
      returnTo: `${window.location.origin}${searchPart}${fragmentPart}`,
    };
    this.auth0Client$.subscribe((client: Auth0Client) =>{
        client.logout(request);
      }
    );
  }


  getTokenSilently$(options?): Observable<any> {
    return this.auth0Client$.pipe(
      concatMap((client: Auth0Client) => from(client.getTokenSilently(options)))
    );
  }

  getIdToken$(options?): Observable<any> {
    return this.auth0Client$.pipe(
      // *info: if getIdToken fails , just return empty in the catchError
      concatMap((client: Auth0Client) =>
        from(client.getIdTokenClaims(options))
      ),
      concatMap((claims: any) => of((claims && claims.__raw) || '')),
      catchError(() => of(''))
    );
  }

  private async localAuthSetup() {
    // This should only be called on app initialization
    // Set up local authentication streams
    const checkAuth$ = this.isAuthenticated$.pipe(
      concatMap((loggedIn: boolean) => {
        if (loggedIn) {
          // If authenticated, get user and set in app
          // NOTE: you could pass options here if needed
          this.loading$.next(false);
          return this.getUser$();
        }
        this.auth0Client$
          .pipe(
            // https://auth0.com/docs/libraries/auth0-single-page-app-sdk#get-access-token-with-no-interaction
            // *info: Allow check user session in public pages to avoid redirecting to login page
            concatMap((client: any) =>
              from(client.getTokenSilently({ ignoreCache: true }))
            ),
            concatMap(() => this.getUser$()),
            concatMap((user) => {
              if (user) {
                return this.isAuthenticated$;
              }
              this.checkUserSessionByCookie();
              return of(null);
            }),
            catchError(() => {
              // *info: by pass error, no needed, it is login_required
              this.checkUserSessionByCookie();
              return of(null);
            })
          )
          .subscribe(() => {
            this.loading$.next(false);
          });
        // If not authenticated, return stream that emits 'false'
        return of(loggedIn);
      })
    );
    checkAuth$.subscribe();
  }

  private checkUserSessionByCookie() {
    const cookieName = `auth-${this.auth0Options.domain}`;
    const cookieExists = this.getCookie(cookieName);
    if (cookieExists) {
      console.log('triggering login by cookies ');
      this.login();
      return;
    }
  }

  private getCookie(cname) {
    const name = cname + '=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');

    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) === 0) {
        return c.substring(name.length, c.length);
      }
    }
    return '';
  }

  private getTargetRouteFromReturnTo(returnTo) {
    if (!returnTo) {
      return '';
    }
    const { fragmentIdentifier } = querystring.parseUrl(returnTo, {
      parseFragmentIdentifier: true,
    });
    if (fragmentIdentifier) {
      return fragmentIdentifier;
    }
    const { pathname } = new Url(returnTo);
    return pathname || '/';
  }

  /* Extra method added */
  private setSession(authResult): void {
    const sessionData = {
      userid: authResult.nickname,
      user_email: authResult.email,
      user_name: authResult.name
    };
    this.storageService.setItem(AppSettings.AUTH_DATA, sessionData);
  }
}
