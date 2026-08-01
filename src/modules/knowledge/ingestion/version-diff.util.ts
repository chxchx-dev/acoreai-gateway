export interface DiffEntry {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

// LCS clásico a nivel de párrafo. Suficiente para documentos de tamaño MVP
// (decenas de párrafos); no pretende ser un diff de palabra por palabra.
function lcsDiff(a: string[], b: string[]): DiffEntry[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const result: DiffEntry[] = [];
  let i = 0;
  let j = 0;

  while (i < n && j < m) {
    if (a[i] === b[j]) {
      result.push({ type: 'unchanged', text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: 'removed', text: a[i] });
      i++;
    } else {
      result.push({ type: 'added', text: b[j] });
      j++;
    }
  }
  while (i < n) {
    result.push({ type: 'removed', text: a[i] });
    i++;
  }
  while (j < m) {
    result.push({ type: 'added', text: b[j] });
    j++;
  }

  return result;
}

export interface VersionDiffSummary {
  paragraphs: DiffEntry[];
  addedCount: number;
  removedCount: number;
  affectedSections: string[];
}

export function summarizeTextDiff(fromText: string, toText: string): VersionDiffSummary {
  const paragraphs = lcsDiff(splitParagraphs(fromText), splitParagraphs(toText));
  const addedCount = paragraphs.filter((p) => p.type === 'added').length;
  const removedCount = paragraphs.filter((p) => p.type === 'removed').length;

  const affectedSections = Array.from(
    new Set(
      paragraphs
        .filter((p) => p.type !== 'unchanged')
        .map((p) => /^#{1,6}\s+(.+)$/.exec(p.text)?.[1])
        .filter((s): s is string => Boolean(s)),
    ),
  );

  return { paragraphs, addedCount, removedCount, affectedSections };
}
