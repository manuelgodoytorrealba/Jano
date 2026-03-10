import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, takeUntil } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminEntitiesApi, AdminEntityPayload } from '../../../core/api/admin-entities.api';

@Component({
  standalone: true,
  selector: 'app-admin-entity-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-entity-form.component.html',
  styleUrls: ['./admin-entity-form.component.scss'],
})
export class AdminEntityFormComponent implements OnInit, OnDestroy {
  private adminApi = inject(AdminEntitiesApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

@ViewChild('contentTextarea')
contentTextarea?: ElementRef<HTMLTextAreaElement>;

@ViewChild('previewContainer')
previewContainer?: ElementRef<HTMLElement>;

  linkSuggestions: any[] = [];
  linkSearch = '';
  linkLoading = false;
  showLinkSuggestions = false;
  linkStartIndex = -1;
  hoveredSlug: string | null = null;
  previewData: any | null = null;
  previewLoading = false;



  private closePreviewTimer: ReturnType<typeof setTimeout> | null = null;
  private previewRequestId = 0;
  private isHoveringPreviewLink = false;
  isHoveringPreviewPopup = false;
  private previewRequestSlug: string | null = null;

  successMessage = '';
  submitMode: 'back' | 'stay' = 'back';

  private linkSearch$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  incomingRelations: any[] = [];
  incomingRelationsLoading = false;

  relationTypes = [
    'RELATES_TO',
    'INFLUENCED_BY',
    'PART_OF',
    'CREATED_BY',
    'REFERENCES',
  ];

  relations: any[] = [];
  relationSearch = '';
  relationResults: any[] = [];
  relationLoading = false;
  relationsLoading = false;

  newRelation = {
    toId: '',
    type: 'RELATES_TO',
    justification: '',
  };

  types: AdminEntityPayload['type'][] = [
    'ARTWORK',
    'ARTIST',
    'CONCEPT',
    'MOVEMENT',
    'PERIOD',
    'TEXT',
    'PLACE',
  ];

  statuses: NonNullable<AdminEntityPayload['status']>[] = [
    'DRAFT',
    'IN_REVIEW',
    'PUBLISHED',
  ];

  levels: NonNullable<AdminEntityPayload['contentLevel']>[] = [
    'BASIC',
    'INTERMEDIATE',
    'ADVANCED',
  ];

  saving = false;
  loading = false;
  errorMessage = '';
  loadError = '';

  isEdit = false;
  entityId = '';
  slugTouched = false;

  form: {
    type: AdminEntityPayload['type'];
    title: string;
    slug: string;
    summary: string;
    content: string;
    contentLevel: '' | NonNullable<AdminEntityPayload['contentLevel']>;
    status: NonNullable<AdminEntityPayload['status']>;
    startYear: number | null | string;
    endYear: number | null | string;
  } = {
      type: 'ARTWORK',
      title: '',
      slug: '',
      summary: '',
      content: '',
      contentLevel: '',
      status: 'DRAFT',
      startYear: null,
      endYear: null,
    };

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!id;
    this.entityId = id ?? '';

    this.linkSearch$
      .pipe(
        debounceTime(180),
        distinctUntilChanged(),
        switchMap((query) => {
          const q = query.trim();

          if (q.length < 1) {
            return of({ items: [] });
          }

          this.linkLoading = true;
          this.cdr.markForCheck();

          return this.adminApi.list({
            q,
            limit: 8,
            page: 1,
            sort: 'title',
          });
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (res: any) => {
          const items = Array.isArray(res?.items) ? res.items : [];
          this.linkSuggestions = items;
          this.linkLoading = false;
          this.showLinkSuggestions = true;
          this.cdr.markForCheck();
        },
        error: () => {
          this.linkSuggestions = [];
          this.linkLoading = false;
          this.showLinkSuggestions = true;
          this.cdr.markForCheck();
        },
      });

    if (!this.isEdit || !this.entityId) {
      return;
    }

    this.loading = true;
    this.loadError = '';

    this.adminApi.getById(this.entityId).subscribe({
      next: (entity) => {
        this.form = {
          type: entity.type ?? 'ARTWORK',
          title: entity.title ?? '',
          slug: entity.slug ?? '',
          summary: entity.summary ?? '',
          content: entity.content ?? '',
          contentLevel: entity.contentLevel ?? '',
          status: entity.status ?? 'DRAFT',
          startYear: entity.startYear ?? null,
          endYear: entity.endYear ?? null,
        };

        this.slugTouched = true;
        this.loading = false;
        this.loadRelations();
        this.loadIncomingRelations();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loadError = err?.error?.message ?? 'No se pudo cargar la entity';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }
  ngAfterViewInit() {
  const container = this.previewContainer?.nativeElement;
  if (!container) return;

  container.addEventListener('mouseover', (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    const link = target?.closest('.entity-link') as HTMLElement | null;

    if (!link) return;

    const slug = link.dataset['slug'];
    if (!slug) return;

    this.isHoveringPreviewLink = true;
    this.cancelClosePreview();
    this.openPreview(slug);
  });

  container.addEventListener('mouseout', (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    const link = target?.closest('.entity-link') as HTMLElement | null;

    if (!link) return;

    const related = event.relatedTarget as HTMLElement | null;

    // Si vas hacia otro link del preview, no cierres
    if (related?.closest('.entity-link')) {
      return;
    }

    // Si vas hacia el popup, no cierres
    if (related?.closest('.entity-preview-popover')) {
      this.isHoveringPreviewLink = false;
      return;
    }

    this.isHoveringPreviewLink = false;
    this.scheduleClosePreview();
  });
}

  onTitleChange(value: string) {
    this.form.title = value;

    if (!this.slugTouched) {
      this.form.slug = this.slugify(value);
    }
  }

  onSlugChange(value: string) {
    this.slugTouched = true;
    this.form.slug = this.slugify(value);
  }

  private slugify(value: string): string {
    return (value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  private buildPayload(): AdminEntityPayload {
    return {
      type: this.form.type,
      title: (this.form.title ?? '').trim(),
      slug: (this.form.slug ?? '').trim(),
      summary: (this.form.summary ?? '').trim() || undefined,
      content: (this.form.content ?? '').trim() || undefined,
      contentLevel: this.form.contentLevel || undefined,
      status: this.form.status || undefined,
      startYear:
        this.form.startYear !== null && this.form.startYear !== ''
          ? Number(this.form.startYear)
          : undefined,
      endYear:
        this.form.endYear !== null && this.form.endYear !== ''
          ? Number(this.form.endYear)
          : undefined,
    };
  }

  submit(mode: 'back' | 'stay' = 'back') {
    this.errorMessage = '';
    this.successMessage = '';
    this.submitMode = mode;

    const payload = this.buildPayload();

    if (!payload.title || !payload.slug || !payload.type) {
      this.errorMessage = 'Título, slug y tipo son obligatorios.';
      return;
    }

    this.saving = true;

    const req$ = this.isEdit
      ? this.adminApi.update(this.entityId, payload)
      : this.adminApi.create(payload);

    req$.subscribe({
      next: (entity) => {
        this.saving = false;
        this.successMessage = this.isEdit
          ? 'Entity actualizada correctamente.'
          : 'Entity creada correctamente.';

        this.cdr.markForCheck();

        if (mode === 'stay') {
          if (!this.isEdit && entity?.id) {
            this.router.navigate(['/admin/entities', entity.id, 'edit']);
          }
          return;
        }

        setTimeout(() => {
          this.router.navigate(['/admin']);
        }, 700);
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.message ?? 'No se pudo guardar la entity';
        this.cdr.markForCheck();
      },
    });
  }

  loadRelations() {
    if (!this.entityId) return;

    this.relationsLoading = true;

    this.adminApi.listRelations(this.entityId).subscribe({
      next: (rows) => {
        this.relations = rows;
        this.relationsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.relations = [];
        this.relationsLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  loadIncomingRelations() {
    if (!this.entityId) return;

    this.incomingRelationsLoading = true;

    this.adminApi.listIncomingRelations(this.entityId).subscribe({
      next: (rows) => {
        this.incomingRelations = rows;
        this.incomingRelationsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.incomingRelations = [];
        this.incomingRelationsLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  searchRelationTargets() {
    const q = this.relationSearch.trim();

    if (!q || q.length < 2) {
      this.relationResults = [];
      this.cdr.markForCheck();
      return;
    }

    this.relationLoading = true;

    this.adminApi.list({
      q,
      limit: 12,
      page: 1,
      sort: 'title',
    }).subscribe({
      next: (res: any) => {
        const items = Array.isArray(res?.items) ? res.items : [];
        this.relationResults = items.filter((item: any) => item.id !== this.entityId);
        this.relationLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.relationResults = [];
        this.relationLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  selectRelationTarget(entity: any) {
    this.newRelation.toId = entity.id;
    this.relationSearch = `${entity.title} (${entity.type})`;
    this.relationResults = [];
    this.cdr.markForCheck();
  }

  addRelation() {
    if (!this.entityId || !this.newRelation.toId || !this.newRelation.type.trim()) {
      return;
    }

    this.adminApi.createRelation(this.entityId, {
      toId: this.newRelation.toId,
      type: this.newRelation.type.trim(),
      justification: this.newRelation.justification.trim() || undefined,
    }).subscribe({
      next: () => {
        this.newRelation = {
          toId: '',
          type: 'RELATES_TO',
          justification: '',
        };
        this.relationSearch = '';
        this.relationResults = [];
        this.loadRelations();
        this.loadIncomingRelations();
      },
      error: () => {
        this.errorMessage = 'No se pudo crear la relación';
        this.cdr.markForCheck();
      },
    });
  }

  removeRelation(relationId: string) {
    if (!this.entityId) return;

    const ok = window.confirm('¿Quitar esta relación?');
    if (!ok) return;

    this.adminApi.deleteRelation(this.entityId, relationId).subscribe({
      next: () => {
        this.loadRelations();
        this.loadIncomingRelations();
      },
      error: () => {
        this.errorMessage = 'No se pudo borrar la relación';
        this.cdr.markForCheck();
      },
    });
  }

  onContentInput() {
    const value = this.form.content ?? '';
    const textarea = this.contentTextarea?.nativeElement;

    if (!textarea) {
      this.closeLinkSuggestions();
      return;
    }

    const cursor = textarea.selectionStart ?? value.length;
    const beforeCursor = value.slice(0, cursor);

    const match = beforeCursor.match(/\[\[([^[\]]*)$/);

    if (!match) {
      this.closeLinkSuggestions();
      return;
    }

    const query = (match[1] ?? '').trim();
    const startIndex = beforeCursor.lastIndexOf('[[');

    if (query.includes(']]')) {
      this.closeLinkSuggestions();
      return;
    }

    this.linkStartIndex = startIndex;
    this.linkSearch = query;
    this.showLinkSuggestions = true;

    if (query.length < 1) {
      this.linkSuggestions = [];
      this.linkLoading = false;
      this.cdr.markForCheck();
      return;
    }

    this.linkSearch$.next(query);
  }

  insertEntityLink(entity: any) {
    const textarea = this.contentTextarea?.nativeElement;
    const value = this.form.content ?? '';

    if (!textarea || this.linkStartIndex < 0) {
      return;
    }

    const cursor = textarea.selectionStart ?? value.length;
    const before = value.slice(0, this.linkStartIndex);
    const after = value.slice(cursor);

    const inserted = `[[${entity.slug}|${entity.title}]]`;
    const nextValue = `${before}${inserted}${after}`;

    this.form.content = nextValue;
    this.closeLinkSuggestions();
    this.cdr.markForCheck();

    queueMicrotask(() => {
      if (!textarea) return;
      textarea.focus();

      const nextCursor = before.length + inserted.length;
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  }

  closeLinkSuggestions() {
    this.linkSuggestions = [];
    this.linkSearch = '';
    this.linkLoading = false;
    this.showLinkSuggestions = false;
    this.linkStartIndex = -1;
    this.cdr.markForCheck();
  }

  renderContentPreview(text: string | null | undefined): string {
  if (!text) return '';

  const escaped = text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

  const withLinks = escaped.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_match, slug, label) => {
      const safeSlug = String(slug).trim();
      const safeLabel = String(label ?? slug).trim();

      return `<a class="entity-link" data-slug="${safeSlug}">${safeLabel}</a>`;
    }
  );

  return withLinks.replace(/\n/g, '<br>');
}

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

 openPreview(slug: string) {
  this.cancelClosePreview();

  if (this.hoveredSlug === slug && (this.previewLoading || this.previewData)) {
    return;
  }

  this.hoveredSlug = slug;
  this.previewLoading = true;
  this.previewData = null;

  const requestId = ++this.previewRequestId;

  this.adminApi.previewBySlug(slug).subscribe({
    next: (data: any) => {
      // Ignora respuestas viejas
      if (requestId !== this.previewRequestId) return;

      // Si ya cambió el slug activo, ignora
      if (this.hoveredSlug !== slug) return;

      this.previewData = data;
      this.previewLoading = false;
      this.cdr.markForCheck();
    },
    error: () => {
      if (requestId !== this.previewRequestId) return;
      if (this.hoveredSlug !== slug) return;

      this.previewData = null;
      this.previewLoading = false;
      this.cdr.markForCheck();
    },
  });
}

scheduleClosePreview() {
  this.cancelClosePreview();

  this.closePreviewTimer = setTimeout(() => {
    if (this.isHoveringPreviewLink || this.isHoveringPreviewPopup) {
      return;
    }

    this.hoveredSlug = null;
    this.previewData = null;
    this.previewLoading = false;
    this.cdr.markForCheck();
  }, 120);
}

cancelClosePreview() {
  if (this.closePreviewTimer) {
    clearTimeout(this.closePreviewTimer);
    this.closePreviewTimer = null;
  }
}
}