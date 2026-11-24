import assert from 'node:assert/strict';
import {
  AdminApiError,
  extractBearerToken,
  inferMediaContentType,
  mergeThemeConfig,
  normalizeEvents,
  normalizeGalleryUrls,
  normalizeGifts,
  resolveAdminApiAuth,
  resolveGallerySwaps,
  validateAdminSlug
} from '../src/services/admin-api';
import { POST as postMedia } from '../src/pages/api/admin/media';
import { GET as listInvitations, POST as createInvitationRoute } from '../src/pages/api/admin/invitations/index';
import { GET as getInvitationRoute, PATCH as patchInvitationRoute } from '../src/pages/api/admin/invitations/[slug]';

function makeCookies() {
  return {
    get: () => undefined,
    set: () => {},
    delete: () => {}
  } as any;
}

function makeLocals(env?: Record<string, string | undefined>) {
  return {
    session: null,
    requestId: 'test-req',
    runtime: env ? { env } : undefined
  } as any;
}

async function run() {
  // 1. Slug validation
  assert.equal(validateAdminSlug('Priadnyana-Nila'), 'priadnyana-nila');
  assert.throws(() => validateAdminSlug('bad slug!'), AdminApiError);
  assert.throws(() => validateAdminSlug('../secret'), AdminApiError);

  // 2. MIME inference (including octet-stream fallback from curl/CLI uploads)
  assert.deepEqual(inferMediaContentType('cover.webp', 'application/octet-stream'), {
    contentType: 'image/webp',
    ext: 'webp'
  });
  assert.deepEqual(inferMediaContentType('song.mp3', ''), {
    contentType: 'audio/mpeg',
    ext: 'mp3'
  });
  assert.throws(() => inferMediaContentType('payload.exe', 'application/octet-stream'), AdminApiError);

  // 3. Theme config merge, CSS sanitization, Instagram URL normalization, and key deletion
  const merged = mergeThemeConfig(
    {
      theme: { primaryColor: '#111', bgColor: '#000' },
      layout: { heroStyle: 'centered', galleryColumns: 3 },
      assets: { coverImage: 'https://cdn/cover.webp', oldImage: 'https://cdn/old.webp' },
      content: { groomFatherName: 'Ayah', oldNote: 'remove-me' },
      customCss: 'body { color: red; }'
    },
    {
      assets: { oldImage: null, rsvpImage: 'https://cdn/rsvp.webp' },
      content: { oldNote: '', groomInstagramUrl: '@pemudaroyal_17' }
    },
    {
      customCss: '<style>body.template-deauville h1 { font-size: 36px; }</style>'
    }
  );
  assert.equal(merged.assets?.coverImage, 'https://cdn/cover.webp');
  assert.equal(merged.assets?.rsvpImage, 'https://cdn/rsvp.webp');
  assert.equal('oldImage' in (merged.assets || {}), false);
  assert.equal(merged.content?.groomInstagramUrl, 'https://www.instagram.com/pemudaroyal_17');
  assert.equal('oldNote' in (merged.content || {}), false);
  assert.equal(merged.customCss, 'body.template-deauville h1 { font-size: 36px; }');

  const clearedCss = mergeThemeConfig(merged, {}, { customCss: '' });
  assert.equal('customCss' in clearedCss, false);

  // 4. Gallery swaps
  const gallery = [
    { id: '1', image_url: 'https://media.senadda.id/slug/gallery/DSC09887.webp', sort_order: 1 },
    { id: '2', image_url: 'https://media.senadda.id/slug/gallery/DSC00285.webp', sort_order: 2 },
    { id: '3', image_url: 'https://media.senadda.id/slug/gallery/DSC00125.webp', sort_order: 3 },
    { id: '5', image_url: 'https://media.senadda.id/slug/gallery/DSC00166.webp', sort_order: 5 },
    { id: '8', image_url: 'https://media.senadda.id/slug/gallery/DSC09979.webp', sort_order: 8 }
  ];
  const swapUpdates = resolveGallerySwaps(gallery, [
    ['DSC00166', 'DSC09979'],
    ['DSC00285', 'DSC00125']
  ]);
  const orderById = Object.fromEntries(swapUpdates.map((u) => [u.id, u.sort_order]));
  assert.deepEqual(orderById, { '2': 3, '3': 2, '5': 8, '8': 5 });
  assert.throws(() => resolveGallerySwaps(gallery, [['NOT_EXIST', 'DSC00125']]), AdminApiError);

  // 5. Event / Gift / Gallery normalization (both camelCase and snake_case)
  const events = normalizeEvents(
    [{ event_name: 'Resepsi', event_date: '2026-12-12T13:00:00+08:00', venue_address: 'Bali', maps_url: 'https://maps.google.com' }],
    true
  );
  assert.equal(events[0].name, 'Resepsi');
  assert.equal(events[0].endTime, 'Selesai');
  assert.throws(() => normalizeEvents([{ name: 'Akad', date: '2026-12-12', venueAddress: 'Bali' }], true), AdminApiError);

  const gifts = normalizeGifts([{ bank_name: 'BCA', account_number: '123', account_name: 'Nila' }]);
  assert.equal(gifts[0].bankName, 'BCA');

  assert.deepEqual(normalizeGalleryUrls([' https://a.webp ', { image_url: 'https://b.webp' }]), [
    'https://a.webp',
    'https://b.webp'
  ]);

  // 6. Bearer extraction & Auth guard checks (route-level)
  const reqWithBearer = new Request('https://senadda.id/api/admin/invitations', {
    headers: { Authorization: 'Bearer test-secret-token' }
  });
  assert.equal(extractBearerToken(reqWithBearer), 'test-secret-token');

  const unauthRes = await listInvitations({
    request: new Request('https://senadda.id/api/admin/invitations'),
    url: new URL('https://senadda.id/api/admin/invitations'),
    locals: makeLocals({ ADMIN_API_TOKEN: 'secret-123' }),
    cookies: makeCookies()
  } as any);
  assert.equal(unauthRes.status, 401);

  const missingServerTokenRes = await resolveAdminApiAuth(
    reqWithBearer,
    makeLocals({ ADMIN_API_TOKEN: '' }),
    makeCookies()
  );
  assert.ok(missingServerTokenRes instanceof Response);
  assert.equal(missingServerTokenRes.status, 503);

  const wrongTokenRes = await postMedia({
    request: new Request('https://senadda.id/api/admin/media', {
      method: 'POST',
      headers: { Authorization: 'Bearer wrong-token' }
    }),
    locals: makeLocals({ ADMIN_API_TOKEN: 'secret-123' }),
    cookies: makeCookies()
  } as any);
  assert.equal(wrongTokenRes.status, 401);

  const authedBadContentType = await postMedia({
    request: new Request('https://senadda.id/api/admin/media', {
      method: 'POST',
      headers: { Authorization: 'Bearer secret-123', 'Content-Type': 'application/json' },
      body: '{}'
    }),
    locals: makeLocals({
      ADMIN_API_TOKEN: 'secret-123',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'dummy-key'
    }),
    cookies: makeCookies()
  } as any);
  assert.equal(authedBadContentType.status, 400);

  const authedInvalidJsonCreate = await createInvitationRoute({
    request: new Request('https://senadda.id/api/admin/invitations', {
      method: 'POST',
      headers: { Authorization: 'Bearer secret-123' },
      body: 'not-json'
    }),
    locals: makeLocals({
      ADMIN_API_TOKEN: 'secret-123',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'dummy-key'
    }),
    cookies: makeCookies()
  } as any);
  assert.equal(authedInvalidJsonCreate.status, 400);

  const authedBadSlugGet = await getInvitationRoute({
    params: { slug: 'INVALID SLUG!' },
    request: new Request('https://senadda.id/api/admin/invitations/INVALID'),
    locals: {
      session: { role: 'admin', exp: Date.now() + 60000 },
      runtime: {
        env: {
          SUPABASE_URL: 'https://example.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'dummy-key'
        }
      }
    } as any,
    cookies: makeCookies()
  } as any);
  // Session auth fallback succeeds and hits slug validation (400)
  assert.equal(authedBadSlugGet.status, 400);

  const unauthPatch = await patchInvitationRoute({
    params: { slug: 'test-slug' },
    request: new Request('https://senadda.id/api/admin/invitations/test-slug', { method: 'PATCH', body: '{}' }),
    locals: makeLocals({ ADMIN_API_TOKEN: 'secret-123' }),
    cookies: makeCookies()
  } as any);
  assert.equal(unauthPatch.status, 401);

  console.log('ALL ADMIN API CHECKS PASSED');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
