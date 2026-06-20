import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, forkJoin, map, of, switchMap } from 'rxjs';
import {
  AdminHomeDeck,
  AdminHomeDeckPayload,
  AdminHomeDecksApi,
} from '../../../core/api/admin-home-decks.api';
import {
  HOME_DECK_CTA_ROUTE_OPTIONS,
  HomeDeckSurfaceValue,
  homeDeckSurfaceDescription,
  homeDeckSurfaceLabel,
} from '../home-decks-editorial-options';
import { HOME_DECK_STARTERS, HomeDeckStarter } from '../home-deck-starters';
import { mediaDisplayUrl, resolveEntityMediaItem } from '../../../shared/media/media.utils';

@Component({
  standalone: true,
  selector: 'app-admin-home-decks',
  imports: [AsyncPipe, DatePipe, FormsModule, RouterLink],
  templateUrl: './admin-home-decks.component.html',
  styleUrl: './admin-home-decks.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminHomeDecksComponent {
  private readonly api = inject(AdminHomeDecksApi);
  private readonly refresh$ = new BehaviorSubject<void>(undefined);
  private readonly removedDeckIds$ = new BehaviorSubject<Set<string>>(new Set());

  loading = false;
  saving = false;
  feedback = '';

  readonly ctaRouteOptions = HOME_DECK_CTA_ROUTE_OPTIONS;
  readonly starterDecks = HOME_DECK_STARTERS;
  readonly surfaces: HomeDeckSurfaceValue[] = ['HOME', 'RECOMMENDED'];

  newDeck: AdminHomeDeckPayload = {
    surface: 'HOME',
    slug: '',
    title: '',
    subtitle: '',
    description: '',
    ctaLabel: '',
    ctaRoute: '',
    imageUrl: '',
    sortOrder: 0,
    isActive: false,
  };

  readonly vm$ = combineLatest([this.refresh$, this.removedDeckIds$]).pipe(
    switchMap(([_, removedDeckIds]) => {
      this.loading = true;
      return this.api.list().pipe(
        map((decks) => {
          this.loading = false;
          const visibleDecks = decks.filter((deck) => !removedDeckIds.has(deck.id));
          const homeActiveDecks = visibleDecks.filter((deck) => deck.surface === 'HOME' && deck.isActive);
          const recommendedActiveDecks = visibleDecks.filter(
            (deck) => deck.surface === 'RECOMMENDED' && deck.isActive,
          );
          const starterStates = this.starterDecks.map((starter) => {
            const deck = visibleDecks.find((candidate) => this.matchesStarter(candidate, starter)) ?? null;
            return {
              starter,
              deck,
              imported: !!deck,
              active: deck?.isActive ?? false,
            };
          });

          return {
            decks: visibleDecks,
            activeCount: visibleDecks.filter((deck) => deck.isActive).length,
            homeCount: visibleDecks.filter((deck) => deck.surface === 'HOME').length,
            recommendedCount: visibleDecks.filter((deck) => deck.surface === 'RECOMMENDED').length,
            warningCount: visibleDecks.filter((deck) => this.hasWarnings(deck)).length,
            homeActiveDecks,
            recommendedActiveDecks,
            usesHomeFallback: homeActiveDecks.length === 0,
            usesRecommendedFallback: recommendedActiveDecks.length === 0,
            starterStates,
            missingStarterCount: starterStates.filter((state) => !state.imported).length,
          };
        }),
        catchError(() => {
          this.loading = false;
          return of({
            decks: [],
            activeCount: 0,
            homeCount: 0,
            recommendedCount: 0,
            warningCount: 0,
            homeActiveDecks: [],
            recommendedActiveDecks: [],
            usesHomeFallback: true,
            usesRecommendedFallback: true,
            starterStates: [],
            missingStarterCount: 0,
          });
        }),
      );
    }),
  );

  createDeck(): void {
    const payload = this.cleanPayload(this.newDeck);
    if (!payload.slug || !payload.title) {
      this.feedback = 'Slug y título son obligatorios.';
      return;
    }

    this.saving = true;
    this.feedback = '';

    this.api.create(payload).subscribe({
      next: () => {
        this.saving = false;
        this.feedback = 'Deck creado.';
        this.resetNewDeck();
        this.refresh();
      },
      error: () => {
        this.saving = false;
        this.feedback = 'No se pudo crear el deck.';
      },
    });
  }

  importStarter(starter: HomeDeckStarter, activeDeckCountForSurface: number): void {
    this.saving = true;
    this.feedback = '';

    const payload = this.cleanPayload({
      surface: starter.surface,
      slug: starter.slug,
      title: starter.title,
      subtitle: starter.subtitle,
      description: starter.description,
      ctaLabel: starter.ctaLabel,
      ctaRoute: starter.ctaRoute,
      imageUrl: starter.image,
      sortOrder: 0,
      isActive: activeDeckCountForSurface === 0,
      translations: this.starterTranslations(starter),
    });

    this.api.create(payload).subscribe({
      next: () => {
        this.saving = false;
        this.feedback =
          activeDeckCountForSurface === 0
            ? `Deck base "${starter.title}" importado y activado en ${this.surfaceLabel(starter.surface)}.`
            : `Deck base "${starter.title}" importado.`;
        this.refresh();
      },
      error: () => {
        this.saving = false;
        this.feedback = `No se pudo importar "${starter.title}".`;
      },
    });
  }

  materializeStarter(starter: HomeDeckStarter): void {
    this.saving = true;
    this.feedback = '';

    this.api.materializeVirtualDeck(starter.slug).subscribe({
      next: (deck) => {
        this.saving = false;
        this.feedback = `Deck base "${deck.title}" materializado con sus entidades iniciales.`;
        this.refresh();
      },
      error: () => {
        this.saving = false;
        this.feedback = `No se pudo materializar "${starter.title}".`;
      },
    });
  }

  importMissingStarters(
    surface: HomeDeckSurfaceValue,
    starterStates: Array<{ starter: HomeDeckStarter; imported: boolean }>,
    activeDeckCountForSurface: number,
  ): void {
    const missing = starterStates.filter((state) => state.starter.surface === surface && !state.imported);
    if (!missing.length) {
      this.feedback = 'No hay decks base pendientes para importar.';
      return;
    }

    this.saving = true;
    this.feedback = '';

    forkJoin(
      missing.map((state, index) =>
        this.api.create(
          this.cleanPayload({
            surface: state.starter.surface,
            slug: state.starter.slug,
            title: state.starter.title,
            subtitle: state.starter.subtitle,
            description: state.starter.description,
            ctaLabel: state.starter.ctaLabel,
            ctaRoute: state.starter.ctaRoute,
            imageUrl: state.starter.image,
            sortOrder: index,
            isActive: activeDeckCountForSurface === 0,
            translations: this.starterTranslations(state.starter),
          }),
        ),
      ),
    ).subscribe({
      next: () => {
        this.saving = false;
        this.feedback =
          activeDeckCountForSurface === 0
            ? `Decks base de ${this.surfaceLabel(surface)} importados y activados.`
            : `Decks base de ${this.surfaceLabel(surface)} importados.`;
        this.refresh();
      },
      error: () => {
        this.saving = false;
        this.feedback = `No se pudieron importar los decks base de ${this.surfaceLabel(surface)}.`;
      },
    });
  }

  toggleActive(deck: AdminHomeDeck): void {
    this.updateDeck(deck.id, { isActive: !deck.isActive }, deck.isActive ? 'Deck desactivado.' : 'Deck activado.');
  }

  move(deck: AdminHomeDeck, direction: -1 | 1, decks: AdminHomeDeck[]): void {
    const ordered = decks
      .filter((item) => item.surface === deck.surface)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
    const index = ordered.findIndex((item) => item.id === deck.id);
    const target = ordered[index + direction];

    if (!target) {
      return;
    }

    this.saving = true;
    this.feedback = '';

    forkJoin([
      this.api.update(deck.id, { sortOrder: target.sortOrder }),
      this.api.update(target.id, { sortOrder: deck.sortOrder }),
    ]).subscribe({
      next: () => {
        this.saving = false;
        this.feedback = 'Orden actualizado.';
        this.refresh();
      },
      error: () => {
        this.saving = false;
        this.feedback = 'No se pudo actualizar el orden.';
      },
    });
  }

  remove(deck: AdminHomeDeck): void {
    const ok = window.confirm(`¿Borrar "${deck.title}"?`);
    if (!ok) return;

    this.saving = true;
    this.feedback = '';
    this.markDeckRemoved(deck.id);

    this.api.remove(deck.id).subscribe({
      next: () => {
        this.saving = false;
        this.feedback = 'Deck eliminado.';
        this.refresh();
      },
      error: () => {
        this.saving = false;
        this.restoreDeckRemoved(deck.id);
        this.feedback = 'No se pudo eliminar el deck.';
      },
    });
  }

  hasWarnings(deck: AdminHomeDeck): boolean {
    return deck.warnings?.some((warning) => warning.severity === 'warning') ?? false;
  }

  warningLabel(deck: AdminHomeDeck): string {
    const count = deck.warnings?.length ?? 0;
    return count === 1 ? '1 aviso' : `${count} avisos`;
  }

  onNewDeckSurfaceChange(surface: HomeDeckSurfaceValue): void {
    this.newDeck.surface = surface;

    if (surface === 'RECOMMENDED') {
      this.newDeck.ctaRoute = '';
    }
  }

  startFromStarter(starter: HomeDeckStarter): void {
    this.newDeck = {
      surface: starter.surface,
      slug: starter.slug,
      title: starter.title,
      subtitle: starter.subtitle,
      description: starter.description,
      ctaLabel: starter.ctaLabel,
      ctaRoute: starter.surface === 'RECOMMENDED' ? '' : starter.ctaRoute,
      imageUrl: starter.image,
      sortOrder: 0,
      isActive: false,
      translations: this.starterTranslations(starter),
    };
  }

  showNewDeckCtaRouteControl(): boolean {
    return this.newDeck.surface !== 'RECOMMENDED';
  }

  newDeckActiveLabel(): string {
    return `Activo en ${homeDeckSurfaceLabel(this.newDeck.surface)}`;
  }

  surfaceLabel(surface: AdminHomeDeck['surface']): string {
    return homeDeckSurfaceLabel(surface);
  }

  surfaceDescription(surface: AdminHomeDeckPayload['surface']): string {
    return homeDeckSurfaceDescription(surface);
  }

  deckActionLabel(deck: AdminHomeDeck): string {
    if (deck.surface === 'RECOMMENDED') {
      return 'Selección curada';
    }

    return deck.ctaRoute ? deck.ctaRoute : 'Selección curada';
  }

  activeDeckSummary(decks: AdminHomeDeck[]): string {
    if (!decks.length) {
      return 'Fallback editorial activo';
    }

    return decks.map((deck) => deck.title).join(' · ');
  }

  starterDeckPreviewEntities(deck: AdminHomeDeck | null): any[] {
    if (!deck) {
      return [];
    }

    return [...(deck.entities ?? [])]
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .slice(0, 3);
  }

  deckEntityImageUrl(entity: any): string | null {
    const media = resolveEntityMediaItem(entity, 'card') ?? resolveEntityMediaItem(entity, 'detail');
    return mediaDisplayUrl(media);
  }

  deckEntityLabel(entity: any): string {
    return entity?.title?.trim() || entity?.name?.trim() || entity?.slug || 'Entity';
  }

  starterDecksForSurface(surface: HomeDeckSurfaceValue | undefined): HomeDeckStarter[] {
    const safeSurface = surface ?? 'HOME';
    return this.starterDecks.filter((starter) => starter.surface === safeSurface);
  }

  canMaterializeStarter(starter: HomeDeckStarter): boolean {
    return starter.surface === 'HOME' && starter.slug === 'place';
  }

  selectedCtaRouteDetail(): string {
    if (this.newDeck.surface === 'RECOMMENDED') {
      return 'Curated abre la selección curada que armes dentro del deck.';
    }

    const option = this.ctaRouteOptions.find((candidate) => candidate.value === (this.newDeck.ctaRoute ?? ''));
    return option?.detail ?? 'El deck puede abrir una selección curada o una ruta principal existente.';
  }

  newDeckSurfaceSummary(): string {
    return this.newDeck.surface === 'RECOMMENDED'
      ? 'Lista curada para Curated'
      : 'Entrada principal dentro del Home';
  }

  decksForSurface(decks: AdminHomeDeck[], surface: HomeDeckSurfaceValue): AdminHomeDeck[] {
    return decks.filter((deck) => deck.surface === surface);
  }

  surfaceSectionTitle(surface: HomeDeckSurfaceValue): string {
    return surface === 'RECOMMENDED' ? 'Curated editables' : 'Home editables';
  }

  surfaceSectionIntro(surface: HomeDeckSurfaceValue): string {
    return surface === 'RECOMMENDED'
      ? 'Colecciones curadas que hoy alimentan Curated.'
      : 'Entradas editoriales que hoy pueden sustituir o acompañar el Home base.';
  }

  private updateDeck(id: string, data: Partial<AdminHomeDeckPayload>, message: string): void {
    this.saving = true;
    this.feedback = '';

    this.api.update(id, data).subscribe({
      next: () => {
        this.saving = false;
        this.feedback = message;
        this.refresh();
      },
      error: () => {
        this.saving = false;
        this.feedback = 'No se pudo actualizar el deck.';
      },
    });
  }

  private refresh(): void {
    this.refresh$.next();
  }


  private starterTranslations(starter: HomeDeckStarter) {
    return [
      {
        locale: 'es',
        title: starter.title,
        subtitle: starter.subtitle,
        description: starter.description,
        ctaLabel: starter.ctaLabel,
      },
      {
        locale: 'en',
        title: starter.titleEn,
        subtitle: starter.subtitleEn,
        description: starter.descriptionEn,
        ctaLabel: starter.ctaLabelEn,
      },
    ];
  }

  private markDeckRemoved(id: string): void {
    const next = new Set(this.removedDeckIds$.value);
    next.add(id);
    this.removedDeckIds$.next(next);
  }

  private restoreDeckRemoved(id: string): void {
    if (!this.removedDeckIds$.value.has(id)) {
      return;
    }

    const next = new Set(this.removedDeckIds$.value);
    next.delete(id);
    this.removedDeckIds$.next(next);
  }

  private matchesStarter(deck: AdminHomeDeck, starter: HomeDeckStarter): boolean {
    return deck.surface === starter.surface && deck.slug === starter.slug;
  }

  private resetNewDeck(): void {
    this.newDeck = {
      surface: 'HOME',
      slug: '',
      title: '',
      subtitle: '',
      description: '',
      ctaLabel: '',
      ctaRoute: '',
      imageUrl: '',
      sortOrder: 0,
      isActive: false,
    };
  }

  private cleanPayload(source: AdminHomeDeckPayload): AdminHomeDeckPayload {
    const surface = source.surface ?? 'HOME';

    return {
      surface,
      slug: source.slug.trim(),
      title: source.title.trim(),
      subtitle: source.subtitle?.trim() || undefined,
      description: source.description?.trim() || undefined,
      ctaLabel: source.ctaLabel?.trim() || undefined,
      ctaRoute: surface === 'RECOMMENDED' ? '' : source.ctaRoute?.trim() || undefined,
      ctaUrl: source.ctaUrl?.trim() || undefined,
      imageUrl: source.imageUrl?.trim() || undefined,
      imageMediaId: source.imageMediaId?.trim() || undefined,
      sortOrder: source.sortOrder ?? 0,
      isActive: source.isActive ?? false,
      translations: source.translations,
    };
  }
}
