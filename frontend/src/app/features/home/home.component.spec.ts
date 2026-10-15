import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppAppearanceService } from '../../core/app-appearance.service';
import { EntitiesApi } from '../../core/api/entities.api';
import { PublicHomeEntityTypeCard } from '../../core/api/entities.models';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { SeoService } from '../../core/seo/seo.service';
import { HomeComponent } from './home.component';

const storageKey = 'jano.archive.types';

describe('Archive categories', () => {
  let response: Subject<PublicHomeEntityTypeCard[]>;
  beforeEach(async () => {
    window.localStorage.removeItem(storageKey);
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    );
    Object.defineProperty(HTMLElement.prototype, 'animate', {
      configurable: true,
      value: vi.fn(() => ({ finished: Promise.resolve() })),
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    });
    response = new Subject<PublicHomeEntityTypeCard[]>();
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        { provide: EntitiesApi, useValue: { home: () => response } },
        { provide: AuthService, useValue: { currentUser: null } },
        { provide: SeoService, useValue: { setPageMeta: vi.fn() } },
        { provide: I18nService, useValue: { locale: signal('es'), t: (key: string) => key } },
        {
          provide: AppAppearanceService,
          useValue: { currentBackgroundImageUrl: () => '/background.jpg' },
        },
      ],
    }).compileComponents();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.localStorage.removeItem(storageKey);
  });

  function create(cards = customCards) {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    response.next(cards);
    fixture.detectChanges();
    return fixture;
  }

  it('offers the edit action only to an administrator', () => {
    const auth = TestBed.inject(AuthService);
    Object.defineProperty(auth, 'currentUser', { configurable: true, value: { role: 'ADMIN' } });
    const fixture = create([memeCard]);
    expect(fixture.nativeElement.querySelectorAll('.archive-page__edit')).toHaveLength(1);
    fixture.componentInstance.editCard('MEME');
    expect(fixture.componentInstance.editing()?.type.key).toBe('MEME');
  });

  it('shows editorial text per language and a dedicated cover without changing the category route', () => {
    const fixture = create([
      {
        ...memeCard,
        type: {
          ...memeCard.type,
          archiveTitleEs: 'Imágenes y humor',
          archiveTitleEn: 'Images and humour',
          archiveDescriptionEs: 'Descripción editorial',
          archiveDescriptionEn: 'Editorial description',
          homeCoverMedia: { url: '/uploads/media/cover.png' },
        },
      },
    ]);
    expect(fixture.componentInstance.deckItems()[0]).toMatchObject({
      title: 'Imágenes y humor',
      image: '/uploads/media/cover.png',
      ctaRoute: '/entities/meme',
    });
    TestBed.inject(I18nService).locale.set('en');
    expect(fixture.componentInstance.deckItems()[0]).toMatchObject({
      title: 'Images and humour',
      description: 'Editorial description',
    });
    expect(fixture.nativeElement.querySelector('.archive-page__edit')).toBeNull();
    fixture.componentInstance.editCard('MEME');
    expect(fixture.componentInstance.editing()).toBeNull();
  });

  it('keeps types without a published image or entity accessible', () => {
    const fixture = create([memeCard]);
    expect(fixture.componentInstance.loadState()).toBe('ready');
    expect(fixture.componentInstance.deckItems()[0]).toMatchObject({
      title: 'Memes',
      image: '',
      ctaRoute: '/entities/meme',
    });
    response.next([{ ...memeCard, type: artistType, entity: artistWithoutMedia }]);
    expect(fixture.componentInstance.deckItems()[0].image).toBe('');
  });

  it('adds several types at the front without closing or scrolling, then reveals them on Done', async () => {
    const fixture = create();
    const element = fixture.nativeElement as HTMLElement;
    const component = fixture.componentInstance;
    const page = element.querySelector('.archive-page') as HTMLElement;
    expect(element.querySelectorAll('.archive-page__category')).toHaveLength(8);
    (element.querySelector('.archive-page__add-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.querySelectorAll('.archive-page__type')).toHaveLength(2);
    (element.querySelector('.archive-page__type') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.querySelectorAll('.archive-page__category')).toHaveLength(9);
    expect(element.querySelector('.archive-page__panel')).not.toBeNull();
    expect(element.querySelectorAll('.archive-page__type')).toHaveLength(1);
    expect(element.querySelector('.archive-page__open')?.getAttribute('href')).toBe(
      '/entities/custom_8',
    );
    expect(element.querySelector('.archive-page__confirmation')?.textContent).toContain('Custom 8');
    expect(page.scrollTo).not.toHaveBeenCalled();
    (element.querySelector('.archive-page__type') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(
      component
        .featuredItems()
        .slice(0, 2)
        .map((item) => item.key),
    ).toEqual(['CUSTOM_9', 'CUSTOM_8']);
    expect(element.querySelector('.archive-page__panel')).not.toBeNull();
    expect(element.querySelector('.archive-page__types')?.textContent).toContain(
      'archive.allAdded',
    );
    (element.querySelector('.archive-page__done') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.querySelector('.archive-page__panel')).toBeNull();
    expect(element.querySelectorAll('.archive-page__category--added')).toHaveLength(2);
    expect(page.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    expect(document.activeElement).toBe(element.querySelector('.archive-page__add-toggle'));
    expect(JSON.parse(window.localStorage.getItem(storageKey)!)).toEqual(
      component.featuredItems().map((item) => item.key),
    );
    await component.removeType('CUSTOM_9');
    fixture.detectChanges();
    expect(component.otherItems().some((item) => item.key === 'CUSTOM_9')).toBe(true);
    component.addType('CUSTOM_9');
    component.addType('CUSTOM_9');
    component.addType('unknown');
    expect(component.featuredItems()).toHaveLength(10);
  });

  it('removes a card in place, prevents double removal and focuses a neighbor without scrolling', async () => {
    const fixture = create();
    const c = fixture.componentInstance;
    const page = fixture.nativeElement.querySelector('.archive-page') as HTMLElement;
    const button = page.querySelectorAll<HTMLButtonElement>('.archive-page__remove')[6];
    button.focus();
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    let finish!: () => void;
    vi.mocked(HTMLElement.prototype.animate).mockReturnValueOnce({
      finished: new Promise<void>((resolve) => {
        finish = resolve;
      }),
    } as unknown as Animation);
    button.click();
    expect(c.featuredItems()).toHaveLength(8);
    await c.removeType('CUSTOM_6');
    expect(c.featuredItems()).toHaveLength(8);
    finish();
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();
    expect(c.featuredItems()).toHaveLength(7);
    expect(c.otherItems().some((item) => item.key === 'CUSTOM_6')).toBe(true);
    expect(page.scrollTo).not.toHaveBeenCalled();
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(document.activeElement).toBe(page.querySelectorAll('.archive-page__remove')[6]);
  });

  it('removes immediately with reduced motion and supports removing the last card', async () => {
    window.localStorage.setItem(storageKey, JSON.stringify(['CUSTOM_0']));
    const fixture = create();
    vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList);
    await fixture.componentInstance.removeType('CUSTOM_0');
    fixture.detectChanges();
    expect(fixture.componentInstance.featuredItems()).toEqual([]);
    expect(HTMLElement.prototype.animate).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.archive-page__state')).not.toBeNull();
  });

  it('clears feedback for a new selection session and respects reduced motion on close', () => {
    const fixture = create();
    const c = fixture.componentInstance;
    c.toggleTypes();
    c.addType('CUSTOM_8');
    vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList);
    c.closeTypes();
    expect(
      (fixture.nativeElement.querySelector('.archive-page') as HTMLElement).scrollTo,
    ).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
    c.toggleTypes();
    fixture.detectChanges();
    expect(c.recentKeys()).toEqual([]);
    expect(c.additionMessage()).toBe('');
    const page = fixture.nativeElement.querySelector('.archive-page') as HTMLElement;
    vi.mocked(page.scrollTo).mockClear();
    (fixture.nativeElement.querySelector('.archive-page__done') as HTMLButtonElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    fixture.detectChanges();
    expect(c.showAllTypes()).toBe(false);
    expect(page.scrollTo).not.toHaveBeenCalled();
  });

  it('restores the selection and order after returning, ignoring inactive types', async () => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify(['CUSTOM_8', 'inactive', 'CUSTOM_0', 'CUSTOM_8']),
    );
    const fixture = create();
    expect(fixture.componentInstance.featuredItems().map((item) => item.key)).toEqual([
      'CUSTOM_8',
      'CUSTOM_0',
    ]);
    await fixture.componentInstance.removeType('CUSTOM_0');
    fixture.destroy();
    const returned = create();
    expect(returned.componentInstance.featuredItems().map((item) => item.key)).toEqual([
      'CUSTOM_8',
    ]);
  });

  it('keeps an intentionally empty archive empty and allows recovery', () => {
    window.localStorage.setItem(storageKey, '[]');
    const fixture = create();
    expect(fixture.componentInstance.featuredItems()).toEqual([]);
    expect(fixture.componentInstance.otherItems()).toHaveLength(10);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('archive.chooseTypes');
    fixture.componentInstance.addType('CUSTOM_3');
    expect(fixture.componentInstance.featuredItems().map((item) => item.key)).toEqual(['CUSTOM_3']);
  });

  it.each(['broken-json', '{}', '["CUSTOM_0",4]'])(
    'falls back to eight for invalid saved data: %s',
    (value) => {
      window.localStorage.setItem(storageKey, value);
      expect(create().componentInstance.featuredItems()).toHaveLength(8);
    },
  );

  it('still supports changes when browser storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const component = create().componentInstance;
    await component.removeType('CUSTOM_0');
    expect(component.featuredItems()).toHaveLength(7);
    component.addType('CUSTOM_9');
    expect(component.featuredItems()).toHaveLength(8);
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

const artistType = {
  ...memeCard.type,
  key: 'ARTIST',
  singularName: 'Artist',
  pluralName: 'Artists',
  systemType: true,
} satisfies PublicHomeEntityTypeCard['type'];

const artistWithoutMedia = {
  id: 'artist-1',
  type: 'ARTIST',
  title: 'Artist without media',
  slug: 'artist-without-media',
  resolvedMedia: null,
} satisfies NonNullable<PublicHomeEntityTypeCard['entity']>;

const customCards = Array.from({ length: 10 }, (_, index) => ({
  ...memeCard,
  type: { ...memeCard.type, key: `CUSTOM_${index}`, pluralName: `Custom ${index}` },
}));
