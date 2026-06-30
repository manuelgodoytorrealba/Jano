import {
  collectCuratedCandidates,
  mergeCuratedCandidates,
  pickDiverseCurated,
  rankCuratedCandidates,
} from './curated-ranking';

describe('curated ranking', () => {
  it('combines direct and bridge scores while preserving type diversity', () => {
    const concept = { id: 'concept', title: 'Memory', type: 'CONCEPT' };
    const artist = { id: 'artist', title: 'Artist', type: 'ARTIST' };
    const artwork = { id: 'artwork', title: 'Artwork', type: 'ARTWORK' };
    const direct = collectCuratedCandidates(
      [
        {
          relationType: { key: 'RELATED_TO' },
          weight: 1,
          from: concept,
          to: artist,
        },
      ],
      new Set([concept.id]),
    );
    const bridge = collectCuratedCandidates(
      [{ relationType: { key: 'CREATED_BY' }, weight: 1, from: artist, to: artwork }],
      new Set([artist.id]),
      0.62,
    );

    const ranked = rankCuratedCandidates(mergeCuratedCandidates(direct, bridge));

    expect(ranked.map(({ entity }) => entity.id)).toEqual(['artist', 'artwork']);
    expect(pickDiverseCurated(ranked, 2, new Set()).map((entity) => entity.type)).toEqual([
      'ARTIST',
      'ARTWORK',
    ]);
  });
});
