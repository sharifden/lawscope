import { createReadStream } from 'node:fs';
import { access, readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveRobotsResponseHeaders } from './sitemap-robots.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const scriptDirectory = path.dirname(scriptPath);
const projectRoot = path.resolve(scriptDirectory, '..');
const publicRoot = process.env.LAWSCOPE_OUTPUT_DIR
  ? path.resolve(process.env.LAWSCOPE_OUTPUT_DIR)
  : path.join(projectRoot, 'generated');
const port = Number.parseInt(process.env.PORT || '4173', 10);

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.xml', 'application/xml; charset=utf-8']
]);

async function resolveFile(requestUrl, rootDirectory = publicRoot) {
  let decodedPath;
  try {
    const requestPath = new URL(requestUrl, 'http://lawscope.local').pathname;
    decodedPath = decodeURIComponent(requestPath);
  } catch {
    return null;
  }

  const normalizedPath = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
  let candidate = path.join(rootDirectory, normalizedPath);
  const relativeCandidate = path.relative(rootDirectory, candidate);

  if (relativeCandidate.startsWith('..') || path.isAbsolute(relativeCandidate)) {
    return null;
  }

  try {
    const candidateStats = await stat(candidate);
    if (candidateStats.isDirectory()) {
      candidate = path.join(candidate, 'index.html');
    }
    await access(candidate);
    return candidate;
  } catch {
    return null;
  }
}

function sendFile(request, response, filePath, statusCode, extraHeaders = {}) {
  const extension = path.extname(filePath).toLowerCase();
  response.writeHead(statusCode, {
    'Content-Type': contentTypes.get(extension) || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders
  });

  if (request.method === 'HEAD') {
    response.end();
    return;
  }

  const stream = createReadStream(filePath);
  stream.on('error', () => response.destroy());
  stream.pipe(response);
}

export function createPreviewServer({
  rootDirectory = publicRoot,
  deploymentEnvironment = 'development'
} = {}) {
  return createServer(async (request, response) => {
    const requestUrl = request.url || '/';
    let requestRoute = '/';
    try {
      requestRoute = new URL(requestUrl, 'http://lawscope.local').pathname;
    } catch {
      // Invalid requests resolve to the permanent noindex 404 response below.
    }

    if (requestRoute === '/dashboard' || requestRoute === '/dashboard/') {
      response.writeHead(302, {
        Location: '/admin/',
        'Cache-Control': 'no-store'
      });
      response.end();
      return;
    }

    const filePath = await resolveFile(requestUrl, rootDirectory);

    if (!filePath) {
      const errorDocumentPath = path.join(rootDirectory, '404.html');
      const robotsHeaders = resolveRobotsResponseHeaders(deploymentEnvironment, {
        route: requestRoute,
        statusCode: 404
      });
      try {
        await access(errorDocumentPath);
        response.writeHead(404, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          ...robotsHeaders
        });
        if (request.method === 'HEAD') {
          response.end();
        } else {
          const errorStream = createReadStream(errorDocumentPath);
          errorStream.on('error', () => response.destroy());
          errorStream.pipe(response);
        }
      } catch {
        response.writeHead(404, {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          ...robotsHeaders
        });
        response.end('404 — Page not found');
      }
      return;
    }

    sendFile(
      request,
      response,
      filePath,
      200,
      resolveRobotsResponseHeaders(deploymentEnvironment, {
        route: requestRoute,
        statusCode: 200
      })
    );
  });
}

async function readOutputEnvironment(rootDirectory) {
  try {
    const buildInformation = JSON.parse(
      await readFile(path.join(rootDirectory, 'build-info.json'), 'utf8')
    );
    if (['development', 'preview', 'production'].includes(buildInformation.deploymentEnvironment)) {
      return buildInformation.deploymentEnvironment;
    }
  } catch {
    // A missing/invalid manifest is treated as development and therefore noindex.
  }
  return 'development';
}

const isExecutedDirectly = process.argv[1] && path.resolve(process.argv[1]) === scriptPath;
if (isExecutedDirectly) {
  const deploymentEnvironment = await readOutputEnvironment(publicRoot);
  const server = createPreviewServer({ deploymentEnvironment });
  server.listen(port, '0.0.0.0', () => {
    console.log(
      `Lawscope ${deploymentEnvironment} preview available at http://0.0.0.0:${port}`
    );
  });
}
