import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { hashPasswordSHA256 } from '../../../utils/security';
import { logActivity } from '../../../services/activity-log';

export const prerender = false;

const cookieOpts = (secure: boolean) => ({
  path: '/',
  maxAge: 60 * 60 * 24,
  httpOnly: true,
  secure,
  sameSite: 'strict' as const,
});

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const username = String(formData.get('username') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const isSecure = import.meta.env.PROD;
  
  if (!username || !password) {
    return redirect('/?login=admin&error=1');
  }

  // 1. Check Admin Login
  if (username === 'admin') {
    const dashboardPassword = import.meta.env.DASHBOARD_PASSWORD || 
                              (typeof process !== 'undefined' ? process.env.DASHBOARD_PASSWORD : '') || '';
    
    if (password === dashboardPassword) {
      const hashed = await hashPasswordSHA256(password);
      cookies.set('auth_role', 'admin', cookieOpts(isSecure));
      cookies.set('dashboard_unlocked', hashed, cookieOpts(isSecure));

      await logActivity({
        actor_type: 'admin',
        actor_name: 'Admin',
        action: 'auth.login',
        entity_type: 'auth',
        description: 'Admin successfully logged in to Dashboard.'
      });

      return redirect('/dashboard');
    }

    await logActivity({
      actor_type: 'admin',
      actor_name: 'Admin',
      action: 'auth.login_failed',
      entity_type: 'auth',
      description: 'Failed admin login attempt (invalid password).'
    });
    
    return redirect('/?login=admin&error=1');
  }

  // 2. Check Client Login
  const { data: wedding, error } = await supabase
    .from('weddings')
    .select('id, slug, bride_name, groom_name, client_password_hash')
    .eq('slug', username)
    .single();

  if (error || !wedding || !wedding.client_password_hash) {
    await logActivity({
      slug: username,
      actor_type: 'client',
      actor_name: username,
      action: 'auth.login_failed',
      entity_type: 'auth',
      description: `Failed login attempt for account '${username}' (account not found or not initialized).`
    });

    return redirect('/?login=client&error=1');
  }

  const enteredHash = await hashPasswordSHA256(password);
  
  if (enteredHash === wedding.client_password_hash) {
    cookies.set('auth_role', 'client', cookieOpts(isSecure));
    cookies.set('auth_slug', username, cookieOpts(isSecure));

    await logActivity({
      wedding_id: wedding.id,
      slug: wedding.slug,
      actor_type: 'client',
      actor_name: `Client (${wedding.bride_name} & ${wedding.groom_name})`,
      action: 'auth.login',
      entity_type: 'auth',
      description: `Client '${wedding.slug}' successfully logged in to client dashboard.`
    });

    return redirect(`/dashboard/${username}`);
  }

  await logActivity({
    wedding_id: wedding.id,
    slug: wedding.slug,
    actor_type: 'client',
    actor_name: `Client (${wedding.bride_name} & ${wedding.groom_name})`,
    action: 'auth.login_failed',
    entity_type: 'auth',
    description: `Failed login attempt for client '${wedding.slug}' (invalid password).`
  });

  return redirect('/?login=client&error=1');
};

