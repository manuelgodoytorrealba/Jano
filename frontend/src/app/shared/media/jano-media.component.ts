import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import {
  EntityWithMediaLinks,
  MediaLike,
  MediaUsage,
  entityVisualUrl,
  isAbstractEntityType,
  mediaDisplayUrl,
  mediaObjectFit,
  mediaObjectPosition,
  resolveEntityMediaGallery,
  resolveEntityMediaItem,
} from './media.utils';

@Component({
  standalone: true,
  selector: 'app-jano-media',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './jano-media.component.html',
  styleUrls: ['./jano-media.component.scss'],
})
export class JanoMediaComponent {
  @Input() entity: EntityWithMediaLinks | null = null;
  @Input() media: MediaLike | null = null;
  @Input() usage: MediaUsage = 'card';
  @Input() alt: string | null = null;
  @Input() lazy = true;
  @Input() priority: 'auto' | 'high' | 'low' = 'auto';
  @Input() placeholderMode: 'auto' | 'none' = 'auto';

  get src(): string | null {
    const direct = mediaDisplayUrl(this.media);
    if (direct) {
      return direct;
    }

    const entityMedia = this.selectedEntityMedia;
    const resolved = mediaDisplayUrl(entityMedia);
    if (resolved) {
      return resolved;
    }

    if (this.placeholderMode === 'none') {
      return null;
    }

    return entityVisualUrl(this.entity, this.normalizedUsage);
  }

  get altText(): string {
    return this.alt
      ?? this.media?.alt
      ?? this.selectedEntityMedia?.alt
      ?? this.entity?.title
      ?? '';
  }

  get objectFit(): 'cover' | 'contain' {
    return mediaObjectFit(this.mediaWithPresentation, this.usage);
  }

  get objectPosition(): string {
    return mediaObjectPosition(this.mediaWithPresentation);
  }

  get loadingAttr(): 'lazy' | 'eager' {
    return this.lazy ? 'lazy' : 'eager';
  }

  get fetchPriorityAttr(): 'high' | 'low' | null {
    return this.priority === 'auto' ? null : this.priority;
  }

  get widthAttr(): number | null {
    return this.mediaWithPresentation?.width ?? null;
  }

  get heightAttr(): number | null {
    return this.mediaWithPresentation?.height ?? null;
  }

  private get normalizedUsage(): Exclude<MediaUsage, 'gallery'> {
    return this.usage === 'gallery' ? 'detail' : this.usage;
  }

  private get selectedEntityMedia(): MediaLike | null {
    if (!this.entity) {
      return null;
    }

    if (this.usage === 'gallery') {
      return resolveEntityMediaGallery(this.entity)[0] ?? null;
    }

    const media = resolveEntityMediaItem(this.entity, this.usage);
    if (media) {
      return media;
    }

    if (isAbstractEntityType(this.entity)) {
      return null;
    }

    return resolveEntityMediaItem(this.entity, 'primary');
  }

  private get mediaWithPresentation(): MediaLike | null {
    return this.media ?? this.selectedEntityMedia;
  }
}
