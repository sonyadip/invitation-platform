import { defineMiddleware } from 'astro:middleware';
import { getSessionFromCookies } from './utils/session';

export const onRequest = defineMiddleware(async (context, next) => {
  const url = context.url;
  const pathname = url.pathname;
  const acceptHeader = context.request.headers.get('accept') || '';

  // 1. LLM Markdown context
  if (acceptHeader.includes('text/markdown') && (pathname === '/' || pathname === '')) {
    const markdown = `# Senadda - Undangan Pernikahan Digital

Selamat datang di Senadda, platform pembuatan undangan digital yang premium, elegan, dan eksklusif.

## Koleksi Template
- Lumiere (Rp 200.000)
- Deauville (Rp 175.000)
- Editorial (Rp 175.000)
- Air (Rp 125.000)
- Noir (Rp 125.000)

## Konsultasi & Pemesanan
Silakan hubungi kami melalui WhatsApp untuk pemesanan.

## Dokumen Agen
Silakan merujuk ke [/llms.txt](/llms.txt) untuk konteks lengkap agen AI.
`;

    return new Response(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown'
      }
    });
  }

  // 2. Resolve cryptographically verified session
  const session = await getSessionFromCookies(context.cookies);
  context.locals.session = session;

  // 3. Protect /dashboard routes
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    const segments = pathname.split('/').filter(Boolean); // e.g. ['dashboard'] or ['dashboard', 'slug', 'edit']
    const isRootDashboard = segments.length === 1; // '/dashboard'
    const subRoute = segments[1]; // 'activity', 'new', 'settings', or [slug]

    // Admin exclusive global pages
    if (isRootDashboard || subRoute === 'activity' || subRoute === 'new' || subRoute === 'settings') {
      if (session?.role !== 'admin') {
        return context.redirect('/?login=admin');
      }
    } else {
      // Slug-based dashboard: /dashboard/:slug[/subpage]
      const slug = subRoute;
      const action = segments[2]; // 'edit', 'revisions', 'rsvp', 'kirim-undangan', 'profile'

      // Admin has full access to all client dashboards and edit tools
      if (session?.role === 'admin') {
        return next();
      }

      // Client role check
      if (session?.role === 'client' && session.slug === slug) {
        // Edit and Revisions are strictly Admin-only
        if (action === 'edit' || action === 'revisions') {
          return context.redirect(`/dashboard/${slug}`);
        }
        return next();
      }

      // Not authenticated or attempting to access unauthorized slug
      return context.redirect('/?login=client');
    }
  }

  return next();
});
