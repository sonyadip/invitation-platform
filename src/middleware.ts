import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const acceptHeader = context.request.headers.get('accept') || '';
  
  // Turndown doesn't work in Cloudflare Workers due to lack of DOM.
  // For the homepage, we can just return a lightweight, static Markdown string.
  if (acceptHeader.includes('text/markdown') && (context.url.pathname === '/' || context.url.pathname === '')) {
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
  
  return next();
});
