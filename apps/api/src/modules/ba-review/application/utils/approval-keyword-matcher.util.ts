// Default approval keywords from the spec; case-insensitive substring match. Kept as a plain
// constant (not a DB-configurable table) for v1 -- "configured approval keyword" from the spec is
// satisfied by editing this list, not a runtime admin UI, to avoid a whole settings surface for
// something that rarely changes per organization.
export const DEFAULT_APPROVAL_KEYWORDS = ['approved', 'looks good', 'accepted', 'final approved', 'go ahead', 'lgtm'];

export function isApprovalReply(text: string, extraKeywords: string[] = []): boolean {
  const normalized = text.toLowerCase();
  return [...DEFAULT_APPROVAL_KEYWORDS, ...extraKeywords.map((keyword) => keyword.toLowerCase())].some((keyword) =>
    normalized.includes(keyword),
  );
}
