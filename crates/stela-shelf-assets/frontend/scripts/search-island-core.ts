/**
 * Shared Search Island document schema and ranking helpers for Svelte & SolidJS.
 */

export interface SearchDoc {
  id: number;
  slug?: string;
  title: string;
  url: string;
  path?: string;
  aliases?: string[];
  kind?: string;
  section?: string;
  image?: string;
  headings?: string[];
  text?: string;
}

interface SegmenterLike {
  segment(input: string): Iterable<{ segment: string; isWordLike?: boolean }>;
}

function tokenizeQuery(query: string): string[] {
  const q = query.trim();
  if (!q) return [];

  const SegmenterCtor = (
    Intl as unknown as { Segmenter?: new (locales?: string, options?: { granularity: string }) => SegmenterLike }
  ).Segmenter;

  if (typeof SegmenterCtor === 'function') {
    const segmenter = new SegmenterCtor(undefined, { granularity: 'word' });
    const tokens: string[] = [];
    for (const { segment, isWordLike } of segmenter.segment(q)) {
      if (isWordLike) tokens.push(segment.toLowerCase());
    }
    if (tokens.length > 0) return tokens;
  }

  return q
    .toLowerCase()
    .split(/[\s、,，.。]+/)
    .filter(Boolean);
}

function scoreDoc(doc: SearchDoc, qLower: string, tokens: string[]): number {
  const title = doc.title.toLowerCase();
  const slug = (doc.slug ?? '').toLowerCase();
  const path = (doc.path ?? '').toLowerCase();
  const aliases = (doc.aliases ?? []).map((a) => a.toLowerCase());
  const headings = (doc.headings ?? []).map((h) => h.toLowerCase());
  const body = (doc.text ?? '').toLowerCase();

  // Require every query token to appear in at least one searchable field
  for (const tok of tokens) {
    const hit =
      title.includes(tok) ||
      slug.includes(tok) ||
      path.includes(tok) ||
      aliases.some((a) => a.includes(tok)) ||
      headings.some((h) => h.includes(tok)) ||
      body.includes(tok);
    if (!hit) return 0;
  }

  let score = 1;
  if (title === qLower) score += 120;
  else if (title.startsWith(qLower)) score += 80;
  else if (title.includes(qLower)) score += 50;

  if (aliases.some((a) => a === qLower)) score += 95;
  else if (aliases.some((a) => a.startsWith(qLower))) score += 65;
  else if (aliases.some((a) => a.includes(qLower))) score += 40;

  if (slug === qLower || path.endsWith(`/${qLower}.tmt`)) score += 55;
  else if (slug.includes(qLower) || path.includes(qLower)) score += 20;

  if (headings.some((h) => h.includes(qLower))) score += 25;
  if (body.includes(qLower)) score += 8;

  return score;
}

export function filterAndRankDocs(docs: SearchDoc[], rawQuery: string, limit = 10): SearchDoc[] {
  const qLower = rawQuery.trim().toLowerCase();
  if (!qLower) return [];

  const tokens = tokenizeQuery(rawQuery);
  if (tokens.length === 0) return [];

  const scored: Array<{ doc: SearchDoc; score: number }> = [];
  for (const doc of docs) {
    const score = scoreDoc(doc, qLower, tokens);
    if (score > 0) {
      scored.push({ doc, score });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title));
  return scored.slice(0, limit).map((entry) => entry.doc);
}

export function isEditableElement(el: Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable
  );
}
