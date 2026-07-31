import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ResearchApi } from '../../../core/api/research.api';
import { ResearchEvidenceCaptureComponent } from './research-evidence-capture.component';

const source = {
  projectId: 'research-1',
  sourceId: 'source-1',
  note: 'Catálogo razonado',
  createdAt: '2026-07-31T10:00:00.000Z',
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

async function createFixture(api: { createEvidence: ReturnType<typeof vi.fn> }) {
  await TestBed.configureTestingModule({
    imports: [ResearchEvidenceCaptureComponent],
    providers: [{ provide: ResearchApi, useValue: api }],
  }).compileComponents();
  const fixture = TestBed.createComponent(ResearchEvidenceCaptureComponent);
  fixture.componentRef.setInput('researchId', 'research-1');
  fixture.componentRef.setInput('sources', [source]);
  fixture.componentRef.setInput('evidence', []);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

describe('ResearchEvidenceCaptureComponent', () => {
  it('uses an associated Source to create manual Evidence and emits a refresh', async () => {
    const api = { createEvidence: vi.fn().mockReturnValue(of({ id: 'research-1' })) };
    const fixture = await createFixture(api);
    const saved = vi.fn();
    fixture.componentInstance.saved.subscribe(saved);
    fixture.componentInstance.selectSource('source-1');
    fixture.componentInstance.sourceVersion = '1.ª edición';
    fixture.componentInstance.locator = 'p. 42';
    fixture.componentInstance.quote = 'Una cita verificable';
    fixture.componentInstance.save();
    expect(api.createEvidence).toHaveBeenCalledWith('research-1', {
      sourceId: 'source-1',
      sourceVersion: '1.ª edición',
      locator: 'p. 42',
      quote: 'Una cita verificable',
      context: undefined,
      note: undefined,
    });
    expect(saved).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.locator).toBe('');
    expect(fixture.componentInstance.quote).toBe('');
  });

  it('does not submit an incomplete form', async () => {
    const api = { createEvidence: vi.fn().mockReturnValue(of({})) };
    const fixture = await createFixture(api);
    fixture.componentInstance.selectSource('source-1');
    fixture.componentInstance.save();
    expect(api.createEvidence).not.toHaveBeenCalled();
  });
});
