const ACRONYMS = new Set(['Qa', 'Ai', 'Ba']);

// "QA_ENGINEER" -> "QA Engineer". Good enough for every role key in
// packages/database/prisma/seed.ts (ROLES) without a lookup table -- role keys are always
// SCREAMING_SNAKE_CASE, with QA/AI/BA the only acronym-shaped words among them.
export function formatRoleKey(roleKey: string): string {
  return roleKey
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .split(' ')
    .map((word) => (ACRONYMS.has(word) ? word.toUpperCase() : word))
    .join(' ');
}
