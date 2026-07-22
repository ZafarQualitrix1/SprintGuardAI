// Minimal {{variable}} substitution -- no logic/loops/conditionals needed for the flat variable
// maps every capability prompt in this pass uses. A templating engine (Handlebars, etc.) is a
// drop-in upgrade if a future prompt needs more than substitution.
export function renderTemplate(template: string, variables: Record<string, unknown>): string {
  return template.replace(/{{\s*(\w+)\s*}}/g, (match, key: string) => {
    if (!(key in variables)) {
      return match;
    }
    const value = variables[key];
    return value === null || value === undefined ? '' : String(value);
  });
}
