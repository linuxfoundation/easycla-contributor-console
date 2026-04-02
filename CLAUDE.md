# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
yarn install

# Serve locally (port 8100 is required for LFX header login/logout)
yarn serve-local        # http://localhost:8100
yarn serve:dev:local    # dev config on port 8100

# Build
yarn build              # local
yarn build:dev          # dev environment
yarn build:staging      # staging environment
yarn build:prod         # production environment

# Tests
yarn test               # run all unit tests headless
ng test                 # run with watch mode

# Run a specific test file
ng test --include='**/some.component.spec.ts'

# Lint
yarn lint               # TSLint
yarn eslint             # ESLint
yarn eslint-fix         # auto-fix ESLint violations
```

**Pre-push hook**: ESLint runs automatically via Husky on `git push`.

**Local dev URL pattern**: `http://localhost:8100/#/cla/project/{projectId}/user/{userId}?redirect={URL}`

## Architecture

**Angular 13** app with hash-based routing (`useHash: true`). No NgRx — state is held in RxJS BehaviorSubjects inside services.

### Module structure

- `core/` — models and the main API service (`cla-contributor.service.ts`)
- `shared/` — `SharedModule` with header, footer, loader, alert, and other reusable components; interceptors and utility services
- `modules/dashboard/` — entry point containers: `ClaDashboardComponent` (GitHub/GitLab), `GerritDashboardComponent`, `AuthDashboardComponent`
- `modules/individual-contributor/` — individual CLA signing flow
- `modules/corporate-contributor/` — corporate CLA flow (company selection, manager request, authorization)

### Environment / config

- `src/environments/environment*.ts` — swapped at build time via `angular.json` `fileReplacements`
- `src/app/config/cla-env-config.json` — runtime API endpoints and Auth0 credentials (populated by `prebuild:*` scripts that pull from AWS SSM)
- `src/app/config/cla-env-utils.ts` — imports and exports `cla-env-config.json` as `EnvConfig`
- `src/app/config/app-settings.ts` — app-wide constants (localStorage keys, regex patterns, retry counts)

### Authentication

Auth0 (`@auth0/auth0-spa-js`) managed by `AuthService`. `InterceptorService` attaches the Auth0 ID token as `Authorization: Bearer {token}` on every HTTP request. Session data is persisted to localStorage using keys defined in `AppSettings`.

### API communication

`ClaContributorService` is the single API client. It supports four versioned endpoint bases:

| Version | Config key | Purpose |
|---------|-----------|---------|
| V1 | `api-base` | Legacy Gerrit/user endpoints |
| V2 | `api-base` | Users, projects, signatures |
| V3 | `api-base` | Organizations, company search |
| V4 | `api-v4-base` | Templates, companies, managers, designees |

Local dev overrides fall back to `localhost:5000` (V1/V2) and `localhost:8080` (V3/V4).

Errors are handled per-call via `handleError()` which surfaces messages through `AlertService`. `LoaderInterceptorService` automatically shows/hides the global loader on HTTP activity.

### Key flows

1. **Individual CLA** — `ClaDashboardComponent` → `IndividualDashboardComponent` → DocuSign redirect
2. **Corporate CLA** — `ClaDashboardComponent` → `CorporateDashboardComponent` → company lookup/selection → manager request or direct signing
3. **Gerrit** — separate `GerritDashboardComponent` entry point; contract type stored in route params
