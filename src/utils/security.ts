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
  const cleanName = String(name || '').trim().slice(0, 80);
  if (!cleanName || cleanName.length < 2) {
    throw new Error('Guest name is required (2 - 80 characters).');
  }

  if (status !== 'attending' && status !== 'declined' && status !== 'tentative') {
    throw new Error('Invalid attendance status.');
  }

  const count = parseInt(countStr as string, 10);
  if (isNaN(count) || count < 1 || count > 50) {
    throw new Error('Guest count must be a number between 1 and 50.');
  }

  return {
    name: cleanName,
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
