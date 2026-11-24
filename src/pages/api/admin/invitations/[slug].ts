import type { APIRoute } from 'astro';
import { jsonResponse } from '../../../../utils/http';
import {
  getAdminInvitationBySlug,
  handleAdminApiError,
  parseAdminJsonBody,
  patchAdminInvitation,
  resolveAdminApiAuth
} from '../../../../services/admin-api';

export const prerender = false;

export const GET: APIRoute = async ({ params, request, locals, cookies }) => {
  try {
    const auth = await resolveAdminApiAuth(request, locals, cookies);
    if (auth instanceof Response) return auth;

    const data = await getAdminInvitationBySlug(auth.adminSupabase, params.slug || '');
    return jsonResponse({
      success: true,
      ...data,
      publicUrl: `/${data.wedding.slug}`,
      editUrl: `/dashboard/${data.wedding.slug}/edit`
    });
  } catch (error) {
    return handleAdminApiError(error, 'Failed to fetch invitation.');
  }
};

export const PATCH: APIRoute = async ({ params, request, locals, cookies }) => {
  try {
    const auth = await resolveAdminApiAuth(request, locals, cookies);
    if (auth instanceof Response) return auth;

    const body = await parseAdminJsonBody(request);
    const data = await patchAdminInvitation(auth.adminSupabase, params.slug || '', body, auth.actorName);
    return jsonResponse({
      success: true,
      ...data
    });
  } catch (error) {
    return handleAdminApiError(error, 'Failed to update invitation.');
  }
};
