import { Injectable } from '@nestjs/common';
import { normalizeLocale } from '../entities/entity-translation.resolver';

export type SearchIntentSignal = {
  kind: 'material' | 'culture' | 'object' | 'mechanism' | 'discipline' | 'concept';
  value: string;
};

export type SearchQueryVariant = {
  query: string;
  reason: string;
  weight: number;
};

export type SearchIntentResult = {
  locale: string;
  rawQuery: string;
  normalizedQuery: string;
  significantTerms: string[];
  signals: SearchIntentSignal[];
  variants: SearchQueryVariant[];
};

const STOPWORDS = new Set([
  'a',
  'al',
  'and',
  'arte',
  'art',
  'box',
  'con',
  'de',
  'del',
  'el',
  'en',
  'for',
  'la',
  'las',
  'los',
  'of',
  'para',
  'por',
  'sobre',
  'the',
  'un',
  'una',
  'with',
  'wooden',
  'y',
]);

const DIRECT_REWRITES: Array<{
  match: RegExp;
  replacement: string;
  reason: string;
  signals: SearchIntentSignal[];
}> = [
  {
    match: /\bjimikubako\b/i,
    replacement: 'himitsubako japanese puzzle box',
    reason: 'common misspelling rewrite',
    signals: [
      { kind: 'object', value: 'puzzle box' },
      { kind: 'culture', value: 'japanese' },
    ],
  },
];

const TERM_EXPANSIONS: Record<string, { additions: string[]; signals?: SearchIntentSignal[] }> = {
  japonesa: { additions: ['japon', 'japanese'], signals: [{ kind: 'culture', value: 'japan' }] },
  japones: { additions: ['japon', 'japanese'], signals: [{ kind: 'culture', value: 'japan' }] },
  japanese: { additions: ['japon', 'japanese'], signals: [{ kind: 'culture', value: 'japan' }] },
  madera: { additions: ['wood', 'wooden'], signals: [{ kind: 'material', value: 'wood' }] },
  wood: { additions: ['madera', 'wooden'], signals: [{ kind: 'material', value: 'wood' }] },
  wooden: { additions: ['madera', 'wood'], signals: [{ kind: 'material', value: 'wood' }] },
  caja: { additions: ['box', 'objeto'], signals: [{ kind: 'object', value: 'box' }] },
  box: { additions: ['caja', 'objeto'], signals: [{ kind: 'object', value: 'box' }] },
  rompecabezas: {
    additions: ['puzzle', 'trick'],
    signals: [{ kind: 'mechanism', value: 'puzzle' }],
  },
  puzzle: {
    additions: ['rompecabezas', 'trick'],
    signals: [{ kind: 'mechanism', value: 'puzzle' }],
  },
  secreto: {
    additions: ['secret', 'hidden'],
    signals: [{ kind: 'mechanism', value: 'hidden opening' }],
  },
  secreta: {
    additions: ['secret', 'hidden'],
    signals: [{ kind: 'mechanism', value: 'hidden opening' }],
  },
  secret: {
    additions: ['secreto', 'hidden'],
    signals: [{ kind: 'mechanism', value: 'hidden opening' }],
  },
  hidden: {
    additions: ['secret', 'oculto'],
    signals: [{ kind: 'mechanism', value: 'hidden opening' }],
  },
  urinal: { additions: ['urinario', 'porcelain'], signals: [{ kind: 'object', value: 'urinal' }] },
  urinario: { additions: ['urinal', 'porcelain'], signals: [{ kind: 'object', value: 'urinal' }] },
  porcelana: { additions: ['porcelain'], signals: [{ kind: 'material', value: 'porcelain' }] },
  porcelain: { additions: ['porcelana'], signals: [{ kind: 'material', value: 'porcelain' }] },
  museo: {
    additions: ['museum', 'objeto'],
    signals: [{ kind: 'concept', value: 'museum object' }],
  },
  museum: {
    additions: ['museo', 'object'],
    signals: [{ kind: 'concept', value: 'museum object' }],
  },
  artesania: {
    additions: ['craft', 'artesanal'],
    signals: [{ kind: 'discipline', value: 'craft' }],
  },
  craft: {
    additions: ['artesania', 'artesanal'],
    signals: [{ kind: 'discipline', value: 'craft' }],
  },
};

@Injectable()
export class SearchIntentService {
  interpret(query: string | undefined, locale?: string): SearchIntentResult {
    const rawQuery = (query ?? '').trim();
    const safeLocale = normalizeLocale(locale);
    const normalizedQuery = this.normalize(rawQuery);
    const significantTerms = this.significantTerms(normalizedQuery);
    const signals: SearchIntentSignal[] = [];
    const variants: SearchQueryVariant[] = [];
    const seen = new Set<string>();

    this.pushVariant(variants, seen, rawQuery, 'raw query', 1);
    this.pushVariant(variants, seen, normalizedQuery, 'normalized query', 0.98);

    for (const rewrite of DIRECT_REWRITES) {
      if (rewrite.match.test(normalizedQuery)) {
        signals.push(...rewrite.signals);
        this.pushVariant(variants, seen, rewrite.replacement, rewrite.reason, 0.96);
      }
    }

    if (significantTerms.length) {
      this.pushVariant(variants, seen, significantTerms.join(' '), 'significant terms', 0.94);
    }

    const expandedTerms = new Set(significantTerms);
    for (const term of significantTerms) {
      const expansion = TERM_EXPANSIONS[term];
      if (!expansion) continue;
      for (const addition of expansion.additions) {
        expandedTerms.add(addition);
      }
      if (expansion.signals?.length) {
        signals.push(...expansion.signals);
      }
    }

    if (expandedTerms.size > significantTerms.length) {
      this.pushVariant(
        variants,
        seen,
        Array.from(expandedTerms).join(' '),
        'expanded vocabulary',
        0.9,
      );
    }

    return {
      locale: safeLocale,
      rawQuery,
      normalizedQuery,
      significantTerms,
      signals: this.dedupeSignals(signals),
      variants,
    };
  }

  private pushVariant(
    target: SearchQueryVariant[],
    seen: Set<string>,
    query: string,
    reason: string,
    weight: number,
  ) {
    const normalized = query.trim();
    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    target.push({ query: normalized, reason, weight });
  }

  private normalize(query: string) {
    return query
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private significantTerms(query: string) {
    return query
      .split(/\s+/)
      .map((term) => term.trim())
      .filter((term) => term.length > 2 && !STOPWORDS.has(term));
  }

  private dedupeSignals(signals: SearchIntentSignal[]) {
    const seen = new Set<string>();
    return signals.filter((signal) => {
      const key = `${signal.kind}:${signal.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
