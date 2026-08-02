/**
 * Safely sanitizes strings to prevent cross-site scripting (XSS).
 * Replaces critical HTML characters with safe entity representations.
 */
export function sanitizeHTML(input: string): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Validates RSVP inputs on the server/API layer.
 * Enforces field lengths, data types, and bounds.
 */
export function validateRSVPInput(name: string, status: string, countStr: string | number) {
  const sanitizedName = sanitizeHTML(name);
  if (!sanitizedName || sanitizedName.length < 2 || sanitizedName.length > 80) {
    throw new Error('Nama tamu harus diisi (2 - 80 karakter).');
  }

  if (status !== 'attending' && status !== 'declined' && status !== 'tentative') {
    throw new Error('Status kehadiran tidak valid.');
  }

  const count = parseInt(countStr as string, 10);
  if (isNaN(count) || count < 1 || count > 50) {
    throw new Error('Jumlah tamu harus berupa angka antara 1 dan 50.');
  }

  return {
    name: sanitizedName,
    status: status as 'attending' | 'declined' | 'tentative',
    count
  };
}

/**
 * Securely hashes passwords using the standard Web Crypto API.
 * This runs natively on both Node.js v20+ and Cloudflare Edge runtimes without external dependencies.
 */
export async function hashPasswordSHA256(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
