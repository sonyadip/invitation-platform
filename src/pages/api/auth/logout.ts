import type { APIRoute } from 'astro';
import { logActivity } from '../../../services/activity-log';
import { clearSessionCookies, getSessionFromCookies } from '../../../utils/session';

export const prerender = false;

const doLogout = async ({ cookies, redirect }: Parameters<APIRoute>[0]) => {
  const session = await getSessionFromCookies(cookies);
  const authRole = session?.role || cookies.get('auth_role')?.value;
  const authSlug = session?.slug || cookies.get('auth_slug')?.value;

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

  clearSessionCookies(cookies);
  return redirect('/');
};

export const GET: APIRoute = doLogout;
export const POST: APIRoute = doLogout;
