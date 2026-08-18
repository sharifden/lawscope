import {
  PRODUCTION_CMS_PUBLIC_ORIGIN,
  resolveCmsGatewayUpstreamOrigin
} from '../scripts/cms-auth.mjs';

export const config = {
  api: {
    bodyParser: false
  }
};

const ALLOWED_METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
const FORWARDED_REQUEST_HEADERS = [
  'accept',
  'accept-language',
  'authorization',
  'content-type',
  'if-match',
  'if-none-match',
  'x-netlify-client',
  'x-requested-with'
];
const FORWARDED_RESPONSE_HEADER_NAMES = new Map([
  ['content-type', 'Content-Type'],
  ['etag', 'ETag'],
  ['last-modified', 'Last-Modified'],
  ['retry-after', 'Retry-After'],
  ['vary', 'Vary'],
  ['www-authenticate', 'WWW-Authenticate'],
  ['x-ratelimit-limit', 'X-RateLimit-Limit'],
  ['x-ratelimit-remaining', 'X-RateLimit-Remaining'],
  ['x-ratelimit-reset', 'X-RateLimit-Reset']
]);
const BLOCKED_RESPONSE_HEADER_PREFIXES = ['access-control-'];
const MAX_BODY_BYTES = 15 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 15000;
const PROXY_RESPONSE_HEADERS = Object.freeze({
  'Cache-Control': 'no-store, max-age=0',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-Robots-Tag': 'noindex, nofollow, noarchive'
});

function headerValue(headers, name) {
  if (!headers) return '';
  const direct = headers[name];
  if (Array.isArray(direct)) return String(direct[0] || '').trim();
  if (direct !== undefined && direct !== null) return String(direct).trim();

  const lowerName = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (String(key).toLowerCase() !== lowerName) continue;
    return Array.isArray(value) ? String(value[0] || '').trim() : String(value || '').trim();
  }
  return '';
}

function jsonResponse(status, payload, extraHeaders = {}) {
  return {
    status,
    headers: {
      ...PROXY_RESPONSE_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders
    },
    body: JSON.stringify(payload)
  };
}

function allowedRequestOrigins(environment) {
  const origins = new Set([PRODUCTION_CMS_PUBLIC_ORIGIN, 'https://www.getlawscope.com']);
  for (const value of [environment.VERCEL_URL, environment.VERCEL_PROJECT_PRODUCTION_URL]) {
    if (!value) continue;
    try {
      origins.add(new URL(`https://${String(value).replace(/^https?:\/\//, '')}`).origin);
    } catch {
      // Ignore malformed platform metadata rather than widening access.
    }
  }
  return origins;
}

function requestOriginIsAllowed(request, environment) {
  const originValue = headerValue(request.headers, 'origin');
  if (!originValue) return true;

  try {
    return allowedRequestOrigins(environment).has(new URL(originValue).origin);
  } catch {
    return false;
  }
}

export function normalizeCmsGatewayPath(rawPath) {
  const value = String(rawPath || '').trim();
  if (!value.startsWith('/.netlify/')) return null;
  if (/[\u0000-\u001f\s]/.test(value)) return null;
  if (value.includes('\\') || value.includes('//')) return null;

  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }

  if (decoded.includes('\0') || decoded.includes('\\') || decoded.includes('//') || decoded.includes('..')) {
    return null;
  }
  if (decoded.includes('?') || decoded.includes('#') || decoded.includes('@')) return null;

  const normalized = decoded.length > 1 ? decoded.replace(/\/+$/, '') : decoded;
  if (
    normalized !== '/.netlify/identity' &&
    !normalized.startsWith('/.netlify/identity/') &&
    normalized !== '/.netlify/git' &&
    !normalized.startsWith('/.netlify/git/')
  ) {
    return null;
  }

  return normalized;
}

export function resolveCmsGatewayRequestPath(request) {
  let url;
  try {
    url = new URL(request.url || '/', PRODUCTION_CMS_PUBLIC_ORIGIN);
  } catch {
    return null;
  }

  const candidates = [url.searchParams.get('path')];
  const pathname = url.pathname || '';
  if (pathname.startsWith('/api/cms-gateway/')) {
    candidates.push(`/.netlify/${pathname.slice('/api/cms-gateway/'.length)}`);
  } else if (pathname.startsWith('/.netlify/')) {
    candidates.push(pathname);
  }

  for (const candidate of candidates) {
    const normalized = normalizeCmsGatewayPath(candidate);
    if (normalized) return { path: normalized, search: url.searchParams };
  }
  return null;
}

async function readRequestBody(request) {
  if (request.body === undefined || request.body === null || request.body === '') {
    return { buffer: null, bytes: 0 };
  }
  if (Buffer.isBuffer(request.body)) {
    return { buffer: request.body, bytes: request.body.length };
  }
  if (typeof request.body === 'string') {
    const buffer = Buffer.from(request.body);
    return { buffer, bytes: buffer.length };
  }
  if (typeof request.body[Symbol.asyncIterator] === 'function') {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of request.body) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buffer.length;
      if (bytes > MAX_BODY_BYTES) {
        const error = new RangeError('Request body too large.');
        error.code = 'BODY_TOO_LARGE';
        throw error;
      }
      chunks.push(buffer);
    }
    return { buffer: Buffer.concat(chunks), bytes };
  }
  const encoded = JSON.stringify(request.body);
  const buffer = Buffer.from(encoded);
  return { buffer, bytes: buffer.length };
}

