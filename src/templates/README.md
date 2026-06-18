# Template convention

Each template lives in its own folder:

```text
src/templates/
  noir/
    NoirTemplate.astro
    style.scss
    script.js
    assets/
  sage/
    SageTemplate.astro
    style.scss
    script.js
    assets/
  ochre/
    OchreTemplate.astro
    style.scss
    script.js
    assets/
  deauville/
    DeauvilleTemplate.astro
    style.scss
    script.js
    assets/
  editorial/
    EditorialTemplate.astro
    style.scss
    script.js
    assets/
```

Rules:

- Use `src/templates/{template-key}/{PascalCaseKey}Template.astro`.
- Import `./style.scss` and `./script.js` inside the template component.
- Put template-specific images, videos, and other files in `assets/`, then import them from the Astro component.
- Pass `templateClass="template-{template-key}"` to `BaseLayout`.
- Use general section classes such as `template-cover`, `template-hero`, `template-couple`, and `template-events`.
- Scope styling from the body class, for example `body.template-noir`.
- Use `data-template-*` attributes for JavaScript selectors so behavior is not tied to visual class names.
- Dashboard template dropdown options are generated from folders in `src/templates/`.

When adding a new template, set `wedding.template` to the folder key, for example `noir`, `sage`, `ochre`, `deauville`, or `editorial`.
