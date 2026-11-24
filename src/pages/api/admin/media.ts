import type { APIRoute } from 'astro';
import { jsonResponse } from '../../../utils/http';
import {
  AdminApiError,
  handleAdminApiError,
  resolveAdminApiAuth,
  uploadAdminMedia
} from '../../../services/admin-api';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  try {
    const auth = await resolveAdminApiAuth(request, locals, cookies);
    if (auth instanceof Response) return auth;

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      throw new AdminApiError(400, 'Content-Type must be multipart/form-data.');
    }

    const formData = await request.formData();
    const slug = String(formData.get('slug') || '').trim();
    const scope = String(formData.get('scope') || formData.get('folder') || 'media').trim();
    const customFilename = String(formData.get('filename') || '').trim() || undefined;

    const candidateEntries = [
      ...formData.getAll('files'),
      ...formData.getAll('file')
    ];
    const files = candidateEntries.filter(
      (entry): entry is File => typeof entry === 'object' && entry !== null && 'size' in entry && 'arrayBuffer' in entry
    );

    const uploaded = await uploadAdminMedia({
      files,
      slug,
      scope,
      customFilename,
      adminSupabase: auth.adminSupabase,
      runtimeEnv: auth.runtimeEnv
    });

    return jsonResponse({
      success: true,
      url: uploaded[0].url,
      key: uploaded[0].key,
      files: uploaded
    });
  } catch (error) {
    return handleAdminApiError(error, 'Failed to upload media.');
  }
};
