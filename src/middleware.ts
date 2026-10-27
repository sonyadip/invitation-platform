import { defineMiddleware } from 'astro:middleware';
import { getSessionFromCookies } from './utils/session';
import { sendCriticalAlert } from './services/alerts';

export const onRequest = defineMiddleware(async (context, next) => {
  const startTime = Date.now();
  const requestId = context.request.headers.get('x-request-id') || crypto.randomUUID();
  context.locals.requestId = requestId;

  const url = context.url;
  const pathname = url.pathname;
  const acceptHeader = context.request.headers.get('accept') || '';

  if (acceptHeader.includes('text/markdown') && (pathname === '/' || pathname === '')) {
    const markdown = `# Senadda - Undangan Pernikahan Digital

Selamat datang di Senadda, platform pembuatan undangan digital yang premium, elegan, dan eksklusif.

## Koleksi Template
- Lumiere (Rp 300.000)
- Editorial (Rp 250.000)
- Deauville (Rp 200.000)
- Air (Rp 150.000)
- Noir (Rp 150.000)

## Konsultasi & Pemesanan
Silakan hubungi kami melalui WhatsApp untuk pemesanan.

## Dokumen Agen
Silakan merujuk ke [/llms.txt](/llms.txt) untuk konteks lengkap agen AI.
`;

    return new Response(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown',
        'X-Request-Id': requestId,
        'Server-Timing': `total;dur=${Date.now() - startTime}`
      }
    });
  }

  const session = await getSessionFromCookies(context.cookies);
  context.locals.session = session;

  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    const segments = pathname.split('/').filter(Boolean);
    const isRootDashboard = segments.length === 1;
    const subRoute = segments[1];

    if (isRootDashboard || subRoute === 'activity' || subRoute === 'new' || subRoute === 'settings') {
      if (session?.role !== 'admin') {
        return context.redirect('/?login=admin');
      }
    } else {
      const slug = subRoute;
      const action = segments[2];

      if (session?.role === 'admin') {
      } else if (session?.role === 'client' && session.slug === slug) {
        if (action === 'edit' || action === 'revisions') {
          return context.redirect(`/dashboard/${slug}`);
        }
      } else {
        return context.redirect('/?login=client');
      }
    }
  }

  try {
    const response = await next();
    const duration = Date.now() - startTime;
    response.headers.set('X-Request-Id', requestId);
    response.headers.set('Server-Timing', `total;dur=${duration}`);
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    if (response.status >= 500) {
      console.error(
        JSON.stringify({
          level: 'error',
          timestamp: new Date().toISOString(),
          requestId,
          status: response.status,
          method: context.request.method,
          path: pathname,
          durationMs: duration
        })
      );

      if (!pathname.startsWith('/api/health')) {
        sendCriticalAlert({
          title: `Server Error HTTP ${response.status}`,
          message: `Endpoint \`${context.request.method} ${pathname}\` merespons dengan status ${response.status}.`,
          level: 'error',
          requestId,
          metadata: { path: pathname, status: response.status, durationMs: duration }
        }).catch(() => {});
      }
    }

    return response;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(
      JSON.stringify({
        level: 'fatal',
        timestamp: new Date().toISOString(),
        requestId,
        method: context.request.method,
        path: pathname,
        error: error?.message || String(error),
        stack: error?.stack,
        durationMs: duration
      })
    );

    sendCriticalAlert({
      title: 'Unhandled Exception (500)',
      message: `Terjadi unhandled exception pada \`${context.request.method} ${pathname}\`: ${error?.message || String(error)}`,
      level: 'fatal',
      requestId,
      metadata: { path: pathname, method: context.request.method, durationMs: duration }
    }).catch(() => {});

    const isHtml = acceptHeader.includes('text/html');
    if (isHtml) {
      return new Response(
        `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>500 - Terjadi Kesalahan Sistem</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:system-ui,-apple-system,sans-serif;background:#faf9f6;color:#1c1917;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center}.box{background:#fff;padding:40px;border-radius:12px;border:1px solid #e7e5e4;max-width:480px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05)}h1{font-size:22px;margin-bottom:12px;color:#b91c1c}p{font-size:14px;color:#57534e;line-height:1.5}.ref{font-family:monospace;font-size:12px;color:#a8a29e;margin-top:20px}</style></head><body><div class="box"><h1>Terjadi Gangguan Sistem</h1><p>Mohon maaf, sistem sedang mengalami kendala teknis sementara. Silakan segarkan halaman dalam beberapa saat.</p><div class="ref">Ref ID: ${requestId}</div></div></body></html>`,
        {
          status: 500,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Request-Id': requestId,
            'Server-Timing': `total;dur=${duration}`
          }
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        requestId,
        message: 'Terjadi gangguan sistem sementara.'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': requestId,
          'Server-Timing': `total;dur=${duration}`
        }
      }
    );
  }
});
