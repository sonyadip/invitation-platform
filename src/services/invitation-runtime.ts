import type { InvitationSettings } from '../types';
import { hashPasswordSHA256 } from '../utils/security';

export function resolveInvitationIdentifier(url: URL, slug?: string) {
  const host = url.host;
  const isLocal =
    host.includes('localhost') ||
    host.includes('127.0.0.1') ||
    host.includes('.internal');
  const isCloudflarePreview =
    host.endsWith('.pages.dev') ||
    host.endsWith('.workers.dev');
    
  const isMainDomain = host === 'senadda.id' || host === 'www.senadda.id';
  
  const isDomain = !isLocal && !isCloudflarePreview && !isMainDomain;

  return {
    identifier: isDomain ? host : (slug || ''),
    isDomain
  };
}

export function getClientIp(request: Request, clientAddress?: string): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    clientAddress ||
    '127.0.0.1'
  );
}

export function getUnlockCookieName(weddingId: string): string {
  return `invitation_unlocked_${weddingId}`;
}

export async function isInvitationUnlocked(
  cookies: AstroCookiesLike,
  weddingId: string,
  accessPassword: string | null
): Promise<boolean> {
  const cookieName = getUnlockCookieName(weddingId);
  const hashedAccess = await hashPasswordSHA256(accessPassword || '');
  return cookies.has(cookieName) && cookies.get(cookieName)?.value === hashedAccess;
}

export async function handlePasswordUnlock(input: {
  request: Request;
  cookies: AstroCookiesLike;
  url: URL;
  weddingId: string;
  accessPassword: string | null;
}): Promise<{ errorMessage: string; redirect?: Response }> {
  if (input.request.method !== 'POST') {
    return { errorMessage: '' };
  }

  try {
    const formData = await input.request.formData();
    const action = formData.get('action');
    if (action !== 'unlock') return { errorMessage: '' };

    const enteredPassword = formData.get('password') as string;
    const hashedEntered = await hashPasswordSHA256(enteredPassword || '');
    const hashedAccess = await hashPasswordSHA256(input.accessPassword || '');

    if (hashedEntered !== hashedAccess) {
      return { errorMessage: 'The password you entered is incorrect.' };
    }

    input.cookies.set(getUnlockCookieName(input.weddingId), hashedEntered, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
      secure: true,
      sameSite: 'strict'
    });

    return {
      errorMessage: '',
      redirect: Response.redirect(`${input.url.origin}${input.url.pathname}${input.url.search}`, 302)
    };
  } catch (err) {
    console.error('Password gate processing error:', err);
    return { errorMessage: '' };
  }
}

export function getInvitationAccessState(
  settings: InvitationSettings,
  isUnlocked: boolean,
  now = new Date()
) {
  const isMaintenance = settings.maintenance_mode;
  const isExpired = Boolean(settings.expiration_date && new Date(settings.expiration_date) < now);
  const isPasswordLocked = settings.password_protection_enabled && !isUnlocked;

  return {
    isMaintenance,
    isExpired,
    isPasswordLocked
  };
}

interface AstroCookiesLike {
  has(name: string): boolean;
  get(name: string): { value: string } | undefined;
  set(
    name: string,
    value: string,
    options: {
      path: string;
      maxAge: number;
      httpOnly: boolean;
      secure: boolean;
      sameSite: 'strict' | 'lax' | 'none';
    }
  ): void;
}
