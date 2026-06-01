import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, debounceTime, distinctUntilChanged, forkJoin, map, of, switchMap } from 'rxjs';
import {
  AdminHomeDeck,
  AdminHomeDeckPayload,
  AdminHomeDecksApi,
} from '../../../core/api/admin-home-decks.api';
import { AdminEntitiesApi } from '../../../core/api/admin-entities.api';
import {
  HOME_DECK_CTA_ROUTE_OPTIONS,
  HomeDeckSurfaceValue,
  homeDeckPublicRoute,
  homeDeckSurfaceDescription,
  homeDeckSurfaceLabel,
} from '../home-decks-editorial-options';
import { mediaDisplayUrl, resolveEntityMediaItem } from '../../../shared/media/media.utils';

type DeckForm = AdminHomeDeckPayload & {
  imageUrl: string;
  ctaUrl: string;
  ctaRoute: string;
  titleEn: string;
  subtitleEn: string;
  descriptionEn: string;
  ctaLabelEn: string;
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

@Component({
  standalone: true,
  selector: 'app-admin-home-deck-editor',
  imports: [AsyncPipe, FormsModule, RouterLink],
  templateUrl: './admin-home-deck-editor.component.html',
  styleUrl: './admin-home-deck-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminHomeDeckEditorComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly decksApi = inject(AdminHomeDecksApi);
  private readonly entitiesApi = inject(AdminEntitiesApi);
  private readonly refresh$ = new BehaviorSubject<void>(undefined);
  private readonly entitySearch$ = new BehaviorSubject<string>('');

  readonly deckId = this.route.snapshot.paramMap.get('id') ?? '';
  deck: AdminHomeDeck | null = null;
  form: DeckForm = this.emptyForm();
  loading = false;
  saving = false;
  feedback = '';
  feedbackTone: 'info' | 'success' | 'error' = 'info';
  saveState: SaveState = 'idle';
  lastSavedAt: Date | null = null;
  isDirty = false;
  private lastPersistedFormKey = '';
  entitySearch = '';
  draggingEntityId: string | null = null;

  readonly ctaRouteOptions = HOME_DECK_CTA_ROUTE_OPTIONS;

  readonly vm$ = this.refresh$.pipe(
    switchMap(() => {
      if (!this.deckId) {
        return of(null);
      }

      this.loading = true;
      return this.decksApi.getById(this.deckId).pipe(
        map((deck) => {
          this.loading = false;
          this.deck = deck;
          this.form = this.deckToForm(deck);
          this.markPersisted(deck);
          this.cdr.markForCheck();
          return deck;
        }),
        catchError(() => {
          this.loading = false;
          this.setFeedback('No se pudo cargar el deck.', 'error');
          this.cdr.markForCheck();
          return of(null);
        }),
      );
    }),
  );

  readonly entityResults$ = this.entitySearch$.pipe(
    debounceTime(220),
    distinctUntilChanged(),
    switchMap((query) => {
      const q = query.trim();
      if (!q) {
        return of([]);
      }

      return this.entitiesApi.list({ q, page: 1, limit: 12, sort: 'relevance' }).pipe(
        map((res) => res.items ?? []),
        catchError(() => of([])),
      );
    }),
  );

  save(): void {
    if (!this.deck || this.saving) return;

    if (this.form.surface === 'RECOMMENDED') {
      this.form.ctaRoute = '';
    }

    const payload = this.cleanPayload(this.form);
    if (!payload.slug || !payload.title) {
      this.setFeedback('Slug y título son obligatorios.', 'error');
      return;
    }

    if (!this.isDirty) {
      this.setFeedback('No hay cambios pendientes en este deck.', 'info');
      return;
    }

    this.saving = true;
    this.saveState = 'saving';
    this.setFeedback('Guardando cambios...', 'info');
    this.cdr.markForCheck();

    this.decksApi.update(this.deck.id, payload).subscribe({
      next: (deck) => {
        this.saving = false;
        this.deck = deck;
        this.form = this.deckToForm(deck);
        this.markPersisted(deck);
        this.setFeedback(`Cambios guardados en ${this.surfaceLabel(deck.surface)}.`, 'success');
        this.cdr.markForCheck();
      },
      error: () => {
        this.saving = false;
        this.saveState = 'error';
        this.setFeedback('No se pudo guardar el deck. Revisa campos y vuelve a intentar.', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  onSearchChange(value: string): void {
    this.entitySearch$.next(value ?? '');
  }

  addEntity(entity: any): void {
    if (!this.deck) return;

    this.saving = true;
    this.saveState = 'saving';
    this.setFeedback('Añadiendo entity...', 'info');
    this.cdr.markForCheck();

    this.decksApi.addEntity(this.deck.id, entity.id).subscribe({
      next: (deck) => this.applyDeck(deck, 'Entity añadida.'),
      error: () => {
        this.saving = false;
        this.saveState = 'error';
        this.setFeedback('No se pudo añadir la entity.', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  removeEntity(entityId: string): void {
    if (!this.deck) return;

    this.saving = true;
    this.saveState = 'saving';
    this.setFeedback('Quitando entity...', 'info');
    this.cdr.markForCheck();

    this.decksApi.removeEntity(this.deck.id, entityId).subscribe({
      next: (deck) => this.applyDeck(deck, 'Entity eliminada.'),
      error: () => {
        this.saving = false;
        this.saveState = 'error';
        this.setFeedback('No se pudo eliminar la entity.', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  moveEntity(item: AdminHomeDeck['entities'][number], direction: -1 | 1, items: AdminHomeDeck['entities']): void {
    if (!this.deck) return;

    const ordered = [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.entity.title.localeCompare(b.entity.title));
    const index = ordered.findIndex((candidate) => candidate.id === item.id);
    const target = ordered[index + direction];

    if (!target) {
      return;
    }

    this.saving = true;
    this.saveState = 'saving';
    this.setFeedback('Actualizando orden...', 'info');
    this.cdr.markForCheck();

    forkJoin([
      this.decksApi.reorderEntity(this.deck.id, item.entity.id, target.sortOrder),
      this.decksApi.reorderEntity(this.deck.id, target.entity.id, item.sortOrder),
    ]).subscribe({
      next: () => {
        this.saving = false;
        this.saveState = 'saved';
        this.lastSavedAt = new Date();
        this.setFeedback('Orden de entities actualizado.', 'success');
        this.refresh$.next();
        this.cdr.markForCheck();
      },
      error: () => {
        this.saving = false;
        this.saveState = 'error';
        this.setFeedback('No se pudo actualizar el orden.', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  startEntityDrag(entityId: string): void {
    this.draggingEntityId = entityId;
  }

  clearEntityDrag(): void {
    this.draggingEntityId = null;
  }

  dropEntityBefore(targetEntityId: string, items: AdminHomeDeck['entities']): void {
    const sourceEntityId = this.draggingEntityId;
    this.draggingEntityId = null;

    if (!this.deck || !sourceEntityId || sourceEntityId === targetEntityId) {
      return;
    }

    const ordered = [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
    const sourceIndex = ordered.findIndex((item) => item.entity.id === sourceEntityId);
    const targetIndex = ordered.findIndex((item) => item.entity.id === targetEntityId);

    if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
      return;
    }

    const [moved] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, moved);

    this.applyOptimisticOrder(ordered);
    this.persistEntityOrder(ordered, 'Orden curatorial actualizado.');
  }

  isSelected(entityId: string): boolean {
    return this.deck?.entities.some((item) => item.entity.id === entityId) ?? false;
  }

  openPublicHome(): void {
    this.router.navigateByUrl(homeDeckPublicRoute(this.form.surface));
  }

  onSurfaceChange(surface: HomeDeckSurfaceValue): void {
    this.form.surface = surface;

    if (surface === 'RECOMMENDED') {
      this.form.ctaRoute = '';
    }

    this.onFormChanged();
  }

  onFormChanged(): void {
    this.isDirty = this.hasUnsavedChanges();

    if (this.isDirty && this.saveState !== 'saving') {
      this.saveState = 'idle';
      this.feedback = '';
    }
  }

  uploadImage(event: Event): void {
    if (!this.deck) return;

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.saving = true;
    this.saveState = 'saving';
    this.setFeedback('Subiendo imagen...', 'info');
    this.cdr.markForCheck();

    this.decksApi.uploadImage(this.deck.id, file, { alt: this.form.title }).subscribe({
      next: (deck) => {
        input.value = '';
        this.applyDeck(deck, 'Imagen subida.');
      },
      error: () => {
        input.value = '';
        this.saving = false;
        this.saveState = 'error';
        this.setFeedback('No se pudo subir la imagen.', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  activeTargetLabel(): string {
    return homeDeckSurfaceLabel(this.form.surface);
  }

  activeCheckboxLabel(): string {
    return `Activo en ${this.activeTargetLabel()}`;
  }

  destinationButtonLabel(): string {
    return this.form.surface === 'RECOMMENDED' ? 'Ver Recommended' : 'Ver Home';
  }

  surfaceDescription(): string {
    return homeDeckSurfaceDescription(this.form.surface);
  }

  publicationSummary(): string {
    const target = this.activeTargetLabel();
    const state = this.form.isActive ? 'visible' : 'oculto';
    return `${target} · ${state}`;
  }

  saveButtonLabel(): string {
    if (this.saving || this.saveState === 'saving') {
      return 'Guardando...';
    }

    if (this.isDirty) {
      return 'Guardar cambios';
    }

    return 'Guardado';
  }

  saveStatusLabel(): string {
    if (this.saving || this.saveState === 'saving') {
      return 'Guardando cambios en el backend...';
    }

    if (this.isDirty) {
      return 'Hay cambios sin guardar.';
    }

    if (this.saveState === 'saved' && this.lastSavedAt) {
      return `Guardado a las ${this.lastSavedAt.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })}.`;
    }

    if (this.saveState === 'error') {
      return 'El último guardado falló.';
    }

    return 'Sin cambios pendientes.';
  }

  saveStatusTone(): 'idle' | 'dirty' | 'saved' | 'saving' | 'error' {
    if (this.saving || this.saveState === 'saving') return 'saving';
    if (this.saveState === 'error') return 'error';
    if (this.isDirty) return 'dirty';
    if (this.saveState === 'saved') return 'saved';
    return 'idle';
  }

  selectedCtaRouteDetail(): string {
    if (this.form.surface === 'RECOMMENDED') {
      return 'Recommended abre siempre las entities seleccionadas en este deck.';
    }

    const option = this.ctaRouteOptions.find((item) => item.value === this.form.ctaRoute);
    return option?.detail ?? 'Ruta personalizada guardada en este deck.';
  }

  previewImageUrl(): string | null {
    return (this.deck?.image?.url ?? this.form.imageUrl?.trim()) || null;
  }

  previewEyebrow(): string {
    return this.form.subtitle?.trim() || (this.form.surface === 'RECOMMENDED' ? 'Curated selection' : 'Editorial deck');
  }

  translationSummary(): string {
    const hasEnglish = !!this.form.titleEn.trim();
    return hasEnglish ? 'ES y EN configurados' : 'Falta traducción EN';
  }

  previewTitle(): string {
    return this.form.title?.trim() || 'Sin título';
  }

  previewDescription(): string {
    return this.form.description?.trim() || 'Añade una descripción breve para explicar la promesa curatorial de este deck.';
  }

  previewCtaLabel(): string {
    return this.form.ctaLabel?.trim() || 'Ver selección';
  }

  previewRouteSummary(): string {
    if (this.form.surface === 'RECOMMENDED') {
      return 'Abre la selección curada del propio deck.';
    }

    if (!this.form.ctaRoute?.trim()) {
      return 'Abre la selección curada del propio deck.';
    }

    const option = this.ctaRouteOptions.find((item) => item.value === this.form.ctaRoute);
    return option?.label ?? this.form.ctaRoute;
  }

  entityImageUrl(entity: any): string | null {
    const media = resolveEntityMediaItem(entity, 'card') ?? resolveEntityMediaItem(entity, 'detail');
    return mediaDisplayUrl(media);
  }

  entityEyebrow(entity: any): string {
    return (entity?.type ?? 'ENTITY').toString();
  }

  entityStatusLabel(entity: any): string {
    return (entity?.status ?? 'DRAFT').toString();
  }

  orderedEntities(items: AdminHomeDeck['entities']): AdminHomeDeck['entities'] {
    return [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
  }

  showCtaRouteControl(): boolean {
    return this.form.surface === 'HOME';
  }

  isCustomCtaRoute(): boolean {
    const route = this.form.ctaRoute?.trim();
    return !!route && !this.ctaRouteOptions.some((item) => item.value === route);
  }

  private applyDeck(deck: AdminHomeDeck, message: string): void {
    this.saving = false;
    this.saveState = 'saved';
    this.deck = deck;
    this.form = this.deckToForm(deck);
    this.markPersisted(deck);
    this.setFeedback(message, 'success');
    this.cdr.markForCheck();
  }

  private applyOptimisticOrder(ordered: AdminHomeDeck['entities']): void {
    if (!this.deck) {
      return;
    }

    this.deck = {
      ...this.deck,
      entities: ordered.map((item, index) => ({
        ...item,
        sortOrder: index,
      })),
    };

    this.cdr.markForCheck();
  }

  private persistEntityOrder(ordered: AdminHomeDeck['entities'], successMessage: string): void {
    if (!this.deck) {
      return;
    }

    const previousDeck = this.deck;
    const updates = ordered
      .map((item, index) => ({ item, index }))
      .filter(({ item, index }) => item.sortOrder !== index)
      .map(({ item, index }) => this.decksApi.reorderEntity(this.deck!.id, item.entity.id, index));

    if (!updates.length) {
      return;
    }

    this.saving = true;
    this.saveState = 'saving';
    this.setFeedback('Reordenando secuencia...', 'info');
    this.cdr.markForCheck();

    forkJoin(updates).subscribe({
      next: () => {
        this.saving = false;
        this.saveState = 'saved';
        this.lastSavedAt = new Date();
        this.setFeedback(successMessage, 'success');
        this.refresh$.next();
        this.cdr.markForCheck();
      },
      error: () => {
        this.deck = previousDeck;
        this.saving = false;
        this.saveState = 'error';
        this.setFeedback('No se pudo actualizar el orden curatorial.', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  private emptyForm(): DeckForm {
    return {
      surface: 'HOME',
      slug: '',
      title: '',
      subtitle: '',
      description: '',
      ctaLabel: '',
      ctaUrl: '',
      ctaRoute: '',
      imageUrl: '',
      sortOrder: 0,
      isActive: false,
      titleEn: '',
      subtitleEn: '',
      descriptionEn: '',
      ctaLabelEn: '',
    };
  }

  private deckToForm(deck: AdminHomeDeck): DeckForm {
    const en = deck.translations?.find((item) => item.locale === 'en');

    return {
      surface: deck.surface,
      slug: deck.slug,
      title: deck.title,
      subtitle: deck.subtitle ?? '',
      description: deck.description ?? '',
      ctaLabel: deck.ctaLabel ?? '',
      ctaUrl: deck.ctaUrl ?? '',
      ctaRoute: deck.ctaRoute ?? '',
      imageUrl: deck.imageUrl ?? deck.image?.url ?? '',
      imageMediaId: deck.imageMediaId ?? undefined,
      sortOrder: deck.sortOrder,
      isActive: deck.isActive,
      titleEn: en?.title ?? '',
      subtitleEn: en?.subtitle ?? '',
      descriptionEn: en?.description ?? '',
      ctaLabelEn: en?.ctaLabel ?? '',
    };
  }

  private cleanPayload(source: DeckForm): AdminHomeDeckPayload {
    const surface = source.surface ?? 'HOME';

    return {
      surface,
      slug: source.slug.trim(),
      title: source.title.trim(),
      subtitle: source.subtitle?.trim() ?? '',
      description: source.description?.trim() ?? '',
      ctaLabel: source.ctaLabel?.trim() ?? '',
      ctaUrl: source.ctaUrl?.trim() ?? '',
      ctaRoute: surface === 'RECOMMENDED' ? '' : source.ctaRoute?.trim() ?? '',
      imageUrl: source.imageUrl?.trim() ?? '',
      imageMediaId: source.imageMediaId?.trim() || undefined,
      sortOrder: Number(source.sortOrder ?? 0),
      isActive: !!source.isActive,
      translations: [
        {
          locale: 'es',
          title: source.title.trim(),
          subtitle: source.subtitle?.trim() ?? '',
          description: source.description?.trim() ?? '',
          ctaLabel: source.ctaLabel?.trim() ?? '',
        },
        {
          locale: 'en',
          title: source.titleEn.trim(),
          subtitle: source.subtitleEn?.trim() ?? '',
          description: source.descriptionEn?.trim() ?? '',
          ctaLabel: source.ctaLabelEn?.trim() ?? '',
        },
      ].filter((item) => item.title),
    };
  }

  private markPersisted(deck: AdminHomeDeck): void {
    this.lastPersistedFormKey = this.formKey(this.deckToForm(deck));
    this.lastSavedAt = new Date(deck.updatedAt);
    this.saveState = 'saved';
    this.isDirty = false;
  }

  private hasUnsavedChanges(): boolean {
    if (!this.lastPersistedFormKey) return false;
    return this.formKey(this.form) !== this.lastPersistedFormKey;
  }

  private formKey(form: DeckForm): string {
    const payload = this.cleanPayload(form);
    return JSON.stringify(payload);
  }

  private setFeedback(message: string, tone: 'info' | 'success' | 'error'): void {
    this.feedback = message;
    this.feedbackTone = tone;
  }

  private surfaceLabel(surface: AdminHomeDeck['surface'] | undefined): string {
    return homeDeckSurfaceLabel(surface);
  }
}
