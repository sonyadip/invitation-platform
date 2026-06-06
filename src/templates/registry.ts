const templateModules = import.meta.glob('./*/*Template.astro');

export function listTemplateKeys(): string[] {
  return Object.keys(templateModules)
    .map((path) => path.split('/')[1])
    .filter(Boolean)
    .sort();
}

export function normalizeTemplateKey(template?: string | null): string {
  return (template || 'noir').trim().toLowerCase();
}

export function toPascalCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

export async function loadTemplate(template?: string | null) {
  const key = normalizeTemplateKey(template);
  const templateName = toPascalCase(key);
  const templatePath = `./${key}/${templateName}Template.astro`;
  const load = templateModules[templatePath];

  if (!load) {
    return {
      key,
      component: null
    };
  }

  const module = await load() as { default: unknown };
  return {
    key,
    component: module.default
  };
}
