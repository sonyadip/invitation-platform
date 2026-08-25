import assert from 'node:assert';
import {
  createSessionToken,
  verifySessionToken,
  type SessionPayload
} from '../src/utils/session';
import { sanitizeHTML, validateRSVPInput, hashPasswordSHA256 } from '../src/utils/security';

async function runChecks() {
  console.log('=== SENADDA SECURITY & AUTH SELF-CHECK ===\n');

  // 1. Check Admin Session Token
  console.log('1. Testing Admin HMAC Session Token Creation & Verification...');
  const adminToken = await createSessionToken({ role: 'admin' }, 7);
  assert(typeof adminToken === 'string' && adminToken.includes('.'), 'Admin token format invalid');

  const verifiedAdmin = await verifySessionToken(adminToken);
  assert(verifiedAdmin !== null, 'Admin token failed verification');
  assert.strictEqual(verifiedAdmin.role, 'admin', 'Admin role mismatch');
  console.log('   ✓ Admin session token verified successfully');

  // 2. Check Client Session Token
  console.log('2. Testing Client HMAC Session Token...');
  const clientToken = await createSessionToken({
    role: 'client',
    slug: 'romeo-juliet',
    weddingId: '123e4567-e89b-12d3-a456-426614174000'
  }, 7);

  const verifiedClient = await verifySessionToken(clientToken);
  assert(verifiedClient !== null, 'Client token failed verification');
  assert.strictEqual(verifiedClient.role, 'client');
  assert.strictEqual(verifiedClient.slug, 'romeo-juliet');
  assert.strictEqual(verifiedClient.weddingId, '123e4567-e89b-12d3-a456-426614174000');
  console.log('   ✓ Client session token verified successfully');

  // 3. Check Tamper Resistance
  console.log('3. Testing Tamper Resistance (Payload & Signature Forgery)...');
  const parts = clientToken.split('.');
  
  // Tampered payload (attempting to elevate role to admin)
  const fakePayload = Buffer.from(JSON.stringify({
    role: 'admin',
    exp: Date.now() + 1000000
  })).toString('base64url');
  const tamperedToken = `${fakePayload}.${parts[1]}`;
  const tamperedResult = await verifySessionToken(tamperedToken);
  assert.strictEqual(tamperedResult, null, 'Tampered token MUST be rejected');

  // Corrupted signature
  const corruptedSignature = `${parts[0]}.${parts[1].slice(0, -4)}xxxx`;
  const corruptedResult = await verifySessionToken(corruptedSignature);
  assert.strictEqual(corruptedResult, null, 'Corrupted signature MUST be rejected');
  console.log('   ✓ Tamper resistance passed (forged tokens rejected)');

  // 4. Check Expired Token
  console.log('4. Testing Expiration Handling...');
  const expiredToken = await createSessionToken({ role: 'admin' }, -1); // expired 1 day ago
  const expiredResult = await verifySessionToken(expiredToken);
  assert.strictEqual(expiredResult, null, 'Expired token MUST return null');
  console.log('   ✓ Expired tokens rejected successfully');

  // 5. Check HTML Sanitizer (XSS Prevention)
  console.log('5. Testing HTML Sanitization (XSS Prevention)...');
  const xssInput = '<script>alert("xss")</script><img src="x" onerror="stealCookie()">';
  const sanitized = sanitizeHTML(xssInput);
  assert(!sanitized.includes('<script>'), 'Script tag not stripped/escaped');
  assert(!sanitized.includes('<img'), 'Image tag not stripped/escaped');
  assert(sanitized.includes('&lt;script&gt;'), 'HTML entities not encoded properly');
  assert(sanitized.includes('&lt;img'), 'HTML tag not encoded properly');
  console.log('   ✓ HTML sanitization passed');

  // 6. Check RSVP Input Validator
  console.log('6. Testing RSVP Input Validation...');
  const validRSVP = validateRSVPInput('  Budi Santoso  ', 'attending', '2');
  assert.strictEqual(validRSVP.name, 'Budi Santoso');
  assert.strictEqual(validRSVP.status, 'attending');
  assert.strictEqual(validRSVP.count, 2);

  // Invalid RSVP count
  assert.throws(() => validateRSVPInput('Budi', 'attending', '999'), /Guest count/);
  // Invalid attendance status
  assert.throws(() => validateRSVPInput('Budi', 'maybe' as any, '1'), /Invalid attendance status/);
  console.log('   ✓ RSVP input validator passed');

  // 7. Check SHA256 Password Hash Consistency
  console.log('7. Testing Password Hash Function...');
  const hash1 = await hashPasswordSHA256('rahasia123');
  const hash2 = await hashPasswordSHA256('rahasia123');
  assert.strictEqual(hash1, hash2, 'Hash output should be deterministic');
  assert.strictEqual(hash1.length, 64, 'SHA-256 hex string length must be 64 characters');
  console.log('   ✓ Password hash consistency verified');

  console.log('\n=========================================');
  console.log('🎉 ALL SECURITY & AUTH SELF-CHECKS PASSED!');
  console.log('=========================================\n');
}

runChecks().catch((err) => {
  console.error('\n❌ SELF-CHECK FAILED:', err);
  process.exit(1);
});
