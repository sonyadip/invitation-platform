export interface SessionPayload {
  role: 'admin' | 'client';
  slug?: string;
  weddingId?: string;
  exp: number;
}

const getSecretKey = async (): Promise<CryptoKey> => {
  let secretStr = '';
  if (typeof process !== 'undefined' && process.env) {
    secretStr = process.env.SESSION_SECRET || process.env.DASHBOARD_PASSWORD || '';
  }
  if (!secretStr && typeof import.meta !== 'undefined' && (import.meta as any).env) {
    secretStr = (import.meta as any).env.SESSION_SECRET || (import.meta as any).env.DASHBOARD_PASSWORD || '';
  }
  if (!secretStr) {
    secretStr = 'senadda-default-secure-salt-2026';
  }

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretStr + '-senadda-session-v1');

  return globalThis.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
};

function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return base64UrlEncode(binary);
}

function base64UrlToBuffer(str: string): Uint8Array {
  const binary = base64UrlDecode(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Creates a signed HMAC-SHA256 session token.
 */
export async function createSessionToken(
  payload: Omit<SessionPayload, 'exp'>,
  expiresInDays = 7
): Promise<string> {
  const key = await getSecretKey();
  const exp = Date.now() + expiresInDays * 24 * 60 * 60 * 1000;
  const fullPayload: SessionPayload = { ...payload, exp };

  const payloadJson = JSON.stringify(fullPayload);
  const encodedPayload = base64UrlEncode(payloadJson);

  const encoder = new TextEncoder();
  const data = encoder.encode(encodedPayload);
  const signatureBuffer = await globalThis.crypto.subtle.sign('HMAC', key, data);
  const encodedSignature = bufferToBase64Url(signatureBuffer);

  return `${encodedPayload}.${encodedSignature}`;
}

/**
 * Verifies a signed HMAC-SHA256 session token and returns the payload if valid.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, encodedSignature] = parts;

  try {
    const key = await getSecretKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(encodedPayload);
    const signatureBytes = base64UrlToBuffer(encodedSignature);

    const isValid = await globalThis.crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      data
    );

    if (!isValid) return null;

    const payloadJson = base64UrlDecode(encodedPayload);
    const payload: SessionPayload = JSON.parse(payloadJson);

    if (!payload.exp || Date.now() > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch (err) {
    return null;
  }
}

export const SESSION_COOKIE_NAME = 'senadda_session';

export interface CookieHelper {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options: any): void;
  delete(name: string, options?: any): void;
}

export async function getSessionFromCookies(cookies: CookieHelper): Promise<SessionPayload | null> {
  const token = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(
  cookies: CookieHelper,
  payload: Omit<SessionPayload, 'exp'>,
  isSecure: boolean,
  expiresInDays = 7
): Promise<string> {
  const token = await createSessionToken(payload, expiresInDays);
  const maxAge = expiresInDays * 24 * 60 * 60;

  cookies.set(SESSION_COOKIE_NAME, token, {
    path: '/',
    maxAge,
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax'
  });

  // Set companion display cookies (non-sensitive)
  cookies.set('auth_role', payload.role, {
    path: '/',
    maxAge,
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax'
  });

  if (payload.slug) {
    cookies.set('auth_slug', payload.slug, {
      path: '/',
      maxAge,
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax'
    });
  }

  return token;
}

export function clearSessionCookies(cookies: CookieHelper): void {
  cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
  cookies.delete('auth_role', { path: '/' });
  cookies.delete('auth_slug', { path: '/' });
  cookies.delete('dashboard_unlocked', { path: '/' });
}
