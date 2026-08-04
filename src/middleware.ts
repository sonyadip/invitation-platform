import { defineMiddleware } from 'astro:middleware';
import TurndownService from 'turndown';

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const acceptHeader = context.request.headers.get('accept') || '';
  
  if (acceptHeader.includes('text/markdown') && response.headers.get('content-type')?.includes('text/html')) {
    const html = await response.text();
    const turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
    const markdown = turndownService.turndown(html);
    
    // Create new headers based on the original response
    const newHeaders = new Headers();
    response.headers.forEach((value, key) => {
      newHeaders.set(key, value);
    });
    
    newHeaders.set('Content-Type', 'text/markdown');
    
    return new Response(markdown, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  }
  
  return response;
});
