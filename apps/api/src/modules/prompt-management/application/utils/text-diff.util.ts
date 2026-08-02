export type DiffLineType = 'unchanged' | 'added' | 'removed';

export interface DiffLine {
  type: DiffLineType;
  text: string;
}

// Small in-house LCS-based line diff -- prompt templates are plain text, not code, so this is
// sufficient without adding a dependency (`diff`/`jsdiff`) for what's fundamentally a few dozen
// lines of text per version.
export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split('\n');
  const b = after.split('\n');
  const m = a.length;
  const n = b.length;

  // lcs[i][j] = length of the longest common subsequence of a[i..] and b[j..]
  const lcs: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      result.push({ type: 'unchanged', text: a[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      result.push({ type: 'removed', text: a[i] });
      i++;
    } else {
      result.push({ type: 'added', text: b[j] });
      j++;
    }
  }
  while (i < m) result.push({ type: 'removed', text: a[i++] });
  while (j < n) result.push({ type: 'added', text: b[j++] });

  return result;
}
