import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import {
  EntityWithResolvedMedia,
  MediaLike,
  MediaUsage,
  entityVisualUrl,
  isAbstractEntityType,
  mediaDisplayUrl,
  resolveMediaPresentation,
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
  @Input() entity: EntityWithResolvedMedia | null = null;
  @Input() media: MediaLike | null = null;
  @Input() usage: MediaUsage = 'card';
  @Input() alt: string | null = null;
  @Input() lazy = true;
  @Input() priority: 'auto' | 'high' | 'low' = 'auto';
  @Input() placeholderMode: 'auto' | 'none' = 'auto';
  private failedSrc: string | null = null;

  get src(): string | null {
    const direct = this.mediaPresentation.src;
    if (direct && direct !== this.failedSrc) {
      return direct;
    }

    const entityMedia = this.selectedEntityMedia;
    const resolved = mediaDisplayUrl(entityMedia);
    if (resolved && resolved !== this.failedSrc) {
      return resolved;
    }

    if (this.placeholderMode === 'none') {
      return null;
    }

    const fallback = entityVisualUrl(this.entity, this.normalizedUsage);
    return fallback === this.failedSrc ? null : fallback;
  }

  onImageError(): void {
    this.failedSrc = this.src;
  }

  get altText(): string {
    return this.alt ?? this.media?.alt ?? this.selectedEntityMedia?.alt ?? this.entity?.title ?? '';
  }

  get objectFit(): 'cover' | 'contain' {
    return this.mediaPresentation.objectFit;
  }

  get objectPosition(): string {
    return this.mediaPresentation.objectPosition;
  }

  get imageTransform(): string {
    return this.mediaPresentation.imageTransform;
  }

  get imageTransformOrigin(): string {
    return this.mediaPresentation.transformOrigin;
  }

  get imageFilter(): string {
    return this.mediaPresentation.imageFilter;
  }

  get loadingAttr(): 'lazy' | 'eager' {
    return this.lazy ? 'lazy' : 'eager';
  }

  get fetchPriorityAttr(): 'high' | 'low' | null {
    return this.priority === 'auto' ? null : this.priority;
  }

  get widthAttr(): number | null {
    return this.mediaWithPresentation?.width ?? this.fallbackDimensions.width;
  }

  get heightAttr(): number | null {
    return this.mediaWithPresentation?.height ?? this.fallbackDimensions.height;
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

  private get mediaPresentation() {
    return resolveMediaPresentation(this.mediaWithPresentation, this.usage);
  }

  private get fallbackDimensions(): { width: number; height: number } {
    switch (this.usage) {
      case 'hero':
        return { width: 1440, height: 1440 };
      case 'detail':
      case 'gallery':
        return { width: 1200, height: 900 };
      case 'thumbnail':
        return { width: 320, height: 320 };
      case 'explorer3d':
        return { width: 1024, height: 1024 };
      case 'primary':
      case 'card':
      default:
        return { width: 736, height: 736 };
    }
  }
}
