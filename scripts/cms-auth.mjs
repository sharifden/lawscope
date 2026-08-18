const CMS_COMPANION_VARIABLE = 'CMS_COMPANION_ORIGIN';
export const CMS_COMPANION_PLACEHOLDER = 'https://lawscope-cms-companion.invalid';
export const APPROVED_CMS_COMPANION_ORIGIN = 'https://candid-choux-61d91a.netlify.app';

function parseCompanionOrigin(rawValue) {
  const value = String(rawValue || '').trim();
  if (!value) return null;

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${CMS_COMPANION_VARIABLE} must be a complete HTTPS origin`);
  }

  const hostname = url.hostname.toLowerCase();
  const isExactOrigin = value === url.origin;
  const isReservedOrLocal =
    hostname.endsWith('.invalid') ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    url.hostname === '127.0.0.1' ||
    url.hostname === '::1';

  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    !isExactOrigin ||
    isReservedOrLocal
  ) {
    throw new Error(
      `${CMS_COMPANION_VARIABLE} must be an exact public HTTPS origin with no credentials, path, query, fragment, trailing slash, or reserved hostname`
    );
  }

  return url.origin;
}

export function resolveCmsCompanionOrigin(environment = process.env) {
  return parseCompanionOrigin(environment[CMS_COMPANION_VARIABLE]);
}

export function resolveBuildCmsCompanionOrigin(environment = process.env) {
  const configuredOrigin = resolveCmsCompanionOrigin(environment);
  if (configuredOrigin) return configuredOrigin;

  // Production already has a live invite-only companion. Inject it only for
  // Vercel production builds so local/preview stay fail-closed unless the
  // owner sets CMS_COMPANION_ORIGIN explicitly.
  if (environment.VERCEL_ENV === 'production') {
    return APPROVED_CMS_COMPANION_ORIGIN;
  }

  return null;
}

export function createCmsAdminCsp(companionOrigin) {
  const connectSource = companionOrigin || CMS_COMPANION_PLACEHOLDER;
  return [
    "default-src 'none'",
    "script-src 'self' 'unsafe-eval' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${connectSource}`,
    "worker-src blob:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'"
  ].join('; ');
}

export function renderCmsAdminShell(source, companionOrigin) {
  const originToken = '{{CMS_COMPANION_ORIGIN}}';
  const cspToken = '{{CMS_ADMIN_CSP}}';
  const originOccurrences = source.split(originToken).length - 1;
  const cspOccurrences = source.split(cspToken).length - 1;

  if (originOccurrences !== 1 || cspOccurrences !== 1) {
    throw new Error('admin/index.html must contain exactly one CMS origin token and one CMS CSP token');
  }

  const escapedOrigin = (companionOrigin || '').replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  const escapedCsp = createCmsAdminCsp(companionOrigin)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;');

  return source
    .replace(originToken, escapedOrigin)
    .replace(cspToken, escapedCsp);
}

export function createCmsAuthManifest({ deploymentEnvironment, companionOrigin }) {
  return {
    module: 32,
    deploymentEnvironment,
    state: companionOrigin ? 'endpoint-configured-account-tests-required' : 'fail-closed-unprovisioned',
    companionOrigin: companionOrigin || null,
    identityEndpoint: companionOrigin ? `${companionOrigin}/.netlify/identity` : null,
    gatewayEndpoint: companionOrigin ? `${companionOrigin}/.netlify/git/github` : null,
    productionAdmin: 'https://getlawscope.com/admin/',
    productionDashboard: 'https://getlawscope.com/dashboard/',
    backend: 'git-gateway',
    branch: 'main',
    publishMode: 'editorial_workflow',
    requiredRole: 'lawscope-editor',
    publicSignupAllowed: false,
    sharedCredentialsAllowed: false,
    accountAcceptanceComplete: false
  };
}
