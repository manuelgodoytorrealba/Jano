import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ResearchApi } from '../../../core/api/research.api';
import { ResearchExcerptCaptureComponent } from './research-excerpt-capture.component';

function createApi() {
  return {
    createLibraryExcerpt: vi.fn().mockReturnValue(
      of({
        id: 'excerpt-1',
        locator: 'párrafo 3',
        text: 'Pasaje verificable.',
      }),
    ),
    createEvidence: vi.fn(),
  };
}

async function createFixture(api = createApi()) {
  await TestBed.configureTestingModule({
    imports: [ResearchExcerptCaptureComponent],
    providers: [{ provide: ResearchApi, useValue: api }],
  }).compileComponents();
  const fixture = TestBed.createComponent(ResearchExcerptCaptureComponent);
  fixture.componentRef.setInput('researchId', 'research-1');
  fixture.componentRef.setInput('materialVersionId', 'version-1');
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, api };
}

describe('ResearchExcerptCaptureComponent', () => {
  it('creates a LibraryExcerpt with the selected material version', async () => {
    const { fixture, api } = await createFixture();
    const created = vi.fn();
    fixture.componentInstance.created.subscribe(created);
    fixture.componentInstance.locator = 'párrafo 3';
    fixture.componentInstance.text = 'Pasaje verificable.';
    fixture.componentInstance.save();

    expect(api.createLibraryExcerpt).toHaveBeenCalledWith('research-1', {
      materialVersionId: 'version-1',
      locator: 'párrafo 3',
      text: 'Pasaje verificable.',
    });
    expect(api.createEvidence).not.toHaveBeenCalled();
    expect(created).toHaveBeenCalledWith({
      id: 'excerpt-1',
      locator: 'párrafo 3',
      text: 'Pasaje verificable.',
    });
    expect(fixture.componentInstance.saved).toBe(true);
  });

  it('does not submit empty locators or text', async () => {
    const { fixture, api } = await createFixture();
    fixture.componentInstance.save();

    expect(api.createLibraryExcerpt).not.toHaveBeenCalled();
    expect(api.createEvidence).not.toHaveBeenCalled();
  });
});
