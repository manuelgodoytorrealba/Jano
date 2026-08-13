import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { firstValueFrom, of } from 'rxjs';
import { ResearchApi } from '../../core/api/research.api';
import { ResearchPublicationsComponent } from './research-publications.component';

describe('ResearchPublicationsComponent', () => {
  it('adapts published Research data for the shared explorer and filters it', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ResearchApi,
          useValue: {
            listPublished: () =>
              of([
                {
                  id: 'research-1',
                  title: 'Materia y memoria',
                  objective: 'Una lectura editorial.',
                  scope: null,
                  coverImageUrl: '/cover.jpg',
                  status: 'PUBLISHED',
                  lastActiveAt: '2026-08-10',
                  updatedAt: '2026-08-11',
                  publishedAt: '2026-08-12',
                },
              ]),
          },
        },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new ResearchPublicationsComponent());
    const [publication] = await firstValueFrom(component.publications$);

    expect(publication.resolvedMedia?.card?.url).toBe('/cover.jpg');
    component.filter('memoria');
    expect(component.filtered([publication])).toEqual([publication]);
  });
});
