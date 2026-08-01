import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete('auth_role', { path: '/' });
  cookies.delete('auth_slug', { path: '/' });
  cookies.delete('dashboard_unlocked', { path: '/' });
  
  return redirect('/');
};
