// Same {{variable}} syntax renderTemplate() substitutes (prompt-template.util.ts) -- parsed here
// read-only, purely for the editor's "insert variable" helper and the Variables reference view.
// Always accurate since it reads the template itself, never a separately-maintained list that
// could drift out of sync.
export function detectVariables(template: string): string[] {
  const matches = template.matchAll(/{{\s*(\w+)\s*}}/g);
  const seen = new Set<string>();
  for (const match of matches) {
    seen.add(match[1]);
  }
  return [...seen];
}
