import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GraphComponent } from '../graph/graph.component';
import { JanoMediaComponent } from '../../shared/media/jano-media.component';
import { RichTextComponent } from '../../shared/rich-text/rich-text.component';
import { mediaDisplayUrl, resolveEntityMediaItem, selectPrimaryVisualMedia } from '../../shared/media/media.utils';

type DetailFact = {
  label: string;
  value: string;
};

@Component({
  standalone: true,
  selector: 'app-entity-detail-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, RouterLink, GraphComponent, RichTextComponent, JanoMediaComponent],
  templateUrl: './entity-detail-view.component.html',
  styleUrls: ['./entity.component.scss'],
})
export class EntityDetailViewComponent {
  @Input() entity: any | null = null;
  @Input() showActions = false;
  @Input() isSaved = false;
  @Input() saveLoading = false;
  @Input() collectionsLoading = false;
  @Input() renderGraph = true;

  @Output() saveToggle = new EventEmitter<string>();
  @Output() collectionsToggle = new EventEmitter<void>();
  @Output() shareToggle = new EventEmitter<void>();

  primaryMedia(entity: any) {
    return selectPrimaryVisualMedia(entity);
  }

  detailMedia(entity: any) {
    return resolveEntityMediaItem(entity, 'detail') ?? this.primaryMedia(entity);
  }

  visualUrl(entity: any) {
    return mediaDisplayUrl(this.detailMedia(entity));
  }

  visualAlt(entity: any): string {
    return this.detailMedia(entity)?.alt || entity?.title || 'Imagen de entidad';
  }

  isArticle(entity: any): boolean {
    return entity?.type === 'ARTICLE';
  }

  articleByline(entity: any): string | null {
    const contributors = Array.isArray(entity?.contributors) ? entity.contributors : [];
    const authorish =
      contributors.find((item: any) => ['author', 'autor', 'writer', 'editor'].includes(`${item?.role ?? ''}`.trim().toLowerCase()))
      ?? contributors[0]
      ?? null;

    return authorish?.name?.trim() || null;
  }

