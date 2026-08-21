import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AppAppearanceService } from '../../core/app-appearance.service';
import { EntitiesApi } from '../../core/api/entities.api';
import { PublicHomeEntityTypeCard } from '../../core/api/entities.models';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { SeoService } from '../../core/seo/seo.service';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  it('renders active type cards even when the type has no published entity yet', async () => {
    const response = new Subject<PublicHomeEntityTypeCard[]>();
    const home = vi.fn(() => response);

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        { provide: EntitiesApi, useValue: { home } },
        { provide: AuthService, useValue: { currentUser: null } },
        { provide: SeoService, useValue: { setPageMeta: vi.fn() } },
        {
          provide: I18nService,
          useValue: { locale: signal('es'), t: (key: string) => key },
        },
        {
          provide: AppAppearanceService,
          useValue: { currentBackgroundImageUrl: () => '/background.jpg' },
        },
      ],
    })
      .overrideComponent(HomeComponent, { set: { template: '' } })
      .compileComponents();

    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    response.next([memeCard]);
    expect(component.loadState()).toBe('ready');
    expect(component.deckItems()[0]).toMatchObject({
      title: 'Meme',
      image: '',
      ctaRoute: '/entities/meme',
    });

    fixture.destroy();
  });
});

const memeCard: PublicHomeEntityTypeCard = {
  type: {
    id: 'type-meme',
    key: 'MEME',
    singularName: 'Meme',
    pluralName: 'Memes',
    description: 'Formato cultural reproducible.',
    icon: 'M',
    colorToken: 'violet',
    baseKind: 'ABSTRACTION',
    systemType: false,
  },
  entity: null,
};
