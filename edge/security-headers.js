// Copyright The Linux Foundation and each contributor to CommunityBridge.
// SPDX-License-Identifier: MIT

function getHeaders(env, isDevServer) {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-XSS-Protection': '1',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': generateCSP(env, isDevServer),
    'Cache-Control': 's-maxage=31536000'
  };
}

function getSources(environmentSources, sourceType) {
  if (environmentSources[sourceType] === undefined) {
    return [];
  }
  return environmentSources[sourceType].filter((source) => typeof source === 'string');
}

function generateCSP(env, isDevServer) {
  const SELF = '\'self\'';
  const UNSAFE_INLINE = '\'unsafe-inline\'';
  const UNSAFE_EVAL = '\'unsafe-eval\'';
  const NONE = '\'none\'';

  let connectSources = [
    SELF,
    'https://linuxfoundation-dev.auth0.com/',
    'https://linuxfoundation-staging.auth0.com/',
    'https://sso.linuxfoundation.org/',
    'https://api.dev.lfcla.com/',
    'https://api.staging.lfcla.com/',
    'https://api.lfcla.com/',
    'https://api.easycla.lfx.linuxfoundation.org/',
    'https://communitybridge.org/',
    'https://api-gw.dev.platform.linuxfoundation.org/',
    'https://api-gw.staging.platform.linuxfoundation.org/',
    'https://api-gw.platform.linuxfoundation.org/',
    'https://api.lfcla.staging.platform.linuxfoundation.org/',
    'https://api.lfcla.dev.platform.linuxfoundation.org/',
    'https://easycla.dev.communitybridge.org/',
    'https://easycla.lfx.linuxfoundation.org/',
    'https://contributor.easycla.lfx.linuxfoundation.org/',
    'https://cmp.osano.com', // Cookie consent management
    'https://www.google-analytics.com', // Google Analytics beacons
    'https://analytics.google.com', // Google Analytics 4
    'https://www.googletagmanager.com', // GTM fetch requests
    'https://stats.g.doubleclick.net', // DoubleClick stats
    'https://lfx-segment.dev.platform.linuxfoundation.org', // LFX Segments Analytics (dev)
    'https://lfx-segment.platform.linuxfoundation.org', // LFX Segments Analytics (prod)
    'https://api.segment.io', // Segment Analytics API
    'https://cdn.segment.com', // Segment CDN for configurations
  ];
  let scriptSources = [SELF, UNSAFE_EVAL, UNSAFE_INLINE,
    'https://cdn.dev.platform.linuxfoundation.org/lfx-header-v2.js',
    'https://cdn.platform.linuxfoundation.org/lfx-header-v2.js',
    'https://cdn.dev.platform.linuxfoundation.org/lfx-header-v2-no-zone.js',
    'https://cdn.staging.platform.linuxfoundation.org/lfx-header-v2-no-zone.js',
    'https://cdn.platform.linuxfoundation.org/lfx-header-v2-no-zone.js',
    'https://cdn.dev.platform.linuxfoundation.org/lfx-footer-no-zone.js',
    'https://cdn.staging.platform.linuxfoundation.org/lfx-footer-no-zone.js',
    'https://cdn.platform.linuxfoundation.org/lfx-footer-no-zone.js',
    'https://cmp.osano.com', // Cookie consent
    'https://www.googletagmanager.com', // Google Tag Manager for Osano
    'https://lfx-segment.dev.platform.linuxfoundation.org', // LFX Segments Analytics (dev)
    'https://lfx-segment.platform.linuxfoundation.org', // LFX Segments Analytics (prod)
    'https://cdn.segment.com' // Segment CDN for scripts and configurations
  ];

  const styleSources = [SELF, UNSAFE_INLINE, 'https://use.fontawesome.com/', 'https://communitybridge.org/'];

  if (isDevServer) {
    connectSources = [...connectSources, 'https://localhost:8100/sockjs-node/', 'wss://localhost:8100/sockjs-node/'];
    // The webpack dev server uses system js which violates the unsafe-eval exception. This doesn't happen in the
    // production AOT build.
    // The development build needs unsafe inline assets.
    scriptSources = [...scriptSources, UNSAFE_EVAL];
  }

  const CSP_SOURCES = env ? env.CSP_SOURCES : undefined;
  const environmentSources = JSON.parse(CSP_SOURCES || '{}');

  const sources = {
    'default-src': [NONE],
    'img-src': ['*'], // allow all sources
    // 'img-src': [
    //   SELF,
    //   'data:',
    //   'https://s3.amazonaws.com/cla-project-logo-dev/',
    //   'https://s3.amazonaws.com/cla-project-logo-staging/',
    //   'https://s3.amazonaws.com/cla-project-logo-prod/',
    //   'https://s3.amazonaws.com/lf-master-project-logos-prod/',
    //   'https://lf-master-project-logos-prod.s3.us-east-2.amazonaws.com/',
    //   'https://s.gravatar.com/',
    //   'https://lh3.googleusercontent.com/',
    //   'https://platform-logos-myprofile-api-dev.s3.us-east-2.amazonaws.com/',
    //   'https://cdn.platform.linuxfoundation.org/', // cdn favicon: https://cdn.platform.linuxfoundation.org/assets/lf-favicon.png
    //   'https://platform-logos-myprofile-api-prod.s3.us-east-2.amazonaws.com/',
    // ],
    'script-src': scriptSources,
    'style-src': styleSources, // Unfortunately using Angular basically requires inline styles.
    'font-src': [SELF, 'data:', 'https://use.fontawesome.com/', 'https://communitybridge.org/'],
    'connect-src': connectSources,
    'frame-ancestors': [NONE],
    'form-action': [NONE],
    'worker-src': [SELF, 'blob:'],
    'base-uri': [SELF],
    // frame-src restricts what iframe's you can put on your website
    'frame-src': [SELF, 'data:',
      'https://cla-signature-files-dev.s3.amazonaws.com/',
      'https://s3.amazonaws.com/cla-project-logo-dev/',
      'https://cla-signature-files-staging.s3.amazonaws.com/',
      'https://s3.amazonaws.com/cla-project-logo-staging/',
      'https://cla-signature-files-prod.s3.amazonaws.com/',
      'https://s3.amazonaws.com/cla-project-logo-prod/',
      'https://linuxfoundation-dev.auth0.com',
      'https://linuxfoundation-staging.auth0.com',
      'https://linuxfoundation.auth0.com',
      'https://sso.linuxfoundation.org/',
      'https://cmp.osano.com' // Cookie consent UI iframe
    ],
    'child-src': [],
    'media-src': [],
    'manifest-src': [SELF],
    'object-src': ['data:', '*']
  };

  return Object.entries(sources)
    .map((keyValuePair) => {
      const additionalSources = getSources(environmentSources, keyValuePair[0]);
      return [keyValuePair[0], [...keyValuePair[1], ...additionalSources]];
    })
    .filter((keyValuePair) => keyValuePair[1].length !== 0)
    .map((keyValuePair) => {
      const entry = keyValuePair[1].join(' ');
      return `${keyValuePair[0]} ${entry};`;
    })
    .join(' ');
}

module.exports = getHeaders;
