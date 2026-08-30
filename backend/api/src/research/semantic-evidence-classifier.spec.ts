import {
  DeterministicSemanticEvidenceClassifier,
  STRUCTURED_REFERENCE_PURPOSE,
  validateEvidenceProposition,
} from './semantic-evidence-classifier';

const candidate = { id: 'cuerpo', canonicalName: 'Cuerpo', type: 'CONCEPT' };
const input = (excerpt: string, sourcePurpose = 'DOCUMENTARY_TEXT') => ({
  excerpt,
  sourcePurpose,
  source: { title: 'The body in art', locator: 'p. 1' },
  candidateEntity: candidate,
});

describe('DeterministicSemanticEvidenceClassifier', () => {
  const classifier = new DeterministicSemanticEvidenceClassifier();

  it('rejects visual provenance before semantic acceptance', async () => {
    const result = await classifier.classify(
      input('A museum image record and reproduction credit.', 'VISUAL_PROVENANCE'),
    );
    expect(result.decision).toBe('REJECT');
  });

  it('routes structured references away from editorial Evidence', async () => {
    const result = await classifier.classify(
      input(
        'instance of human; occupation artist; identifier Q12345; retrieved 2024.',
        STRUCTURED_REFERENCE_PURPOSE,
      ),
    );
    expect(result.decision).toBe('REJECT');
    expect(result.structuredFactCandidate).toBeNull();
    expect(result.evidenceProposition).toBeNull();
  });

  it('keeps an explicit, reconstructible documentary proposition', async () => {
    const result = await classifier.classify(
      input(
        'Body art is art in which the body, often that of the artist, is the principal medium and focus.',
      ),
    );
    expect(result.decision).toBe('KEEP');
    expect(result.evidenceProposition?.statement).toContain('Body art is art');
    expect(
      validateEvidenceProposition(
        result.evidenceProposition,
        input(result.evidenceProposition!.statement),
      ),
    ).toEqual({
      valid: true,
      reason: 'Proposition is a bounded excerpt sentence with provenance.',
    });
  });

  it('rejects navigation and mention-only content', async () => {
    const result = await classifier.classify(
      input('Discover the museum. You might like our galleries.'),
    );
    expect(result.decision).toBe('REJECT');
    expect(result.evidenceProposition).toBeNull();
  });

  it('rejects promotional density inside a general-reference fragment without rejecting the whole source', async () => {
    const result = await classifier.classify({
      ...input(
        'Explore food and drink in Madrid. Discover shopping, tickets and what’s on across the city.',
        'GENERAL_REFERENCE',
      ),
      source: { title: 'Madrid Destino', locator: 'section' },
      candidateEntity: { id: 'madrid', canonicalName: 'Madrid', type: 'PLACE' },
    });
    expect(result.decision).toBe('REJECT');
  });

  it('does not produce a proposition for an ambiguous fragment', async () => {
    const result = await classifier.classify(
      input('The body appears in many exhibitions and related works across the collection.'),
    );
    expect(result.decision).not.toBe('KEEP');
  });

  it('rejects a proposition that is a structured metadata dump', () => {
    const dump =
      'Cy Twombly born 1928 occupation artist authority id Q123 instance of human collection museum sex male country United States identifier VIAF 49234268 retrieved 2024.';
    expect(
      validateEvidenceProposition(
        {
          statement: dump,
          supportedDimension: 'identity',
          evidenceRole: 'DIRECT_DOCUMENTARY_EVIDENCE',
        },
        input(dump),
      ),
    ).toEqual({
      valid: false,
      reason: 'Proposition resembles a structured key/value dump or an unfocused enumeration.',
    });
  });
});