function collectForwardedRequestHeaders(request) {
  const headers = {};
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = headerValue(request.headers, name);
    if (value) headers[name] = value;
  }
  return headers;
}

function rewriteUpstreamLocation(location, upstreamOrigin) {
  if (!location) return null;
  try {
    const url = new URL(location, `${upstreamOrigin}/`);
    if (url.origin !== upstreamOrigin) return null;
    const normalized = normalizeCmsGatewayPath(url.pathname.replace(/\/+$/, '') || url.pathname);
    if (!normalized) return null;
    return `${PRODUCTION_CMS_PUBLIC_ORIGIN}${normalized}${url.search}`;
  } catch {
    return null;
  }
}

function collectForwardedResponseHeaders(upstreamHeaders, upstreamOrigin) {
  const headers = { ...PROXY_RESPONSE_HEADERS };
  if (!upstreamHeaders || typeof upstreamHeaders.forEach !== 'function') {
    return headers;
  }

  upstreamHeaders.forEach((value, name) => {
    const lowerName = String(name).toLowerCase();
    if (BLOCKED_RESPONSE_HEADER_PREFIXES.some((prefix) => lowerName.startsWith(prefix))) return;
    if (lowerName === 'set-cookie') return;
    if (lowerName === 'location') {
      const rewritten = rewriteUpstreamLocation(value, upstreamOrigin);
      if (rewritten) headers.Location = rewritten;
      return;
    }
    const outputName = FORWARDED_RESPONSE_HEADER_NAMES.get(lowerName);
    if (outputName) {
      headers[outputName] = value;
    }
  });
  return headers;
}

function buildUpstreamUrl(upstreamOrigin, gatewayPath, searchParams) {
  const upstreamUrl = new URL(`${upstreamOrigin}${gatewayPath}`);
  if (searchParams) {
    for (const [key, value] of searchParams.entries()) {
      if (key === 'path') continue;
      upstreamUrl.searchParams.append(key, value);
    }
  }
  return upstreamUrl;
}

export async function handleCmsGatewayRequest(
  request,
  {
    environment = process.env,
    fetchImplementation = globalThis.fetch
  } = {}
) {
  const method = String(request?.method || 'GET').toUpperCase();
  if (!ALLOWED_METHODS.has(method)) {
    return jsonResponse(405, { status: 'method_not_allowed' }, { Allow: [...ALLOWED_METHODS].join(', ') });
  }

  const upstreamOrigin = resolveCmsGatewayUpstreamOrigin(environment);
  if (!upstreamOrigin) {
    return jsonResponse(503, { status: 'unavailable' }, { 'Retry-After': '3600' });
  }

  if (!requestOriginIsAllowed(request, environment)) {
    return jsonResponse(403, { status: 'forbidden' });
  }

  const resolved = resolveCmsGatewayRequestPath(request);
  if (!resolved) {
    return jsonResponse(404, { status: 'not_found' });
  }

  const declaredLength = Number(headerValue(request.headers, 'content-length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return jsonResponse(413, { status: 'request_too_large' });
  }

  let body;
  try {
    body = await readRequestBody(request);
  } catch (error) {
    if (error?.code === 'BODY_TOO_LARGE') {
      return jsonResponse(413, { status: 'request_too_large' });
    }
    return jsonResponse(400, { status: 'invalid_request' });
  }
  if (body.bytes > MAX_BODY_BYTES) {
    return jsonResponse(413, { status: 'request_too_large' });
  }

  if (typeof fetchImplementation !== 'function') {
    return jsonResponse(503, { status: 'unavailable' }, { 'Retry-After': '3600' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const upstreamResponse = await fetchImplementation(
      buildUpstreamUrl(upstreamOrigin, resolved.path, resolved.search),
      {
        method,
        headers: collectForwardedRequestHeaders(request),
        body: method === 'GET' || method === 'HEAD' ? undefined : body.buffer,
        redirect: 'manual',
        signal: controller.signal
      }
    );

    const responseHeaders = collectForwardedResponseHeaders(upstreamResponse.headers, upstreamOrigin);
    const responseBody = method === 'HEAD' ? Buffer.alloc(0) : Buffer.from(await upstreamResponse.arrayBuffer());
    return {
      status: upstreamResponse.status,
      headers: responseHeaders,
      body: responseBody
    };
  } catch {
    return jsonResponse(502, { status: 'upstream_unavailable' });
  } finally {
    clearTimeout(timeout);
  }
}

function lowercaseHeaders(headers = {}) {
  const normalized = {};
  for (const [name, value] of Object.entries(headers)) {
    normalized[String(name).toLowerCase()] = value;
  }
  return normalized;
}

export default async function cmsGatewayEndpoint(request, serverResponse) {
  const result = await handleCmsGatewayRequest({
    method: request.method,
    url: request.url,
    headers: lowercaseHeaders(request.headers),
    body: request
  });

  for (const [name, value] of Object.entries(result.headers)) {
    serverResponse.setHeader(name, value);
  }
  serverResponse.statusCode = result.status;
  serverResponse.end(result.body);
}
