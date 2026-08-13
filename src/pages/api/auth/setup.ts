import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { supabase } from '../../../lib/supabase';
import { hashPasswordSHA256 } from '../../../utils/security';
import { verifySetupToken } from '../../../utils/token';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const token = String(formData.get('token') || '');
  const password = String(formData.get('password') || '');
  
  if (!token || !password || password.length < 6) {
    return redirect('/?error=invalid_setup_input');
  }

  // 1. Verify token
  const slug = await verifySetupToken(token);
  if (!slug) {
    return redirect('/?error=invalid_setup_link');
  }

  // 2. Check if already claimed
  const { data: wedding, error: checkError } = await supabase
    .from('weddings')
    .select('id, client_password_hash')
    .eq('slug', slug)
    .single();

  if (checkError || !wedding) {
    return redirect('/?error=wedding_not_found');
  }

  if (wedding.client_password_hash) {
    // Password already set, token is no longer valid for setup
    return redirect('/?login=client&error=link_used');
  }

  // 3. Hash password and save
  const hashed = await hashPasswordSHA256(password);
  const supabaseAdmin = await getSupabaseAdmin();
  
  const { error: updateError } = await supabaseAdmin
    .from('weddings')
    .update({ client_password_hash: hashed })
    .eq('id', wedding.id);

  if (updateError) {
    console.error("Failed to setup password", updateError);
    return redirect('/?error=setup_failed');
  }

  // 4. Log the user in
  const isSecure = import.meta.env.PROD;
  cookies.set('auth_role', 'client', { path: '/', maxAge: 60 * 60 * 24, httpOnly: true, secure: isSecure, sameSite: 'strict' });
  cookies.set('auth_slug', slug, { path: '/', maxAge: 60 * 60 * 24, httpOnly: true, secure: isSecure, sameSite: 'strict' });
  
  return redirect(`/dashboard/${slug}`);
};
