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
    expect(result.deterministicClass).toBe('HARD_REJECT');
    expect(result.deterministicReasonCode).toBe('HARD_INCOMPATIBLE_PURPOSE');
  });

  it('routes structured references away from editorial Evidence', async () => {
    const result = await classifier.classify(
      input(
        'instance of human; occupation artist; identifier Q12345; retrieved 2024.',
        STRUCTURED_REFERENCE_PURPOSE,
      ),
    );
    expect(result.decision).toBe('REJECT');
    expect(result.deterministicClass).toBe('HARD_REJECT');
    expect(result.deterministicReasonCode).toBe('HARD_STRUCTURED_REFERENCE');
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
    expect(result.deterministicClass).toBe('SAFE_KEEP');
    expect(result.evidenceProposition?.statement).toContain('Body art is art');
    expect(
      validateEvidenceProposition(
        result.evidenceProposition,
        input(result.evidenceProposition!.statement),
      ),
    ).toMatchObject({ valid: true, unsupportedAddition: 'NONE' });
  });

  it('rejects navigation and mention-only content', async () => {
    const result = await classifier.classify(
      input('Discover the museum. You might like our galleries.'),
    );
    expect(result.decision).toBe('REJECT');
    expect(result.deterministicClass).toBe('HARD_REJECT');
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
    expect(result.deterministicClass).toBe('HARD_REJECT');
  });

  it('does not produce a proposition for an ambiguous fragment', async () => {
    const result = await classifier.classify(
      input('The body appears in many exhibitions and related works across the collection.'),
    );
    expect(result.decision).not.toBe('KEEP');
    expect(result.deterministicClass).toBe('UNCERTAIN');
  });

  it('routes a long plausible fragment to semantic uncertainty instead of hard rejection', async () => {
    const result = await classifier.classify(
      input(
        'The object had a documented symbolic status within a broader cultural setting, and the source explains how memory and collective identity shaped its reception across several decades.',
        'GENERAL_REFERENCE',
      ),
    );

    expect(result.deterministicClass).toBe('UNCERTAIN');
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
        dump,
      ),
    ).toMatchObject({ valid: false, unsupportedAddition: 'MAJOR' });
  });

  it('accepts a grounded paraphrase that is not a literal excerpt substring', () => {
    const excerpt = 'Picasso and Braque developed a radically fragmented pictorial language.';
    expect(
      validateEvidenceProposition(
        {
          statement:
            'Picasso y Braque desarrollaron un lenguaje pictórico radicalmente fragmentado.',
          supportedDimension: 'development / context',
          evidenceRole: 'PARAPHRASED_DOCUMENTARY_SUPPORT',
        },
        input(excerpt),
        excerpt,
      ),
    ).toMatchObject({ valid: true, unsupportedAddition: 'NONE', presentLiteral: false });
  });

  it('rejects an unsupported date as a critical addition', () => {
    const excerpt = 'Picasso and Braque developed a fragmented pictorial language.';
    expect(
      validateEvidenceProposition(
        {
          statement: 'Picasso y Braque inventaron el cubismo en París en 1907.',
          supportedDimension: 'development / context',
          evidenceRole: 'PARAPHRASED_DOCUMENTARY_SUPPORT',
        },
        input(excerpt),
        excerpt,
      ),
    ).toMatchObject({ valid: false, unsupportedAddition: 'CRITICAL' });
  });

  it('rejects causal influence added to chronological context', () => {
    const excerpt =
      'Following two documented discoveries, the practice flourished during the eighteenth century.';
    expect(
      validateEvidenceProposition(
        {
          statement:
            'La práctica floreció durante el siglo XVIII influenciada por los dos descubrimientos.',
          supportedDimension: 'HISTORICAL_CONTEXT',
          evidenceRole: 'PARAPHRASED_DOCUMENTARY_SUPPORT',
        },
        {
          ...input(excerpt),
          candidateEntity: { id: 'practice', canonicalName: 'La práctica', type: 'CONCEPT' },
        },
        excerpt,
        'ABOUT',
      ),
    ).toMatchObject({ valid: false, unsupportedAddition: 'MAJOR' });
  });

  it('preserves uncertainty instead of turning a possibility into fact', () => {
    const excerpt = 'The object may have served a ritual function.';
    expect(
      validateEvidenceProposition(
        {
          statement: 'El objeto tuvo una función ritual.',
          supportedDimension: 'INTERPRETATION',
          evidenceRole: 'PARAPHRASED_DOCUMENTARY_SUPPORT',
        },
        {
          ...input(excerpt),
          candidateEntity: { id: 'object', canonicalName: 'El objeto', type: 'ARTWORK' },
        },
        excerpt,
        'ABOUT',
      ),
    ).toMatchObject({ valid: false, uncertaintyPreserved: false });
  });

  it('requires the proposition to remain centered on the candidate entity', () => {
    const excerpt = 'A painter developed a fragmented visual language.';
    expect(
      validateEvidenceProposition(
        {
          statement: 'El pintor desarrolló un lenguaje visual fragmentado.',
          supportedDimension: 'PRACTICE_OR_METHOD',
          evidenceRole: 'PARAPHRASED_DOCUMENTARY_SUPPORT',
        },
        {
          ...input(excerpt),
          candidateEntity: {
            id: 'abstraction',
            canonicalName: 'Abstracción geométrica',
            type: 'CONCEPT',
          },
        },
        excerpt,
        'ABOUT',
      ),
    ).toMatchObject({ valid: false, entityCentered: false });
  });

  it('accepts relation evidence when the candidate participates explicitly', () => {
    const excerpt = 'Geometric abstraction influenced the practice of a later artist.';
    expect(
      validateEvidenceProposition(
        {
          statement: 'La abstracción geométrica influyó en la práctica de un artista posterior.',
          supportedDimension: 'RELATION',
          evidenceRole: 'PARAPHRASED_DOCUMENTARY_SUPPORT',
        },
        {
          ...input(excerpt),
          candidateEntity: {
            id: 'abstraction',
            canonicalName: 'Abstracción geométrica',
            type: 'CONCEPT',
          },
        },
        excerpt,
        'SUPPORTS_RELATION',
      ),
    ).toMatchObject({ valid: true, entityCentered: true, uncertaintyPreserved: true });
  });
});
