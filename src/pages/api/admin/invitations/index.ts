import type { APIRoute } from 'astro';
import { jsonResponse, parseBoundedInt } from '../../../../utils/http';
import {
  createAdminInvitation,
  handleAdminApiError,
  listAdminInvitations,
  parseAdminJsonBody,
  resolveAdminApiAuth
} from '../../../../services/admin-api';

export const prerender = false;

export const GET: APIRoute = async ({ request, url, locals, cookies }) => {
  try {
    const auth = await resolveAdminApiAuth(request, locals, cookies);
    if (auth instanceof Response) return auth;

    const status = url.searchParams.get('status');
    const limit = parseBoundedInt(url.searchParams.get('limit'), 50, 1, 200);
    const items = await listAdminInvitations(auth.adminSupabase, { status, limit });

    return jsonResponse({
      success: true,
      count: items.length,
      items
    });
  } catch (error) {
    return handleAdminApiError(error, 'Failed to list invitations.');
  }
};

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  try {
    const auth = await resolveAdminApiAuth(request, locals, cookies);
    if (auth instanceof Response) return auth;

    const body = await parseAdminJsonBody(request);
    const result = await createAdminInvitation(auth.adminSupabase, body, auth.actorName);
    return jsonResponse({ success: true, ...result }, 201);
  } catch (error) {
    return handleAdminApiError(error, 'Failed to create invitation.');
  }
};
