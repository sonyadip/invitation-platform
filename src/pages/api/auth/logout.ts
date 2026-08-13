import type { APIRoute } from 'astro';

export const prerender = false;

const doLogout = ({ cookies, redirect }: Parameters<APIRoute>[0]) => {
  cookies.delete('auth_role', { path: '/' });
  cookies.delete('auth_slug', { path: '/' });
  cookies.delete('dashboard_unlocked', { path: '/' });
  return redirect('/');
};

export const GET: APIRoute = doLogout;
export const POST: APIRoute = doLogout;
