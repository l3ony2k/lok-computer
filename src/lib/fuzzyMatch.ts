/**
 * Subsequence matching for the keyboard launcher. Every character of the
 * query must appear in order; the score rewards matches at the start, at word
 * starts, and in runs, and penalises distance, so "cfg" finds Config and "ar"
 * puts Are.na ahead of Weather.
 */

export interface FuzzyMatch {
  score: number;
  /** Indices into `text` of the matched characters, for highlighting. */
  indices: number[];
}

const isWordStart = (text: string, index: number) => (
  index === 0 || /[\s\-_./:]/.test(text[index - 1]) || (/[a-z]/.test(text[index - 1]) && /[A-Z]/.test(text[index]))
);

export const fuzzyMatch = (query: string, text: string): FuzzyMatch | null => {
  const needle = query.trim().toLowerCase();
  if (!needle) return { score: 0, indices: [] };
  const haystack = text.toLowerCase();
  if (haystack.startsWith(needle)) {
    return { score: 100 + needle.length * 4 - Math.min(text.length, 40) / 10, indices: Array.from(needle, (_, index) => index) };
  }

  const indices: number[] = [];
  let score = 0;
  let position = 0;
  let previous = -2;
  for (const char of needle) {
    const index = haystack.indexOf(char, position);
    if (index < 0) return null;
    if (char !== ' ') {
      indices.push(index);
      if (index === previous + 1) score += 6;
      else if (isWordStart(text, index)) score += 8;
      else score += 1;
      score -= Math.min(index - position, 10) * 0.5;
      previous = index;
    }
    position = index + 1;
  }
  // Shorter candidates win ties: "Web" over "Weather" for "we".
  score -= Math.min(text.length, 40) / 10;
  return { score, indices };
};

/** Sorts candidates by score, dropping those that do not match. */
export const rankFuzzy = <T>(query: string, candidates: readonly T[], text: (candidate: T) => string): Array<{ item: T; match: FuzzyMatch }> => (
  candidates
    .map((item) => ({ item, match: fuzzyMatch(query, text(item)) }))
    .filter((entry): entry is { item: T; match: FuzzyMatch } => entry.match !== null)
    .sort((a, b) => b.match.score - a.match.score)
);
