import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  ResearchClaimKind,
  ResearchClaimStatus,
  ResearchJobType,
  LibraryMaterialKind,
  LibraryMaterialVersionStatus,
  ResearchProposalReviewState,
} from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { ResearchService } from './research.service';

describe('ResearchService', () => {
  const tx = {
    researchClaim: { create: jest.fn() },
    researchFinding: { create: jest.fn(), update: jest.fn() },
    researchFindingEvidence: { createMany: jest.fn() },
    researchFindingProposal: { update: jest.fn() },
    researchDecision: { create: jest.fn() },
    researchProject: { findUnique: jest.fn(), update: jest.fn() },
    libraryMaterial: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    researchLibraryMaterial: { upsert: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
    researchProject: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    researchProjectSource: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    researchLibraryMaterial: { deleteMany: jest.fn() },
    researchEvidence: {
      count: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    libraryExcerpt: { findFirst: jest.fn() },
    researchClaim: {
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    researchJob: {
      upsert: jest.fn(),
    },
    researchFinding: {
      findFirst: jest.fn(),
    },
    researchFindingProposal: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    researchEntity: {
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    researchRelation: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    relationType: { findUnique: jest.fn() },
    entity: { findUnique: jest.fn() },
    source: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };
  const sources = { search: jest.fn() };
  const library = { createInitialMaterial: jest.fn(), createInitialPdf: jest.fn() };
  const outline = { create: jest.fn(), update: jest.fn(), reorder: jest.fn() };
  let service: ResearchService;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(async (callback) => callback(tx));
    service = new ResearchService(
      prisma as unknown as PrismaService,
      sources as never,
      library as never,
      outline as never,
    );
  });

  it('has no direct Knowledge Core promotion capability', () => {
    expect(ResearchService.prototype).not.toHaveProperty('promoteFindingToEntity');
    expect(ResearchService.prototype).not.toHaveProperty('promoteEntity');
    expect(ResearchService.prototype).not.toHaveProperty('promoteRelation');
    expect(ResearchService.prototype).not.toHaveProperty('createFinding');
    expect(ResearchService.prototype).not.toHaveProperty('decideFinding');
  });

  it('creates a project as private research state, not a canonical entity', async () => {
    prisma.researchProject.create.mockResolvedValue({ id: 'project-1' });

    await service.createProject('user-1', {
      title: '  Goya y guerra  ',
      objective: '  Reunir evidencias documentales  ',
      scope: '  Prado  ',
    });

    expect(prisma.researchProject.create).toHaveBeenCalledWith({
      data: {
        ownerId: 'user-1',
        title: 'Goya y guerra',
        objective: 'Reunir evidencias documentales',
        scope: 'Prado',
      },
    });
  });

  it('lists recent projects with lightweight research counts', async () => {
    prisma.researchProject.findMany.mockResolvedValue([]);

    await service.listProjects('user-1');

    expect(prisma.researchProject.findMany).toHaveBeenCalledWith({
      where: { ownerId: 'user-1' },
      orderBy: [{ lastActiveAt: 'desc' }, { updatedAt: 'desc' }],
      include: {
        _count: {
          select: {
            sources: true,
            evidence: true,
            libraryMaterials: true,
            claims: true,
          },
        },
      },
    });
  });

  it('opens one project with its research context', async () => {
    prisma.researchProject.findUnique.mockResolvedValue({
      id: 'project-1',
      findings: [
        {
          id: 'finding-1',
          evidence: [{ evidenceId: 'evidence-1', evidence: { id: 'evidence-1' } }],
        },
      ],
    });

    await expect(service.getProject('project-1')).resolves.toEqual({
      id: 'project-1',
      materials: [],
      knowledge: {
        projectId: 'project-1',
        scope: 'complete',
        focus: null,
        expansions: { claims: 'LOADED', evidence: 'LOADED', traceability: 'LOADED' },
        entities: [],
        relations: [],
        claims: [],
        contradictions: [],
        supportingEvidence: [],
      },
      findings: [
        {
          id: 'finding-1',
          evidence: [{ evidenceId: 'evidence-1', evidence: { id: 'evidence-1' } }],
        },
      ],
    });

    const read = prisma.researchProject.findUnique.mock.calls[0][0];
    const expectedSource = {
      id: true,
      type: true,
      title: true,
      author: true,
      publisher: true,
      year: true,
      url: true,
    };

    for (const branch of [read.include.claims, read.include.entities]) {
      const trace = branch.include.evidence.include.evidence.include;
      expect(trace.source.select).toEqual(expectedSource);
      expect(trace.libraryExcerpt.select).toMatchObject({
        id: true,
        locator: true,
        text: true,
        materialVersion: {
          select: {
            id: true,
            version: true,
            material: { select: { id: true, title: true, source: { select: expectedSource } } },
          },
        },
      });
    }
  });

  it('exposes the current material version for versioned Library actions', async () => {
    const createdAt = new Date('2026-07-31T10:00:00.000Z');
    prisma.researchProject.findUnique.mockResolvedValue({
      id: 'project-1',
      libraryMaterials: [
        {
          material: {
            id: 'material-1',
            kind: LibraryMaterialKind.TEXT,
            title: 'Cuaderno',
            createdAt,
            updatedAt: createdAt,
            versions: [
              {
                id: 'version-2',
                status: LibraryMaterialVersionStatus.READY,
                content: 'Texto disponible',
                url: null,
                originalName: null,
                mimeType: null,
                sizeBytes: null,
              },
            ],
          },
        },
      ],
    });

    const project = await service.getProject('project-1');

    expect(project.materials).toEqual([
      expect.objectContaining({
        id: 'material-1',
        materialVersionId: 'version-2',
        content: 'Texto disponible',
      }),
    ]);
  });

  it('derives deterministic knowledge without persisting it', async () => {
    prisma.researchProject.findUnique.mockResolvedValue({
      id: 'project-1',
      entities: [{ id: 'entity-b' }, { id: 'entity-a' }],
      relations: [{ id: 'relation-b' }, { id: 'relation-a' }],
      claims: [
        {
          id: 'claim-b',
          kind: 'ASSERTION',
          status: 'SUPPORTED',
          evidence: [{ evidence: { id: 'evidence-1' } }],
        },
        {
          id: 'claim-a',
          kind: 'CONTRADICTION',
          status: 'CONTRADICTED',
          evidence: [{ evidence: { id: 'evidence-1' } }, { evidence: { id: 'evidence-2' } }],
        },
      ],
    });

    const project = await service.getProject('project-1');

    expect(project.knowledge).toEqual({
      projectId: 'project-1',
      scope: 'complete',
      focus: null,
      expansions: { claims: 'LOADED', evidence: 'LOADED', traceability: 'LOADED' },
      entities: [
        { id: 'entity-a', evidence: [] },
        { id: 'entity-b', evidence: [] },
      ],
      relations: [{ id: 'relation-a' }, { id: 'relation-b' }],
      claims: [
        expect.objectContaining({ id: 'claim-a' }),
        expect.objectContaining({ id: 'claim-b' }),
      ],
      contradictions: [expect.objectContaining({ id: 'claim-a' })],
      supportingEvidence: [
        { id: 'evidence-1', excerptStatus: 'UNAVAILABLE' },
        { id: 'evidence-2', excerptStatus: 'UNAVAILABLE' },
      ],
    });
    expect(ResearchService.prototype).not.toHaveProperty('createKnowledge');
    expect(prisma.researchProject.update).not.toHaveBeenCalled();
    expect(prisma.researchEntity.create).not.toHaveBeenCalled();
    expect(prisma.researchRelation.create).not.toHaveBeenCalled();
    expect(prisma.researchClaim.create).not.toHaveBeenCalled();
    expect(prisma.researchEvidence.upsert).not.toHaveBeenCalled();
  });
  it('keeps complete and bibliographic evidence traceable in knowledge', async () => {
    const source = { id: 'source-1', type: 'BOOK', title: 'Catálogo' };
    const excerpt = {
      id: 'excerpt-1',
      locator: 'p. 4',
      text: 'Pasaje documental',
      materialVersion: {
        id: 'version-1',
        version: 1,
        material: { id: 'material-1', title: 'PDF', source },
      },
    };
    const complete = {
      id: 'evidence-1',
      source,
      sourceVersion: 'ed. 1',
      locator: 'p. 4',
      quote: 'Pasaje documental',
      libraryExcerpt: excerpt,
    };
    const bibliographic = {
      id: 'evidence-2',
      source,
      sourceVersion: 'ed. 2',
      locator: 'p. 8',
      quote: 'Cita sin fragmento',
      libraryExcerpt: null,
    };
    prisma.researchProject.findUnique.mockResolvedValue({
      id: 'project-1',
      entities: [{ id: 'entity-1', evidence: [{ evidence: complete }] }],
      relations: [],
      claims: [
        {
          id: 'claim-1',
          kind: 'ASSERTION',
          status: 'SUPPORTED',
          evidence: [{ evidence: complete }, { evidence: bibliographic }],
        },
      ],
    });

    const { knowledge } = await service.getProject('project-1');

    expect(knowledge.entities[0].evidence[0].evidence).toEqual(
      expect.objectContaining({ excerptStatus: 'AVAILABLE', libraryExcerpt: excerpt }),
    );
    expect(knowledge.supportingEvidence).toEqual([
      expect.objectContaining({
        id: 'evidence-1',
        excerptStatus: 'AVAILABLE',
        source,
        libraryExcerpt: excerpt,
      }),
      expect.objectContaining({
        id: 'evidence-2',
        excerptStatus: 'UNAVAILABLE',
        source,
        libraryExcerpt: null,
        sourceVersion: 'ed. 2',
        locator: 'p. 8',
        quote: 'Cita sin fragmento',
      }),
    ]);
  });

  it('reads deterministic topology without Evidence or project detail', async () => {
    prisma.researchProject.findUnique.mockResolvedValue({
      id: 'project-1',
      entities: [{ id: 'entity-b' }, { id: 'entity-a' }],
      relations: [{ id: 'relation-b' }, { id: 'relation-a' }],
    });
    const knowledge = await service.getKnowledge('project-1', { scope: 'topology' });

    expect(knowledge).toMatchObject({
      scope: 'topology',
      expansions: { claims: 'SUMMARY', evidence: 'NOT_LOADED', traceability: 'NOT_LOADED' },
      entities: [{ id: 'entity-a' }, { id: 'entity-b' }],
      relations: [{ id: 'relation-a' }, { id: 'relation-b' }],
      supportingEvidence: [],
    });
    const read = prisma.researchProject.findUnique.mock.calls[0][0];
    expect(read.select).not.toHaveProperty('outlineSections');
    expect(read.select.entities).not.toHaveProperty('include');
  });
  it('resolves Entity and Relation focus within the requested Research', async () => {
    const claim = { id: 'claim-1', kind: 'ASSERTION', status: 'SUPPORTED' };
    const relation = {
      id: 'relation-1',
      fromEntity: { id: 'entity-1' },
      toEntity: { id: 'entity-2' },
      claims: [{ claim }],
    };
    prisma.researchProject.findUnique
      .mockResolvedValueOnce({
        id: 'project-1',
        entities: [{ id: 'entity-1' }],
        relations: [relation],
        claims: [claim],
        evidence: [],
      })
      .mockResolvedValueOnce({
        id: 'project-1',
        entities: [],
        relations: [relation],
        claims: [claim],
        evidence: [],
      })
      .mockResolvedValueOnce({
        id: 'project-1',
        entities: [],
        relations: [],
        claims: [],
        evidence: [],
      });

    const entity = await service.getKnowledge('project-1', {
      scope: 'focus',
      focusType: 'entity',
      focusId: 'entity-1',
    });
    const relationFocus = await service.getKnowledge('project-1', {
      scope: 'focus',
      focusType: 'relation',
      focusId: 'relation-1',
    });
    expect(entity).toMatchObject({
      focus: { type: 'entity', id: 'entity-1' },
      entities: [{ id: 'entity-1' }, { id: 'entity-2' }],
      relations: [{ id: 'relation-1' }],
    });
    expect(relationFocus).toMatchObject({
      focus: { type: 'relation', id: 'relation-1' },
      relations: [{ id: 'relation-1' }],
    });
    await expect(
      service.getKnowledge('project-1', {
        scope: 'focus',
        focusType: 'relation',
        focusId: 'relation-other-project',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
  it('loads only requested traceability and preserves Evidence without an excerpt', async () => {
    const source = { id: 'source-1', type: 'BOOK', title: 'Catálogo' };
    const excerpt = {
      id: 'excerpt-1',
      locator: 'p. 4',
      text: 'Pasaje',
      materialVersion: {
        id: 'version-1',
        version: 1,
        material: { id: 'material-1', title: 'PDF', source },
      },
    };
    const available = { id: 'evidence-1', source, libraryExcerpt: excerpt };
    const unavailable = {
      id: 'evidence-2',
      source,
      libraryExcerpt: null,
      sourceVersion: 'ed. 2',
      locator: 'p. 8',
      quote: 'Cita',
    };
    const claim = (evidence: object) => ({
      id: 'claim-1',
      kind: 'ASSERTION',
      status: 'SUPPORTED',
      evidence: [{ evidence }],
    });
    prisma.researchProject.findUnique
      .mockResolvedValueOnce({
        id: 'project-1',
        entities: [],
        relations: [],
        claims: [claim(available)],
        evidence: [available],
      })
      .mockResolvedValueOnce({
        id: 'project-1',
        entities: [],
        relations: [],
        claims: [claim(unavailable)],
        evidence: [unavailable],
      });

    const complete = await service.getKnowledge('project-1', {
      scope: 'traceability',
      focusType: 'evidence',
      focusId: 'evidence-1',
    });
    const bibliographic = await service.getKnowledge('project-1', {
      scope: 'traceability',
      focusType: 'evidence',
      focusId: 'evidence-2',
    });
    expect(complete.supportingEvidence).toEqual([
      expect.objectContaining({ excerptStatus: 'AVAILABLE', libraryExcerpt: excerpt }),
    ]);
    expect(bibliographic.supportingEvidence).toEqual([
      expect.objectContaining({
        excerptStatus: 'UNAVAILABLE',
        libraryExcerpt: null,
        sourceVersion: 'ed. 2',
        locator: 'p. 8',
        quote: 'Cita',
      }),
    ]);
    expect(complete.expansions).toEqual({
      claims: 'LOADED',
      evidence: 'LOADED',
      traceability: 'LOADED',
    });
    const read = prisma.researchProject.findUnique.mock.calls[0][0];
    expect(read.select).not.toHaveProperty('outlineSections');
    expect(read.select.evidence.include.libraryExcerpt).toBeDefined();
  });
  it('keeps a complete Knowledge response when no progressive scope is requested', async () => {
    prisma.researchProject.findUnique.mockResolvedValue({
      id: 'project-1',
      entities: [],
      relations: [],
      claims: [],
    });

    const getProject = jest.spyOn(service, 'getProject');
    const knowledge = await service.getKnowledge('project-1');

    expect(knowledge).toMatchObject({
      scope: 'complete',
      focus: null,
      expansions: { claims: 'LOADED', evidence: 'LOADED', traceability: 'LOADED' },
    });
    expect(prisma.researchProject.findUnique.mock.calls[0][0].select).not.toHaveProperty('jobs');
    expect(getProject).not.toHaveBeenCalled();
  });
  it('searches existing canonical sources without creating research-owned sources', async () => {
    sources.search.mockResolvedValue([]);

    await service.searchSources({ q: '  Prado  ', limit: 5 });

    expect(sources.search).toHaveBeenCalledWith({ q: '  Prado  ', limit: 5 });
  });

  it('throws when a project does not exist', async () => {
    prisma.researchProject.findUnique.mockResolvedValue(null);

    await expect(service.getProject('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('delegates TEXT and URL material creation to Library and associates the result', async () => {
    tx.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });
    prisma.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });
    library.createInitialMaterial
      .mockResolvedValueOnce({ id: 'material-text' })
      .mockResolvedValueOnce({ id: 'material-url' });
    await service.createMaterial('project-1', {
      kind: LibraryMaterialKind.TEXT,
      title: '  Notas del catálogo  ',
      content: '  Pasaje documental  ',
    });
    await service.createMaterial('project-1', {
      kind: LibraryMaterialKind.URL,
      title: '  Archivo del Prado  ',
      url: 'https://www.museodelprado.es/',
    });

    expect(library.createInitialMaterial).toHaveBeenNthCalledWith(1, tx, {
      kind: LibraryMaterialKind.TEXT,
      title: '  Notas del catálogo  ',
      content: '  Pasaje documental  ',
    });
    expect(library.createInitialMaterial).toHaveBeenNthCalledWith(2, tx, {
      kind: LibraryMaterialKind.URL,
      title: '  Archivo del Prado  ',
      url: 'https://www.museodelprado.es/',
    });
    expect(tx.researchLibraryMaterial.upsert).toHaveBeenCalledTimes(2);
  });

  it('does not create an association when the Library write fails', async () => {
    tx.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });
    library.createInitialMaterial.mockRejectedValue(new Error('storage unavailable'));

    await expect(
      service.createMaterial('project-1', {
        kind: LibraryMaterialKind.TEXT,
        title: 'Notas',
        content: 'Pasaje',
      }),
    ).rejects.toThrow('storage unavailable');
    expect(tx.researchLibraryMaterial.upsert).not.toHaveBeenCalled();
  });

  it('removes only the Research association to a Library material', async () => {
    prisma.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });
    prisma.researchLibraryMaterial.deleteMany.mockResolvedValue({ count: 1 });
    jest.spyOn(service, 'getProject').mockResolvedValue({ id: 'project-1' } as never);

    await service.removeLibraryMaterial('project-1', 'material-1');

    expect(prisma.researchLibraryMaterial.deleteMany).toHaveBeenCalledWith({
      where: { projectId: 'project-1', materialId: 'material-1' },
    });

    prisma.researchLibraryMaterial.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.removeLibraryMaterial('project-1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('delegates PDF creation to Library and preserves the legacy writer untouched', async () => {
    tx.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });
    prisma.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });
    library.createInitialPdf.mockResolvedValue({ id: 'material-pdf' });
    await service.createPdfMaterial(
      'project-1',
      {
        filename: 'private-id.pdf',
        originalname: 'Catálogo.pdf',
        mimetype: 'application/pdf',
        size: 2048,
      },
      {},
    );

    expect(library.createInitialPdf).toHaveBeenCalledWith(
      tx,
      {
        filename: 'private-id.pdf',
        originalname: 'Catálogo.pdf',
        mimetype: 'application/pdf',
        size: 2048,
      },
      undefined,
    );
    expect(tx.researchLibraryMaterial.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { projectId: 'project-1', materialId: 'material-pdf' },
      }),
    );
  });

  it('does not associate a PDF when its Library write fails', async () => {
    tx.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });
    library.createInitialPdf.mockRejectedValue(new Error('write failed'));

    await expect(
      service.createPdfMaterial(
        'project-1',
        {
          filename: 'private-id.pdf',
          originalname: 'Catálogo.pdf',
          mimetype: 'application/pdf',
          size: 1,
        },
        {},
      ),
    ).rejects.toThrow('write failed');

    expect(tx.researchLibraryMaterial.upsert).not.toHaveBeenCalled();
  });

  it('keeps incompatible evidence-backed Claims private without writing to the Core', async () => {
    prisma.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });
    prisma.researchEvidence.findMany.mockResolvedValue([
      { id: 'evidence-1' },
      { id: 'evidence-2' },
    ]);
    prisma.researchClaim.create.mockResolvedValue({ id: 'claim-1' });
    prisma.researchProject.update.mockResolvedValue({ id: 'project-1' });
    prisma.researchEvidence.findMany
      .mockResolvedValueOnce([{ id: 'evidence-1' }, { id: 'evidence-2' }])
      .mockResolvedValueOnce([{ id: 'evidence-1' }]);
    await service.createClaim('project-1', {
      kind: ResearchClaimKind.ASSERTION,
      title: 'La obra fue concebida en un contexto bélico',
      evidenceIds: ['evidence-1', 'evidence-2'],
    });
    await service.createClaim('project-1', {
      kind: ResearchClaimKind.CONTRADICTION,
      title: 'La datación sigue siendo discutida',
      evidenceIds: ['evidence-1'],
    });

    expect(prisma.researchClaim.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          kind: ResearchClaimKind.ASSERTION,
          status: ResearchClaimStatus.DRAFT,
          evidence: { create: [{ evidenceId: 'evidence-1' }, { evidenceId: 'evidence-2' }] },
        }),
      }),
    );
    expect(prisma.researchClaim.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({ kind: ResearchClaimKind.CONTRADICTION }),
      }),
    );
    expect(prisma.entity).not.toHaveProperty('create');
    expect(prisma.entity).not.toHaveProperty('update');
  });

  it('rejects Claim Evidence outside the Research', async () => {
    prisma.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });
    prisma.researchEvidence.findMany.mockResolvedValue([{ id: 'evidence-1' }]);

    await expect(
      service.createClaim('project-1', {
        kind: ResearchClaimKind.ASSERTION,
        title: 'Afirmación sin procedencia suficiente',
        evidenceIds: ['evidence-1', 'evidence-outside'],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.researchClaim.create).not.toHaveBeenCalled();
  });

  it('updates Claim editorial status only inside its Research', async () => {
    prisma.researchClaim.findFirst.mockResolvedValue({ id: 'claim-1' });
    prisma.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });

    await service.setClaimStatus('project-1', 'claim-1', {
      status: ResearchClaimStatus.QUESTIONED,
    });

    expect(prisma.researchClaim.update).toHaveBeenCalledWith({
      where: { id: 'claim-1' },
      data: { status: ResearchClaimStatus.QUESTIONED },
    });
  });

  it('creates an evidence-backed provisional connection between project claims', async () => {
    prisma.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });
    prisma.researchEvidence.findMany.mockResolvedValue([{ id: 'evidence-1' }]);
    prisma.researchClaim.count.mockResolvedValue(2);
    prisma.researchClaim.create.mockResolvedValue({ id: 'claim-3' });
    prisma.researchProject.update.mockResolvedValue({ id: 'project-1' });

    await service.createClaim('project-1', {
      kind: ResearchClaimKind.CONNECTION_HYPOTHESIS,
      title: '  Influyó en  ',
      summary: '  Hipótesis provisional  ',
      evidenceIds: ['evidence-1'],
      subjectClaimId: 'claim-1',
      objectClaimId: 'claim-2',
    });

    expect(prisma.researchClaim.count).toHaveBeenCalledWith({
      where: { projectId: 'project-1', id: { in: ['claim-1', 'claim-2'] } },
    });
    expect(prisma.researchClaim.create).toHaveBeenCalledWith({
      data: {
        projectId: 'project-1',
        kind: ResearchClaimKind.CONNECTION_HYPOTHESIS,
        title: 'Influyó en',
        summary: 'Hipótesis provisional',
        subjectClaimId: 'claim-1',
        objectClaimId: 'claim-2',
        status: ResearchClaimStatus.DRAFT,
        evidence: { create: [{ evidenceId: 'evidence-1' }] },
      },
    });
  });

  it('rejects provisional connections without two different project claims', async () => {
    prisma.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });
    prisma.researchEvidence.findMany.mockResolvedValue([{ id: 'evidence-1' }]);

    await expect(
      service.createClaim('project-1', {
        kind: ResearchClaimKind.CONNECTION_HYPOTHESIS,
        title: 'Relación inválida',
        evidenceIds: ['evidence-1'],
        subjectClaimId: 'claim-1',
        objectClaimId: 'claim-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.researchClaim.create).not.toHaveBeenCalled();
  });

  it('associates an existing canonical source idempotently', async () => {
    prisma.researchProject.findUnique
      .mockResolvedValueOnce({ id: 'project-1' })
      .mockResolvedValueOnce({ id: 'project-1' });
    prisma.source.findUnique.mockResolvedValue({ id: 'source-1' });
    prisma.researchProjectSource.upsert.mockResolvedValue({ projectId: 'project-1' });
    prisma.researchProject.update.mockResolvedValue({ id: 'project-1' });

    await service.addProjectSource('project-1', {
      sourceId: 'source-1',
      note: '  Corpus inicial  ',
    });

    expect(prisma.researchProjectSource.upsert).toHaveBeenCalledWith({
      where: { projectId_sourceId: { projectId: 'project-1', sourceId: 'source-1' } },
      create: { projectId: 'project-1', sourceId: 'source-1', note: 'Corpus inicial' },
      update: { note: 'Corpus inicial' },
    });
    expect(prisma.researchProject.update).toHaveBeenCalledWith({
      where: { id: 'project-1' },
      data: { lastActiveAt: expect.any(Date) },
    });
  });

  it('rejects source association when project or source is missing', async () => {
    prisma.researchProject.findUnique.mockResolvedValueOnce(null);
    prisma.source.findUnique.mockResolvedValueOnce({ id: 'source-1' });

    await expect(
      service.addProjectSource('missing', { sourceId: 'source-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.researchProject.findUnique.mockResolvedValueOnce({ id: 'project-1' });
    prisma.source.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.addProjectSource('project-1', { sourceId: 'missing' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('associates an existing Library material transactionally and idempotently', async () => {
    tx.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });
    tx.libraryMaterial.findUnique.mockResolvedValue({ id: 'material-1' });
    tx.researchLibraryMaterial.upsert.mockResolvedValue({
      projectId: 'project-1',
      materialId: 'material-1',
    });

    await service.associateLibraryMaterial('project-1', { materialId: 'material-1' });
    await service.associateLibraryMaterial('project-1', { materialId: 'material-1' });

    const expected = {
      where: { projectId_materialId: { projectId: 'project-1', materialId: 'material-1' } },
      create: { projectId: 'project-1', materialId: 'material-1' },
      update: {},
    };
    expect(tx.researchLibraryMaterial.upsert).toHaveBeenCalledTimes(2);
    expect(tx.researchLibraryMaterial.upsert).toHaveBeenNthCalledWith(1, expected);
    expect(tx.researchLibraryMaterial.upsert).toHaveBeenNthCalledWith(2, expected);
    expect(tx.libraryMaterial.create).not.toHaveBeenCalled();
    expect(tx.libraryMaterial.update).not.toHaveBeenCalled();
  });

  it('rejects a Library association when either foreign key is missing', async () => {
    tx.researchProject.findUnique.mockResolvedValue(null);
    tx.libraryMaterial.findUnique.mockResolvedValue({ id: 'material-1' });

    await expect(
      service.associateLibraryMaterial('missing', { materialId: 'material-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    tx.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });
    tx.libraryMaterial.findUnique.mockResolvedValue(null);

    await expect(
      service.associateLibraryMaterial('project-1', { materialId: 'missing' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.researchLibraryMaterial.upsert).not.toHaveBeenCalled();
  });

  it('creates a queued source preparation job idempotently', async () => {
    prisma.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });
    prisma.researchProjectSource.findUnique.mockResolvedValue({ sourceId: 'source-1' });
    prisma.researchJob.upsert.mockResolvedValue({ id: 'job-1' });
    prisma.researchProject.update.mockResolvedValue({ id: 'project-1' });

    await service.prepareSourceJob('project-1', 'source-1');
    await service.prepareSourceJob('project-1', 'source-1');

    expect(prisma.researchJob.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.researchJob.upsert).toHaveBeenNthCalledWith(1, {
      where: {
        projectId_type_inputFingerprint: {
          projectId: 'project-1',
          type: ResearchJobType.PREPARE_SOURCE,
          inputFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
        },
      },
      create: {
        projectId: 'project-1',
        sourceId: 'source-1',
        type: ResearchJobType.PREPARE_SOURCE,
        inputFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
      update: {},
    });
    expect(prisma.researchJob.upsert.mock.calls[1][0].where).toEqual(
      prisma.researchJob.upsert.mock.calls[0][0].where,
    );
  });

  it('creates a queued finding extraction job idempotently', async () => {
    prisma.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });
    prisma.researchJob.upsert.mockResolvedValue({ id: 'job-1' });
    prisma.researchProject.update.mockResolvedValue({ id: 'project-1' });
    prisma.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });

    await service.extractProposalsJob('project-1');
    await service.extractProposalsJob('project-1');

    expect(prisma.researchJob.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.researchJob.upsert).toHaveBeenNthCalledWith(1, {
      where: {
        projectId_type_inputFingerprint: {
          projectId: 'project-1',
          type: ResearchJobType.EXTRACT_FINDINGS,
          inputFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
        },
      },
      create: {
        projectId: 'project-1',
        sourceId: null,
        type: ResearchJobType.EXTRACT_FINDINGS,
        inputFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
      update: {},
    });
    expect(prisma.researchJob.upsert.mock.calls[1][0].where).toEqual(
      prisma.researchJob.upsert.mock.calls[0][0].where,
    );
  });

  it('rejects finding extraction for sources outside the project library', async () => {
    prisma.researchProject.findUnique.mockResolvedValueOnce({ id: 'project-1' });
    prisma.researchProjectSource.findUnique.mockResolvedValueOnce(null);

    await expect(service.extractProposalsJob('project-1', 'source-outside')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.researchJob.upsert).not.toHaveBeenCalled();
  });

  it('rejects source preparation when project or project source is missing', async () => {
    prisma.researchProject.findUnique.mockResolvedValueOnce(null);

    await expect(service.prepareSourceJob('missing', 'source-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.researchJob.upsert).not.toHaveBeenCalled();

    prisma.researchProject.findUnique.mockResolvedValueOnce({ id: 'project-1' });
    prisma.researchProjectSource.findUnique.mockResolvedValueOnce(null);

    await expect(service.prepareSourceJob('project-1', 'source-outside')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.researchJob.upsert).not.toHaveBeenCalled();
  });

  it('marks an automatic finding proposal as reviewed without creating a finding', async () => {
    prisma.researchFindingProposal.findFirst.mockResolvedValue({ id: 'proposal-1' });
    prisma.researchFindingProposal.update.mockResolvedValue({ id: 'proposal-1' });
    prisma.researchProject.update.mockResolvedValue({ id: 'project-1' });
    prisma.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });

    await service.reviewProposal('project-1', 'proposal-1', {
      reviewState: ResearchProposalReviewState.REVIEWED,
    });

    expect(prisma.researchFindingProposal.findFirst).toHaveBeenCalledWith({
      where: { id: 'proposal-1', projectId: 'project-1' },
      select: { id: true },
    });
    expect(prisma.researchFindingProposal.update).toHaveBeenCalledWith({
      where: { id: 'proposal-1' },
      data: { reviewState: ResearchProposalReviewState.REVIEWED },
    });
    expect(tx.researchClaim.create).not.toHaveBeenCalled();
  });

  it('rejects an automatic finding proposal without creating a finding', async () => {
    prisma.researchFindingProposal.findFirst.mockResolvedValue({ id: 'proposal-1' });
    prisma.researchFindingProposal.update.mockResolvedValue({ id: 'proposal-1' });
    prisma.researchProject.update.mockResolvedValue({ id: 'project-1' });
    prisma.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });

    await service.reviewProposal('project-1', 'proposal-1', {
      reviewState: ResearchProposalReviewState.REJECTED,
    });

    expect(prisma.researchFindingProposal.update).toHaveBeenCalledWith({
      where: { id: 'proposal-1' },
      data: { reviewState: ResearchProposalReviewState.REJECTED },
    });
    expect(tx.researchClaim.create).not.toHaveBeenCalled();
  });

  it('rejects proposal review when the proposal is missing or outside the project', async () => {
    prisma.researchFindingProposal.findFirst.mockResolvedValue(null);

    await expect(
      service.reviewProposal('project-1', 'proposal-outside', {
        reviewState: ResearchProposalReviewState.REJECTED,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.researchFindingProposal.update).not.toHaveBeenCalled();
  });

  it('rejects unsupported automatic proposal review states', async () => {
    await expect(
      service.reviewProposal('project-1', 'proposal-1', {
        reviewState: ResearchProposalReviewState.PENDING as never,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.researchFindingProposal.findFirst).not.toHaveBeenCalled();
  });

  it('converts a reviewed proposal into a supported private Claim', async () => {
    prisma.researchFindingProposal.findFirst.mockResolvedValue({
      id: 'proposal-1',
      title: 'Hallazgo revisado',
      summary: 'Resumen',
      kind: 'attribution',
      reviewState: ResearchProposalReviewState.REVIEWED,
      convertedClaimId: null,
      evidence: [{ evidenceId: 'evidence-1' }, { evidenceId: 'evidence-2' }],
    });
    tx.researchClaim.create.mockResolvedValue({ id: 'claim-1' });
    tx.researchProject.update.mockResolvedValue({ id: 'project-1' });
    prisma.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });

    await service.convertProposalToClaim('project-1', 'proposal-1');

    expect(prisma.researchFindingProposal.findFirst).toHaveBeenCalledWith({
      where: { id: 'proposal-1', projectId: 'project-1' },
      select: {
        id: true,
        title: true,
        summary: true,
        kind: true,
        reviewState: true,
        convertedClaimId: true,
        evidence: { select: { evidenceId: true } },
      },
    });
    expect(tx.researchClaim.create).toHaveBeenCalledWith({
      data: {
        projectId: 'project-1',
        title: 'Hallazgo revisado',
        summary: 'Resumen',
        kind: ResearchClaimKind.ASSERTION,
        status: ResearchClaimStatus.SUPPORTED,
        evidence: { create: [{ evidenceId: 'evidence-1' }, { evidenceId: 'evidence-2' }] },
      },
      select: { id: true },
    });
    expect(tx.researchFindingProposal.update).toHaveBeenCalledWith({
      where: { id: 'proposal-1' },
      data: { convertedClaimId: 'claim-1' },
    });
  });

  it('does not create another finding when a reviewed proposal was already converted', async () => {
    prisma.researchFindingProposal.findFirst.mockResolvedValue({
      id: 'proposal-1',
      title: 'Hallazgo revisado',
      summary: 'Resumen',
      kind: 'attribution',
      reviewState: ResearchProposalReviewState.REVIEWED,
      convertedClaimId: 'finding-existing',
      evidence: [{ evidenceId: 'evidence-1' }],
    });
    prisma.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });

    await service.convertProposalToClaim('project-1', 'proposal-1');
    await service.convertProposalToClaim('project-1', 'proposal-1');

    expect(tx.researchClaim.create).not.toHaveBeenCalled();
    expect(tx.researchClaim.create).not.toHaveBeenCalled();
    expect(tx.researchFindingProposal.update).not.toHaveBeenCalled();
  });

  it('rejects conversion for pending or rejected automatic finding proposals', async () => {
    prisma.researchFindingProposal.findFirst.mockResolvedValueOnce({
      id: 'proposal-1',
      reviewState: ResearchProposalReviewState.PENDING,
      convertedClaimId: null,
      evidence: [],
    });

    await expect(service.convertProposalToClaim('project-1', 'proposal-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    prisma.researchFindingProposal.findFirst.mockResolvedValueOnce({
      id: 'proposal-2',
      reviewState: ResearchProposalReviewState.REJECTED,
      convertedClaimId: null,
      evidence: [],
    });

    await expect(service.convertProposalToClaim('project-1', 'proposal-2')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(tx.researchClaim.create).not.toHaveBeenCalled();
  });

  it('rejects conversion when the proposal is missing or outside the project', async () => {
    prisma.researchFindingProposal.findFirst.mockResolvedValue(null);

    await expect(
      service.convertProposalToClaim('project-1', 'proposal-outside'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.researchClaim.create).not.toHaveBeenCalled();
  });

  it('creates evidence idempotently for a project source', async () => {
    prisma.researchProjectSource.findUnique.mockResolvedValue({ projectId: 'project-1' });
    prisma.researchEvidence.upsert.mockResolvedValue({ id: 'evidence-1' });
    prisma.researchProject.update.mockResolvedValue({ id: 'project-1' });
    prisma.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });

    await service.createEvidence('project-1', {
      sourceId: 'source-1',
      sourceVersion: '  1st edition  ',
      locator: '  p. 42  ',
      quote: '  Los desastres de la guerra  ',
      context: '  Capítulo II  ',
      note: '  Relevante para atribución  ',
    });

    expect(prisma.researchEvidence.upsert).toHaveBeenCalledWith({
      where: {
        projectId_sourceId_fingerprint: {
          projectId: 'project-1',
          sourceId: 'source-1',
          fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
        },
      },
      create: expect.objectContaining({
        projectId: 'project-1',
        sourceId: 'source-1',
        sourceVersion: '1st edition',
        locator: 'p. 42',
        quote: 'Los desastres de la guerra',
        context: 'Capítulo II',
        note: 'Relevante para atribución',
        fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
      update: {
        sourceVersion: '1st edition',
        locator: 'p. 42',
        quote: 'Los desastres de la guerra',
        context: 'Capítulo II',
        note: 'Relevante para atribución',
      },
    });
    expect(prisma.libraryExcerpt.findFirst).not.toHaveBeenCalled();
  });

  it('rejects evidence for sources outside the project library', async () => {
    prisma.researchProjectSource.findUnique.mockResolvedValue(null);

    await expect(
      service.createEvidence('project-1', {
        sourceId: 'source-1',
        sourceVersion: 'v1',
        locator: 'p. 1',
        quote: 'Fragmento',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.researchEvidence.upsert).not.toHaveBeenCalled();
  });

  it('anchors Evidence to an excerpt associated with the same Research', async () => {
    prisma.researchProjectSource.findUnique.mockResolvedValue({ projectId: 'project-1' });
    prisma.libraryExcerpt.findFirst.mockResolvedValue({ id: 'excerpt-1' });
    prisma.researchEvidence.upsert.mockResolvedValue({ id: 'evidence-1' });
    prisma.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });

    await service.createEvidence('project-1', {
      sourceId: 'source-1',
      sourceVersion: 'v1',
      locator: 'page=4',
      libraryExcerptId: 'excerpt-1',
    });

    expect(prisma.libraryExcerpt.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'excerpt-1' }),
      }),
    );
    expect(prisma.researchEvidence.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ libraryExcerptId: 'excerpt-1', quote: null }),
        update: expect.objectContaining({ libraryExcerptId: 'excerpt-1' }),
      }),
    );
  });

  it('rejects an excerpt that is not associated with the Research', async () => {
    prisma.researchProjectSource.findUnique.mockResolvedValue({ projectId: 'project-1' });
    prisma.libraryExcerpt.findFirst.mockResolvedValue(null);

    await expect(
      service.createEvidence('project-1', {
        sourceId: 'source-1',
        sourceVersion: 'v1',
        locator: 'page=4',
        libraryExcerptId: 'excerpt-outside',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.researchEvidence.upsert).not.toHaveBeenCalled();
  });

  it('creates a private ResearchEntity with project-owned Evidence and a read-only canonical reference', async () => {
    prisma.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });
    prisma.researchEvidence.count.mockResolvedValue(1);
    prisma.entity.findUnique.mockResolvedValue({ id: 'entity-core-1' });
    prisma.researchEntity.create.mockResolvedValue({ id: 'research-entity-1' });

    await service.createEntity('project-1', {
      kind: 'PERSON',
      title: '  Francisco de Goya  ',
      summary: '  Referente privado  ',
      evidenceIds: ['evidence-1'],
      canonicalEntityId: 'entity-core-1',
    });

    expect(prisma.researchEntity.create).toHaveBeenCalledWith({
      data: {
        projectId: 'project-1',
        kind: 'PERSON',
        title: 'Francisco de Goya',
        summary: 'Referente privado',
        canonicalEntityId: 'entity-core-1',
        evidence: { create: [{ evidenceId: 'evidence-1' }] },
      },
    });
    expect(prisma.entity.findUnique).toHaveBeenCalledWith({
      where: { id: 'entity-core-1' },
      select: { id: true },
    });
    expect(prisma.entity).not.toHaveProperty('create');
    expect(prisma.entity).not.toHaveProperty('update');
  });

  it('rejects Evidence outside the Research when creating a ResearchEntity', async () => {
    prisma.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });
    prisma.researchEvidence.count.mockResolvedValue(0);

    await expect(
      service.createEntity('project-1', {
        kind: 'PERSON',
        title: 'Francisco de Goya',
        evidenceIds: ['evidence-from-another-research'],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.researchEntity.create).not.toHaveBeenCalled();
  });

  it('creates a ResearchRelation between project entities using multiple project Claims', async () => {
    prisma.researchEntity.count.mockResolvedValue(2);
    prisma.researchClaim.count.mockResolvedValue(2);
    prisma.researchRelation.create.mockResolvedValue({ id: 'relation-1' });
    prisma.researchProject.update.mockResolvedValue({ id: 'project-1' });
    prisma.researchProject.findUnique.mockResolvedValue({ id: 'project-1' });

    await service.createRelation('project-1', {
      fromEntityId: 'entity-1',
      toEntityId: 'entity-2',
      claimIds: ['claim-1', 'claim-2'],
    });

    expect(prisma.researchRelation.create).toHaveBeenCalledWith({
      data: {
        projectId: 'project-1',
        fromEntityId: 'entity-1',
        toEntityId: 'entity-2',
        relationTypeId: null,
        explanation: null,
        claims: { create: [{ claimId: 'claim-1' }, { claimId: 'claim-2' }] },
      },
    });
    expect(prisma).not.toHaveProperty('researchRelationEvidence');
    expect(prisma).not.toHaveProperty('relation');
  });

  it('rejects external entities or Claims when creating a ResearchRelation', async () => {
    prisma.researchEntity.count.mockResolvedValue(1);
    prisma.researchClaim.count.mockResolvedValue(1);

    await expect(
      service.createRelation('project-1', {
        fromEntityId: 'entity-1',
        toEntityId: 'entity-outside',
        claimIds: ['claim-outside'],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.researchRelation.create).not.toHaveBeenCalled();
  });
});
