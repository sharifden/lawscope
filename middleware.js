export const config = {
  matcher: '/.netlify/:path*'
};

export default function middleware(request) {
  const url = new URL(request.url);
  const normalizedPath = (url.pathname.replace(/\/+$/, '') || url.pathname);
  if (!normalizedPath.startsWith('/.netlify/identity') && !normalizedPath.startsWith('/.netlify/git')) {
    return;
  }

  const destination = new URL('/api/cms-gateway', url.origin);
  destination.searchParams.set('path', normalizedPath);
  for (const [key, value] of url.searchParams.entries()) {
    if (key !== 'path') destination.searchParams.append(key, value);
  }

  const init = {
    method: request.method,
    headers: request.headers,
    redirect: 'manual'
  };
  if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
    init.body = request.body;
    init.duplex = 'half';
  }
  return fetch(destination, init);
}
