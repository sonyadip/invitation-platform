export const prerender = false;

const getSecret = () => {
  const pw = import.meta.env.DASHBOARD_PASSWORD || 
             (typeof process !== 'undefined' ? process.env.DASHBOARD_PASSWORD : '') || 
             'default-secret';
  return pw + '-setup-token';
};

/**
 * Generates a signed token for setting up the dashboard password.
 * @param slug The wedding slug
 * @param expiresInHours Hours until the token expires (default 24)
 * @returns A base64 encoded token
 */
export async function generateSetupToken(slug: string, expiresInHours: number = 24): Promise<string> {
  const exp = Date.now() + expiresInHours * 60 * 60 * 1000;
  const payload = `${slug}:${exp}`;
  
  const msgBuffer = new TextEncoder().encode(payload + getSecret());
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  const tokenRaw = `${payload}:${signature}`;
  // Web safe base64 encoding
  return btoa(tokenRaw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Verifies a setup token and returns the slug if valid and not expired.
 * @param token The base64 encoded token
 * @returns The slug if valid, otherwise null
 */
export async function verifySetupToken(token: string): Promise<string | null> {
  try {
    // Restore base64 standard chars
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const decoded = atob(base64);
    
    const parts = decoded.split(':');
    if (parts.length !== 3) return null;
    
    const [slug, expStr, signature] = parts;
    const exp = parseInt(expStr, 10);
    
    if (Date.now() > exp) return null; // Expired
    
    // Re-verify signature
    const payload = `${slug}:${expStr}`;
    const msgBuffer = new TextEncoder().encode(payload + getSecret());
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (signature !== expectedSignature) return null;
    
    return slug;
  } catch (e) {
    return null; // Invalid base64 or other error
  }
}