  articleDateLabel(entity: any): string | null {
    const value = entity?.createdAt ?? null;
    if (!value) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  storySectionLabel(entity: any): string {
    return this.isArticle(entity) ? 'Artículo' : 'Ensayo';
  }

  detailHeroSubtitle(entity: any): string | null {
    const parts: string[] = [];
    const author = entity?.type === 'ARTWORK' ? this.firstRelated(entity, 'CREATED_BY')?.title : null;

    if (author) {
      parts.push(author);
    }

    if (entity?.startYear || entity?.endYear) {
      parts.push(
        entity.startYear && entity.endYear && entity.startYear !== entity.endYear
          ? `${entity.startYear}-${entity.endYear}`
          : `${entity.startYear ?? entity.endYear}`,
      );
    }

    if (entity?.type) {
      parts.push(this.entityTypeLabel(entity.type));
    }

    return parts.length ? parts.join(' · ') : null;
  }

  detailFacts(entity: any): DetailFact[] {
    if (entity?.type === 'ARTWORK' && entity.artwork) {
      return this.compactFacts([
        { label: 'Técnica', value: entity.artwork.technique },
        { label: 'Materiales', value: entity.artwork.materials },
        { label: 'Dimensiones', value: entity.artwork.dimensions },
        { label: 'Ubicación', value: entity.artwork.location },
        { label: 'Colección', value: entity.artwork.collection },
        { label: 'Estado', value: entity.artwork.state },
        { label: 'Nacionalidad autor', value: entity.artwork.authorNation },
      ]);
    }

    if (entity?.type === 'ARTIST' && entity.artist) {
      return this.compactFacts([
        { label: 'País', value: entity.artist.country },
        { label: 'Ciudad', value: entity.artist.city },
        { label: 'Nacimiento', value: entity.artist.birthYear },
        { label: 'Muerte', value: entity.artist.deathYear },
        { label: 'Disciplinas', value: entity.artist.disciplines },
        { label: 'Links', value: entity.artist.links },
      ]);
    }

    return [];
  }

  detailFactKicker(entity: any): string {
    switch (entity?.type) {
      case 'ARTWORK':
        return 'Obra';
      case 'ARTIST':
        return 'Artista';
      case 'ARTICLE':
        return 'Artículo';
      case 'CONCEPT':
        return 'Concepto';
      case 'PERIOD':
        return 'Periodo';
      default:
        return 'Ficha';
    }
  }

  detailFactTitle(entity: any): string {
    switch (entity?.type) {
      case 'ARTWORK':
        return 'Materialidad y contexto';
      case 'ARTIST':
        return 'Trayectoria esencial';
      case 'ARTICLE':
        return 'Contexto editorial';
      case 'CONCEPT':
        return 'Definición base';
      case 'PERIOD':
        return 'Marco histórico';
      default:
        return 'Información principal';
    }
  }

  detailFactSummary(entity: any): string | null {
    if (entity?.type === 'ARTICLE') {
      return this.joinFactSummary([
        this.articleByline(entity),
        entity.summary,
      ]);
    }

    if (entity?.type === 'ARTWORK' && entity.artwork) {
      return this.joinFactSummary([
        entity.artwork.technique,
        entity.artwork.materials,
        entity.artwork.dimensions,
        entity.artwork.location,
      ]);
    }

    if (entity?.type === 'ARTIST' && entity.artist) {
      return this.joinFactSummary([
        entity.artist.country,
        entity.artist.city,
        entity.artist.disciplines,
      ]);
    }

    return null;
  }

  outgoingByType(entity: any, type: string) {
    return (entity?.outgoing ?? []).filter((r: any) => r.type === type);
  }

  incomingByType(entity: any, type: string) {
    return (entity?.incoming ?? []).filter((r: any) => r.type === type);
  }

  relatedOutgoing(entity: any, type: string) {
    return this.outgoingByType(entity, type).map((r: any) => r.to);
  }

  relatedIncoming(entity: any, type: string) {
    return this.incomingByType(entity, type).map((r: any) => r.from);
  }

  firstRelated(entity: any, type: string) {
    return this.relatedOutgoing(entity, type)[0] ?? null;
  }

  relationLabel(type: string): string {
    const labels: Record<string, string> = {
      CREATED_BY: 'Creado por',
      BELONGS_TO_MOVEMENT: 'Pertenece al movimiento',
      BELONGS_TO_PERIOD: 'Pertenece al periodo',
      ABOUT_CONCEPT: 'Explora el concepto',
      LOCATED_IN: 'Ubicado en',
      RELATED_TO: 'Relacionado con',
      MENTIONS: 'Menciona',
      ASSOCIATED_WITH: 'Asociado con',
      INSPIRED_BY: 'Inspirado por',
      INFLUENCED_BY: 'Influenciado por',
      PART_OF: 'Forma parte de',
    };

    return labels[type] ?? type.replaceAll('_', ' ').toLowerCase();
  }

  relationDirectionLabel(type: string, direction: 'outgoing' | 'incoming'): string {
    if (direction === 'outgoing') {
      return this.relationLabel(type);
    }

    const incomingLabels: Record<string, string> = {
      CREATED_BY: 'Obra creada por esta entidad',
      BELONGS_TO_MOVEMENT: 'Entidad dentro de este movimiento',
      BELONGS_TO_PERIOD: 'Entidad dentro de este periodo',
      ABOUT_CONCEPT: 'Entidad relacionada con este concepto',
      LOCATED_IN: 'Entidad ubicada aquí',
      RELATED_TO: 'Relacionado con esta entidad',
      MENTIONS: 'Mencionado por',
      ASSOCIATED_WITH: 'Asociado con esta entidad',
      INSPIRED_BY: 'Inspira a',
      INFLUENCED_BY: 'Influye en',
      PART_OF: 'Incluye esta entidad',
    };

    return incomingLabels[type] ?? 'Relacionado con esta entidad';
  }

  onSave(entityId: string) {
    this.saveToggle.emit(entityId);
  }

  onCollections() {
    this.collectionsToggle.emit();
  }

  onShare() {
    this.shareToggle.emit();
  }

  private compactFacts(items: Array<{ label: string; value: any }>): DetailFact[] {
    return items
      .filter((item) => item.value !== null && item.value !== undefined && `${item.value}`.trim().length > 0)
      .map((item) => ({ label: item.label, value: `${item.value}` }));
  }

  private joinFactSummary(values: Array<any>): string | null {
    const parts = values
      .filter((value) => value !== null && value !== undefined && `${value}`.trim().length > 0)
      .map((value) => `${value}`.trim());

    return parts.length ? parts.join(' · ') : null;
  }

  private entityTypeLabel(type: string): string {
    return type
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
