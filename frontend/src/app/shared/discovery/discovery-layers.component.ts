import { VisualReferenceService } from './visual-reference.service';
import { AsyncPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  catchError,
  combineLatest,
  distinctUntilChanged,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { apiUrl } from '../../core/api/api-base';
import { I18nService } from '../../core/i18n/i18n.service';
import { entityTypeLabel, contentLevelLabel } from '../../core/i18n/domain-labels';
import { DiscoveryImageIconComponent } from './discovery-image-icon.component';
import { entitySymbol } from '../entity-symbols';
import { AppLoadingComponent } from '../ui/app-loading/app-loading.component';

type Layers = Partial<Record<string, string[]>>;
type Facet = { key: string; options: { value: string; label: string; count: number }[] };
const keys = [
  'type',
  'period',
  'movement',
  'author',
  'institution',
  'nationality',
  'technique',
  'material',
  'tag',
  'color',
  'contentLevel',
];

@Component({
  selector: 'app-discovery-layers',
  standalone: true,
  imports: [AsyncPipe, AppLoadingComponent, DiscoveryImageIconComponent],
  template: `
    @if (vm$ | async; as vm) {
      <div class="heading">
        <div>
          <span class="eyebrow">{{ i18n.t('discovery.explore') }}</span>
          <h2>{{ i18n.t('discovery.layers') }}</h2>
        </div>
        <button
          type="button"
          (click)="clear()"
          [attr.aria-label]="i18n.t('discovery.clear')"
          [title]="i18n.t('discovery.clear')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" /></svg>
        </button>
      </div>
      <ng-content select="[discovery-search]" />
      @if (searchSurface) {
        <form class="refine-search" (submit)="refine($event, refinement.value)">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6" />
            <path d="m15 15 5 5" /></svg
          ><input
            #refinement
            type="search"
            [value]="vm.query"
            [placeholder]="i18n.t('discovery.refine')"
            [attr.aria-label]="i18n.t('discovery.refine')"
          />
        </form>
      }

      @if (showVisualCriteria) {
        <div class="visual-criteria">
          <button type="button" class="reference-criterion" (click)="openVisual('image')">
            @if (vm.image && referencePreview()) {
              <img [src]="referencePreview()" alt="" />
            } @else {
              <app-discovery-image-icon />
            }
            <span>
              @if (vm.image) {
                <small>{{ i18n.t('discovery.reference') }}</small>
              }
              {{ i18n.t(vm.image ? 'discovery.editImage' : 'discovery.addImage') }}</span
            >
            <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
          @if (vm.image) {
            <button
              type="button"
              class="remove-criterion"
              (click)="removeImage(vm.image)"
              [attr.aria-label]="i18n.t('discovery.removeImage')"
            >
              ×
            </button>
          }
          <button type="button" class="color-criterion" (click)="openVisual('color')">
            <i class="spectrum"></i><span>{{ i18n.t('discovery.colors') }}</span
            ><svg class="chevron" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
          @for (color of vm.imageColors; track color) {
            <button
              type="button"
              class="color-value"
              (click)="removeColor(color, vm.imageColors)"
              [attr.aria-label]="i18n.t('discovery.remove') + ' ' + color"
            >
              <i [style.background]="color"></i>{{ color }} <span aria-hidden="true">×</span>
            </button>
          }
        </div>
      }
      <p class="context-label">
        {{ i18n.t(selectedCount(vm.layers) ? 'discovery.adaptedLayers' : 'discovery.allLayers') }}
      </p>
      @if (vm.loading) {
        <app-loading [compact]="true" [label]="i18n.t('search.searching')" />
      }
      @if (vm.error) {
        <p role="alert">{{ i18n.t('discovery.error') }}</p>
      }
      <div class="selected">
        @for (key of keys; track key) {
          @for (value of vm.layers[key] ?? []; track value) {
            <button
              type="button"
              (click)="toggle(key, value, vm.layers)"
              [attr.aria-label]="
                i18n.t('discovery.remove') + ' ' + label(key, value, facets ?? vm.facets)
              "
            >
              {{ label(key, value, facets ?? vm.facets) }} <span aria-hidden="true">×</span>
            </button>
          }
        }
      </div>
      @for (facet of facets ?? vm.facets; track facet.key) {
        <details [open]="!!vm.layers[facet.key]?.length">
          <summary>
            <svg class="layer-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path [attr.d]="symbol(facet.key)" />
            </svg>
            <span class="layer-name">{{ i18n.t('discovery.layer.' + facet.key) }}</span
            ><span class="layer-meta">{{
              vm.layers[facet.key]?.length || facet.options.length
            }}</span>
            <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </summary>
          <div class="options">
            @for (option of facet.options; track option.value) {
              <label
                [class.unavailable]="!option.count && !vm.layers[facet.key]?.includes(option.value)"
              >
                <input
                  type="checkbox"
                  [checked]="!!vm.layers[facet.key]?.includes(option.value)"
                  [disabled]="!option.count && !vm.layers[facet.key]?.includes(option.value)"
                  (change)="toggle(facet.key, option.value, vm.layers)"
                />
                @if (facet.key === 'color') {
                  <i [style.background]="colors[option.value]"></i>
                }
                <span>{{ label(facet.key, option.value, facets ?? vm.facets) }}</span
                ><small>{{ option.count }}</small>
              </label>
            } @empty {
              <p>{{ i18n.t('discovery.unavailable') }}</p>
            }
          </div>
        </details>
      }
    }
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
        color: var(--color-text);
      }
      svg {
        fill: none;
        stroke: currentColor;
        stroke-width: 2.3;
        stroke-linecap: round;
        stroke-linejoin: round;
        width: 18px;
        height: 18px;
        flex-shrink: 0;
      }
      .heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
      }
      .eyebrow {
        font-size: 12px;
        letter-spacing: 0.11em;
        color: var(--color-text-muted);
      }
      h2 {
        font-size: 28px;
        font-weight: 500;
        letter-spacing: -0.035em;
        margin: 5px 0 0;
      }
      .heading button {
        border: 0;
        padding: 6px;
        border-radius: 50%;
        background: transparent;
        color: var(--color-text-muted);
      }
      button {
        font: inherit;
        color: inherit;
        cursor: pointer;
      }
      .context-label {
        font-size: 13px;
        line-height: 1.5;
        min-height: 32px;
        margin: 16px 0 6px;
        color: var(--color-text-muted);
      }
      .refine-search {
        display: flex;
        align-items: center;
        gap: 8px;
        border: 1px solid color-mix(in srgb, var(--color-text) 18%, transparent);
        border-radius: 12px;
        background: color-mix(in srgb, var(--color-text) 2%, transparent);
        padding: 10px;
        color: var(--color-text-muted);
        margin-bottom: 16px;
      }
      .refine-search input {
        appearance: auto;
        border: 0;
        background: transparent;
        border-radius: 0;
        width: 100%;
        min-width: 0;
        height: 20px;
        font: inherit;
        font-size: 14px;
        color: var(--color-text);
      }
      .refine-search svg {
        width: 16px;
        height: 16px;
      }
      .visual-criteria {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 12px;
      }
      .visual-criteria button {
        border: 0;
        background: transparent;
        padding: 9px 0;
        text-align: left;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
      }
      .reference-criterion {
        flex: 1;
        min-width: 0;
      }
      .reference-criterion img {
        width: 34px;
        height: 34px;
        object-fit: cover;
        border-radius: 5px;
      }
      .reference-criterion span {
        display: grid;
        gap: 4px;
      }
      .reference-criterion small {
        font-size: 12px;
        color: var(--color-text-muted);
      }
      .remove-criterion {
        padding: 8px !important;
      }
      .color-criterion {
        width: 100%;
      }
      .visual-criteria .chevron {
        margin-left: auto;
      }
      .visual-criteria .color-value {
        border: 1px solid var(--color-border);
        padding: 6px 8px;
        border-radius: 9px;
        font-size: 12px;
      }
      .color-value i,
      .spectrum {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 1px solid var(--color-border);
      }
      .spectrum {
        background: conic-gradient(#b75a4b, #d9ba79, #74957b, #6588aa, #9c749d, #b75a4b);
      }
      .selected {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .selected:has(button) {
        padding-bottom: 12px;
      }
      .selected button {
        font-size: 13px;
        padding: 5px 9px;
        min-height: 30px;
        border: 1px solid var(--color-border);
        border-radius: 9px;
        background: color-mix(in srgb, var(--color-text) 3%, transparent);
      }
      details {
        border-bottom: 1px solid color-mix(in srgb, var(--color-text) 18%, transparent);
      }
      summary {
        list-style: none;
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 16px 0;
        cursor: pointer;
        font-size: 15px;
      }
      summary::-webkit-details-marker {
        display: none;
      }
      .layer-name {
        flex: 1;
      }
      .layer-icon {
        color: var(--color-text-muted);
      }
      .layer-meta {
        font-size: 12px;
        color: var(--color-text-muted);
      }
      .chevron {
        width: 12px;
        height: 12px;
        stroke-width: 2.3;
      }
      details[open] > summary .chevron {
        transform: rotate(90deg);
      }
      .options {
        max-height: 230px;
        overflow: auto;
        padding: 0 0 12px;
      }
      label {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 8px 9px;
        min-height: 34px;
        box-sizing: border-box;
        border-radius: 9px;
        font-size: 14px;
        line-height: 1.4;
        cursor: pointer;
      }
      label:has(input:checked) {
        background: color-mix(in srgb, var(--color-text) 5%, transparent);
      }
      input {
        appearance: none;
        width: 13px;
        height: 13px;
        border: 1px solid var(--color-text-muted);
        border-radius: 4px;
        flex-shrink: 0;
        margin: 0;
      }
      input:checked {
        background: var(--color-text);
        border-color: var(--color-text);
        position: relative;
      }
      input:checked:after {
        content: '';
        position: absolute;
        width: 5px;
        height: 3px;
        border-left: 1.5px solid var(--color-surface-strong);
        border-bottom: 1.5px solid var(--color-surface-strong);
        transform: rotate(-45deg);
        top: 3px;
        left: 3px;
      }
      label span {
        flex: 1;
        overflow-wrap: anywhere;
      }
      small {
        font-size: 13px;
        color: var(--color-text-muted);
      }
      .unavailable {
        opacity: 0.38;
      }
      .options i {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 1px solid var(--color-border);
      }
      .options p {
        font-size: 13px;
        color: var(--color-text-muted);
        line-height: 1.5;
      }
      button:focus-visible,
      input:focus-visible,
      summary:focus-visible {
        outline: 2px solid var(--color-text-muted);
        outline-offset: 3px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscoveryLayersComponent {
  @Input() facets?: Facet[];
  @Input() showVisualCriteria = false;
  readonly referencePreview = inject(VisualReferenceService).preview;

  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  readonly i18n = inject(I18nService);
  readonly keys = keys;
  readonly searchSurface = this.route.routeConfig?.path === 'search';
  readonly colors: Record<string, string> = {
    red: '#c64637',
    orange: '#d58040',
    yellow: '#d8bc52',
    green: '#51835c',
    blue: '#477ba6',
    purple: '#85629e',
    pink: '#ce8eaa',
    brown: '#805c40',
    black: '#181818',
    gray: '#888888',
    white: '#ededed',
  };
  private read(raw: string | null): Layers {
    try {
      const value = JSON.parse(raw ?? '{}');
      return Object.fromEntries(
        Object.entries(value).filter(
          ([key, v]) =>
            keys.includes(key) && Array.isArray(v) && v.every((x) => typeof x === 'string'),
        ),
      ) as Layers;
    } catch {
      return {};
    }
  }
  readonly vm$ = combineLatest([
    this.route.queryParamMap.pipe(
      distinctUntilChanged((a, b) =>
        [...keys, 'layers', 'q', 'deck', 'kind', 'image', 'colors'].every(
          (key) => a.get(key) === b.get(key),
        ),
      ),
    ),
    this.route.paramMap,
    toObservable(this.i18n.locale),
  ]).pipe(
    switchMap(([params, path, locale]) => {
      const layers = this.read(params.get('layers'));
      for (const key of keys)
        if (key !== 'color' && params.get(key) && !layers[key])
          layers[key] = [key === 'type' ? params.get(key)!.toUpperCase() : params.get(key)!];
      const visual = {
        query: params.get('q') ?? '',
        image: params.get('image'),
        imageColors: (params.get('colors') ?? '')
          .split(',')
          .filter((v) => /^#[a-f0-9]{6}$/i.test(v)),
      };
      const type = path.get('type');
      const query: Record<string, string> = { locale, layers: JSON.stringify(layers) };
      if (this.route.routeConfig?.path === 'search') query['surface'] = 'search';
      for (const key of ['q', 'deck', 'kind']) if (params.get(key)) query[key] = params.get(key)!;
      if (type) query['type'] = type.toUpperCase();
      return this.http
        .get<{ facets: Facet[]; total: number }>(apiUrl('/discovery/facets'), { params: query })
        .pipe(
          map((response) => ({ ...response, ...visual, layers, loading: false, error: false })),
          catchError(() =>
            of({ facets: [] as Facet[], ...visual, layers, loading: false, error: true }),
          ),
          startWith({
            facets: keys.map((key) => ({ key, options: [] })),
            ...visual,
            layers,
            loading: true,
            error: false,
          }),
        );
    }),
  );
  refine(event: Event, q: string) {
    event.preventDefault();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: q.trim() || null, page: 1 },
      queryParamsHandling: 'merge',
    });
  }
  openVisual(mode: 'image' | 'color') {
    void this.router.navigate([], { queryParams: { mode }, queryParamsHandling: 'merge' });
  }
  removeImage(image: string) {
    this.http
      .delete(apiUrl('/search/images'), { params: { image } })
      .subscribe({ error: () => {} });
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { image: null, page: 1 },
      queryParamsHandling: 'merge',
    });
  }
  removeColor(color: string, colors: string[]) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { colors: colors.filter((v) => v !== color).join(',') || null, page: 1 },
      queryParamsHandling: 'merge',
    });
  }
  symbol(key: string) {
    const types: Record<string, string> = {
      type: 'ARTWORK',
      period: 'PERIOD',
      movement: 'MOVEMENT',
      author: 'ARTIST',
      institution: 'ORGANIZATION',
      nationality: 'PLACE',
      technique: 'CONCEPT',
      material: 'TEXT',
      tag: 'CONCEPT',
      color: 'MOVEMENT',
      contentLevel: 'ARTICLE',
    };
    return entitySymbol(types[key] ?? 'CONCEPT').path;
  }
  selectedCount(layers: Layers) {
    return Object.values(layers).reduce((n, values) => n + (values?.length ?? 0), 0);
  }
  label(key: string, value: string, facets: Facet[]) {
    if (key === 'type') return entityTypeLabel(value, this.i18n);
    if (key === 'contentLevel') return contentLevelLabel(value, this.i18n);
    if (key === 'color') return this.i18n.t('discovery.color.' + value);
    return (
      facets.find((f) => f.key === key)?.options.find((o) => o.value === value)?.label ?? value
    );
  }
  toggle(key: string, value: string, layers: Layers) {
    const values = layers[key] ?? [];
    const next = {
      ...layers,
      [key]: values.includes(value) ? values.filter((v) => v !== value) : [...values, value],
    };
    this.navigate(next);
  }
  clear() {
    this.navigate({});
  }
  private navigate(layers: Layers) {
    const queryParams: Record<string, string | number | null> = {
      layers: this.selectedCount(layers) ? JSON.stringify(layers) : null,
      page: 1,
    };
    for (const key of keys) if (key !== 'color') queryParams[key] = null;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }
}
