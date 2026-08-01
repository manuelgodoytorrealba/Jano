import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ResearchApi, ResearchEvidence } from '../../../core/api/research.api';
import { ResearchClaimCaptureComponent } from './research-claim-capture.component';

const evidence: ResearchEvidence = {
  id: 'evidence-1',
  projectId: 'research-1',
  sourceId: 'source-1',
  sourceVersion: '1.ª edición',
  locator: 'p. 42',
  libraryExcerptId: 'excerpt-1',
  quote: null,
  context: null,
  note: null,
  fingerprint: 'fingerprint-1',
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
  source: {
    id: 'source-1',
    type: 'BOOK',
    title: 'Goya',
    author: null,
    publisher: null,
    year: null,
    url: null,
  },
};

function createApi() {
  return {
    createClaim: vi.fn().mockReturnValue(of({ claims: [{ id: 'claim-1', status: 'DRAFT' }] })),
  };
}

async function createFixture(api = createApi()) {
  await TestBed.configureTestingModule({
    imports: [ResearchClaimCaptureComponent],
    providers: [{ provide: ResearchApi, useValue: api }],
  }).compileComponents();
  const fixture = TestBed.createComponent(ResearchClaimCaptureComponent);
  fixture.componentRef.setInput('researchId', 'research-1');
  fixture.componentRef.setInput('evidence', [evidence]);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, api };
}

describe('ResearchClaimCaptureComponent', () => {
  it('creates a DRAFT assertion with evidenceIds and clears the form', async () => {
    const { fixture, api } = await createFixture();
    const saved = vi.fn();
    fixture.componentInstance.saved.subscribe(saved);
    fixture.componentInstance.title = '  La pincelada altera la percepción del cuerpo.  ';
    fixture.componentInstance.summary = '  Lectura inicial.  ';
    fixture.componentInstance.toggleEvidence('evidence-1', true);
    fixture.componentInstance.save();

    expect(api.createClaim).toHaveBeenCalledWith('research-1', {
      kind: 'ASSERTION',
      title: 'La pincelada altera la percepción del cuerpo.',
      summary: 'Lectura inicial.',
      evidenceIds: ['evidence-1'],
    });
    expect(saved).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.title).toBe('');
    expect(fixture.componentInstance.summary).toBe('');
    expect(fixture.componentInstance.selectedEvidenceIds).toEqual([]);
  });

  it('does not submit without a title or supporting Evidence', async () => {
    const { fixture, api } = await createFixture();
    fixture.componentInstance.title = 'Una afirmación sin soporte';
    fixture.componentInstance.save();
    fixture.componentInstance.title = '';
    fixture.componentInstance.toggleEvidence('evidence-1', true);
    fixture.componentInstance.save();

    expect(api.createClaim).not.toHaveBeenCalled();
  });
});
