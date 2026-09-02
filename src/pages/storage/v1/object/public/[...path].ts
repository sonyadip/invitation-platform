import type { APIRoute } from 'astro';

export const prerender = false;

function getSupabaseUrl(): string {
  const url =
    (typeof process !== 'undefined' ? process.env.SUPABASE_URL : '') ||
    (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.SUPABASE_URL : '') ||
    '';
  return url.replace(/\/+$/, '');
}

async function handleProxyRequest(request: Request, path: string | undefined, isHead = false): Promise<Response> {
  if (!path) {
    return new Response('Asset path is required', { status: 400 });
  }

  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) {
    return new Response('Supabase URL configuration is missing', { status: 500 });
  }

  const incomingUrl = new URL(request.url);
  const targetUrl = `${supabaseUrl}/storage/v1/object/public/${path}${incomingUrl.search}`;

  const forwardHeaders = new Headers();
  const forwardHeaderKeys = [
    'range',
    'if-none-match',
    'if-modified-since',
    'accept',
    'accept-encoding'
  ];

  for (const key of forwardHeaderKeys) {
    const val = request.headers.get(key);
    if (val) forwardHeaders.set(key, val);
  }

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: isHead ? 'HEAD' : 'GET',
      headers: forwardHeaders,
      // @ts-ignore - Cloudflare edge subrequest caching
      cf: {
        cacheEverything: true,
        cacheTtl: 31536000
      }
    });

    if (upstreamResponse.status === 304) {
      return new Response(null, {
        status: 304,
        headers: upstreamResponse.headers
      });
    }

    if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
      return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: upstreamResponse.headers
      });
    }

    const responseHeaders = new Headers();
    const copyKeys = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'etag',
      'last-modified'
    ];

    for (const key of copyKeys) {
      const val = upstreamResponse.headers.get(key);
      if (val) responseHeaders.set(key, val);
    }

    // Long-lived immutable caching for Cloudflare CDN edge and client browsers
    responseHeaders.set(
      'Cache-Control',
      'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable'
    );
    responseHeaders.set('CDN-Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400');
    responseHeaders.set('Cloudflare-CDN-Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400');
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(isHead ? null : upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders
    });
  } catch (error: any) {
    console.error('Storage CDN proxy error:', error);
    return new Response('Failed to retrieve asset from storage proxy', { status: 502 });
  }
}

export const GET: APIRoute = async ({ params, request }) => {
  return handleProxyRequest(request, params.path, false);
};

export const HEAD: APIRoute = async ({ params, request }) => {
  return handleProxyRequest(request, params.path, true);
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, If-None-Match, If-Modified-Since',
      'Access-Control-Max-Age': '86400'
    }
  });
};
