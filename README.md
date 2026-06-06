# Invitation Platform

Astro SSR invitation platform for Cloudflare Pages, backed by Supabase data and self-contained invitation templates.

## Stack

- Astro 4 with `@astrojs/cloudflare`
- Supabase client for invitation data, RSVP, wishes, and view tracking
- Template folders under `src/templates/{template-key}/`
- Sass for global and template-specific styles

## Project Structure

```text
public/
  favicon.svg
  fonts/
  images/
src/
  components/common/
  layouts/
  lib/
  pages/
    [slug].astro
    api/
  services/
  styles/
  templates/
    noir/
      NoirTemplate.astro
      style.scss
      script.js
      assets/
  types/
  utils/
```

Template files stay colocated in one folder. See `src/templates/README.md` before adding a new template.
For data and deployment maintenance, see `docs/MAINTENANCE.md`.

## Environment

Create `.env` locally and configure the same variables in Cloudflare Pages:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DASHBOARD_PASSWORD=
```

## Commands

```sh
npm install
npm run dev
npm run build
npm run preview
```

## Cloudflare Pages

Use these build settings:

- Build command: `npm run build`
- Build output directory: `dist`
- Node.js version: `20.18.0` or newer

The project uses server output with the Cloudflare adapter, so dynamic invitation routes and API endpoints run in the Pages serverless runtime.
