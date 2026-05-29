/**
 * Pure helpers for intra-line (word-level) diff highlighting.
 *
 * Given a removed line and the adjacent added line, computes which word tokens
 * changed so the renderer can emphasize only the differing parts instead of the
 * whole line. Uses a longest-common-subsequence over tokens. This is best-effort
 * cosmetic highlighting, not a semantic diff.
 */

export interface DiffSegment {
  text: string;
  changed: boolean;
}

/** Splits a line into word + whitespace + punctuation tokens, preserving all chars. */
export const tokenizeLine = (line: string): string[] => line.match(/\s+|\w+|[^\s\w]+/g) ?? [];

const lcsTable = (a: string[], b: string[]): number[][] => {
  const table: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0)
  );

  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i]![j] = a[i] === b[j] ? table[i + 1]![j + 1]! + 1 : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
    }
  }

  return table;
};

/**
 * Returns segments for both lines marking which tokens are common (changed:false)
 * and which are unique to that line (changed:true).
 */
export const diffLineTokens = (
  removed: string,
  added: string
): { removed: DiffSegment[]; addedSegments: DiffSegment[] } => {
  const removedTokens = tokenizeLine(removed);
  const addedTokens = tokenizeLine(added);
  const table = lcsTable(removedTokens, addedTokens);

  const removedSegments: DiffSegment[] = [];
  const addedSegments: DiffSegment[] = [];

  let i = 0;
  let j = 0;

  const pushSegment = (segments: DiffSegment[], text: string, changed: boolean): void => {
    const last = segments[segments.length - 1];

    if (last && last.changed === changed) {
      last.text += text;
    } else {
      segments.push({ text, changed });
    }
  };

  while (i < removedTokens.length && j < addedTokens.length) {
    if (removedTokens[i] === addedTokens[j]) {
      pushSegment(removedSegments, removedTokens[i]!, false);
      pushSegment(addedSegments, addedTokens[j]!, false);
      i += 1;
      j += 1;
    } else if (table[i + 1]![j]! >= table[i]![j + 1]!) {
      pushSegment(removedSegments, removedTokens[i]!, true);
      i += 1;
    } else {
      pushSegment(addedSegments, addedTokens[j]!, true);
      j += 1;
    }
  }

  while (i < removedTokens.length) {
    pushSegment(removedSegments, removedTokens[i]!, true);
    i += 1;
  }

  while (j < addedTokens.length) {
    pushSegment(addedSegments, addedTokens[j]!, true);
    j += 1;
  }

  return { removed: removedSegments, addedSegments };
};
