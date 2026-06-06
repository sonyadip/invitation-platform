# Maintenance Guide

This guide explains which files to update when adding data, fields, templates, or endpoints.

## Data Flow

```text
Supabase tables
  -> src/services/invitation.ts
  -> src/types/index.ts
  -> src/pages/[slug].astro
  -> src/templates/{template}/
```

`src/pages/[slug].astro` only controls the render flow. Supporting logic lives in services and helpers so the page does not become crowded.

## Add Invitation Data

When adding new rows only, update:

- `seed.sql` for local sample data.
- The related Supabase table for production data.

When adding a new column, update:

- `schema.sql` for the database structure.
- `seed.sql` for sample data.
- `src/types/index.ts` so TypeScript knows the new field.
- `src/services/invitation.ts` if the field needs parsing or normalization.
- Any template that renders the field, for example `src/templates/noir/NoirTemplate.astro`.

## Dashboard Image Uploads

Dashboard image uploads use Supabase Storage through the server-side service role client.

- Bucket name: `SUPABASE_STORAGE_BUCKET`, default `invitation-images`.
- Upload limit: `MAX_IMAGE_UPLOAD_MB`, default `5`.
- Supported formats: JPG, PNG, WebP, GIF, AVIF.
- Hero, bride, and groom image URLs are stored in `invitation_settings.theme_config.assets`.
- Gallery image URLs are stored in `gallery_images`.

The bucket is created automatically as a public bucket when the first dashboard upload runs.

Permanent delete removes Supabase Storage files from this bucket only when the same file URL is not referenced by another invitation. This protects duplicated invitations that still share the same uploaded images.

## Add A Template

Follow this structure:

```text
src/templates/
  classic/
    ClassicTemplate.astro
    style.scss
    script.js
    assets/
```

Then set `wedding.template = 'classic'` in the database. The template registry automatically resolves the component from the folder and template name.
The dashboard create/edit forms use the same registry, so the template dropdown updates automatically when a valid template folder is added.

## Add An API Endpoint

Use the existing helper pattern:

- `src/utils/http.ts` for `jsonResponse` and numeric query parsing.
- `src/utils/security.ts` for input validation.
- `src/lib/supabase.ts` for the database connection.

Existing endpoints:

- `src/pages/api/rsvp.ts`
- `src/pages/api/wishes.ts`

## Runtime Invitation

Runtime helpers:

- `src/services/invitation-runtime.ts`: domain/slug resolver, password gate, status maintenance/expired.
- `src/services/view-tracking.ts`: view counter.
- `src/templates/registry.ts`: dynamic template loading.

If you add a new access rule, put it in `invitation-runtime.ts`. If you add analytics behavior, create a dedicated service so `[slug].astro` stays focused.
