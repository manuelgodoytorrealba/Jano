import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ResearchApi } from './research.api';

describe('ResearchApi', () => {
  it('creates a source preparation job through the research endpoint', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ResearchApi],
    });

    const api = TestBed.inject(ResearchApi);
    const http = TestBed.inject(HttpTestingController);

    api.prepareSource('project-1', 'source-1').subscribe((project) => {
      expect(project.id).toBe('project-1');
    });

    const req = http.expectOne('/api/research/project-1/sources/source-1/jobs/prepare');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ id: 'project-1' });

    api.runNextJob().subscribe((result) => {
      expect(result).toEqual({ processed: false });
    });

    const runReq = http.expectOne('/api/research/jobs/run-next');
    expect(runReq.request.method).toBe('POST');
    expect(runReq.request.body).toEqual({});
    runReq.flush({ processed: false });
    http.verify();
  });

  it('sends Claim support through the backend evidenceIds contract', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ResearchApi],
    });

    const api = TestBed.inject(ResearchApi);
    const http = TestBed.inject(HttpTestingController);
    api
      .createClaim('project-1', {
        kind: 'ASSERTION',
        title: 'Una afirmación privada',
        evidenceIds: ['evidence-1'],
      })
      .subscribe();

    const req = http.expectOne('/api/research/project-1/claims');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      kind: 'ASSERTION',
      title: 'Una afirmación privada',
      evidenceIds: ['evidence-1'],
    });
    req.flush({ id: 'project-1', claims: [{ id: 'claim-1', status: 'DRAFT' }] });
    http.verify();
  });

  it('uses the project-scoped proposal read and review routes', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ResearchApi],
    });

    const api = TestBed.inject(ResearchApi);
    const http = TestBed.inject(HttpTestingController);
    api.listProposals('project-1', { reviewState: 'PENDING', limit: 24 }).subscribe();
    const list = http.expectOne(
      '/api/research/project-1/research-proposals?reviewState=PENDING&limit=24',
    );
    expect(list.request.method).toBe('GET');
    list.flush({ items: [], page: 1, limit: 24, total: 0, totalPages: 0 });

    api.reviewProposal('project-1', 'proposal-1', { reviewState: 'REVIEWED' }).subscribe();
    const review = http.expectOne('/api/research/project-1/research-proposals/proposal-1/review');
    expect(review.request.method).toBe('POST');
    expect(review.request.body).toEqual({ reviewState: 'REVIEWED' });
    review.flush({ id: 'project-1' });

    api.updateProposal('project-1', 'proposal-1', { title: 'Nombre revisado' }).subscribe();
    const update = http.expectOne('/api/research/project-1/research-proposals/proposal-1');
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual({ title: 'Nombre revisado' });
    update.flush({ items: [], page: 1, limit: 100, total: 0, totalPages: 0 });

    api.acceptProposal('project-1', 'proposal-1').subscribe();
    const accept = http.expectOne('/api/research/project-1/research-proposals/proposal-1/accept');
    expect(accept.request.method).toBe('POST');
    accept.flush({ id: 'project-1' });

    api.mergeEntityProposal('project-1', 'proposal-1', 'entity-1').subscribe();
    const merge = http.expectOne('/api/research/project-1/research-proposals/proposal-1/merge');
    expect(merge.request.method).toBe('POST');
    expect(merge.request.body).toEqual({ entityId: 'entity-1' });
    merge.flush({ id: 'project-1' });

    api.generateKnowledgeMap('project-1').subscribe();
    const generate = http.expectOne('/api/research/project-1/jobs/extract-proposals');
    expect(generate.request.method).toBe('POST');
    generate.flush({ id: 'project-1' });

    api.getKnowledgeMapGeneration('project-1').subscribe();
    const generation = http.expectOne('/api/research/project-1/knowledge-map-generation');
    expect(generation.request.method).toBe('GET');
    generation.flush({ job: null, stale: false, canGenerate: true, preparedMaterials: 1 });
    http.verify();
  });
});
