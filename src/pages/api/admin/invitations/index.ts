import type { APIRoute } from 'astro';
import { jsonResponse, parseBoundedInt } from '../../../../utils/http';
import {
  AdminApiError,
  createAdminInvitation,
  handleAdminApiError,
  listAdminInvitations,
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

    let body: any;
    try {
      body = await request.json();
    } catch {
      throw new AdminApiError(400, 'Request body must be valid JSON.');
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new AdminApiError(400, 'Request body must be a JSON object.');
    }

    const result = await createAdminInvitation(auth.adminSupabase, body, auth.actorName);
    return jsonResponse({ success: true, ...result }, 201);
  } catch (error) {
    return handleAdminApiError(error, 'Failed to create invitation.');
  }
};
