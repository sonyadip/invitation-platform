import type { APIRoute } from 'astro';
import { logActivity } from '../../../services/activity-log';

export const prerender = false;

const doLogout = async ({ cookies, redirect }: Parameters<APIRoute>[0]) => {
  const authRole = cookies.get('auth_role')?.value;
  const authSlug = cookies.get('auth_slug')?.value;

  if (authRole) {
    await logActivity({
      slug: authSlug || undefined,
      actor_type: authRole === 'admin' ? 'admin' : 'client',
      actor_name: authRole === 'admin' ? 'Admin' : (authSlug || 'Client'),
      action: 'auth.logout',
      entity_type: 'auth',
      description: `${authRole === 'admin' ? 'Admin' : `Client '${authSlug}'`} logged out.`
    });
  }

  cookies.delete('auth_role', { path: '/' });
  cookies.delete('auth_slug', { path: '/' });
  cookies.delete('dashboard_unlocked', { path: '/' });
  return redirect('/');
};

export const GET: APIRoute = doLogout;
export const POST: APIRoute = doLogout;

