import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { hashPasswordSHA256 } from '../../../utils/security';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const username = String(formData.get('username') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  
  if (!username || !password) {
    return redirect('/?login=admin&error=1');
  }

  // 1. Check Admin Login
  if (username === 'admin') {
    const dashboardPassword = import.meta.env.DASHBOARD_PASSWORD || 
                              (typeof process !== 'undefined' ? process.env.DASHBOARD_PASSWORD : '') || '';
    
    if (password === dashboardPassword) {
      const hashed = await hashPasswordSHA256(password);
      cookies.set('auth_role', 'admin', { path: '/', maxAge: 60 * 60 * 24, httpOnly: true, secure: true, sameSite: 'strict' });
      cookies.set('dashboard_unlocked', hashed, { path: '/', maxAge: 60 * 60 * 24, httpOnly: true, secure: true, sameSite: 'strict' });
      return redirect('/dashboard');
    }
    
    return redirect('/?login=admin&error=1');
  }

  // 2. Check Client Login
  const { data: wedding, error } = await supabase
    .from('weddings')
    .select('client_password_hash')
    .eq('slug', username)
    .single();

  if (error || !wedding || !wedding.client_password_hash) {
    return redirect('/?login=client&error=1');
  }

  const enteredHash = await hashPasswordSHA256(password);
  
  if (enteredHash === wedding.client_password_hash) {
    cookies.set('auth_role', 'client', { path: '/', maxAge: 60 * 60 * 24, httpOnly: true, secure: true, sameSite: 'strict' });
    cookies.set('auth_slug', username, { path: '/', maxAge: 60 * 60 * 24, httpOnly: true, secure: true, sameSite: 'strict' });
    return redirect(`/dashboard/${username}`);
  }

  return redirect('/?login=client&error=1');
};
