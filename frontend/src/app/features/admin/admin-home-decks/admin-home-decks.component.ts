import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, forkJoin, map, of, switchMap } from 'rxjs';
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

  loading = false;
  saving = false;
  feedback = '';

  readonly ctaRouteOptions = HOME_DECK_CTA_ROUTE_OPTIONS;

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

  readonly vm$ = this.refresh$.pipe(
    switchMap(() => {
      this.loading = true;
      return this.api.list().pipe(
        map((decks) => {
          this.loading = false;
          return {
            decks,
            activeCount: decks.filter((deck) => deck.isActive).length,
            homeCount: decks.filter((deck) => deck.surface === 'HOME').length,
            recommendedCount: decks.filter((deck) => deck.surface === 'RECOMMENDED').length,
            warningCount: decks.filter((deck) => this.hasWarnings(deck)).length,
          };
        }),
        catchError(() => {
          this.loading = false;
          return of({ decks: [], activeCount: 0, homeCount: 0, recommendedCount: 0, warningCount: 0 });
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

    this.api.remove(deck.id).subscribe({
      next: () => {
        this.saving = false;
        this.feedback = 'Deck eliminado.';
        this.refresh();
      },
      error: () => {
        this.saving = false;
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
    };
  }
}
