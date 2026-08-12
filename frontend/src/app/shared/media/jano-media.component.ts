import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  ViewChild,
  signal,
} from '@angular/core';
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

export type JanoMediaState = 'pending' | 'decoding' | 'ready' | 'placeholder';

@Component({
  standalone: true,
  selector: 'app-jano-media',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './jano-media.component.html',
  styleUrls: ['./jano-media.component.scss'],
})
export class JanoMediaComponent implements OnChanges, AfterViewInit {
  @Input() entity: EntityWithResolvedMedia | null = null;
  @Input() media: MediaLike | null = null;
  @Input() usage: MediaUsage = 'card';
  @Input() alt: string | null = null;
  @Input() lazy = true;
  @Input() priority: 'auto' | 'high' | 'low' = 'auto';
  @Input() placeholderMode: 'auto' | 'none' = 'auto';
  private failedSrc: string | null = null;
  private activeSrc: string | null = null;
  private requestId = 0;
  private imageElement: HTMLImageElement | null = null;

  readonly state = signal<JanoMediaState>('placeholder');

  @ViewChild('image')
  set imageRef(value: ElementRef<HTMLImageElement> | undefined) {
    this.imageElement = value?.nativeElement ?? null;
    this.checkCachedImage();
  }

  ngOnChanges(): void {
    this.syncSource();
  }

  ngAfterViewInit(): void {
    this.checkCachedImage();
  }

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

  get imageRequestId(): number {
    return this.requestId;
  }

  onImageLoad(event: Event): void {
    const image = event.target as HTMLImageElement;
    const requestId = this.requestId;
    const src = this.activeSrc;

    if (!src || !this.isCurrentImage(image, requestId, src)) {
      return;
    }

    this.finishAfterDecode(image, requestId, src);
  }

  onImageError(event?: Event): void {
    const image = event?.target as HTMLImageElement | undefined;
    if (image && !this.isCurrentImage(image, this.requestId, this.activeSrc)) {
      return;
    }

    this.failedSrc = this.activeSrc ?? this.src;
    this.syncSource();
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

  private syncSource(): void {
    const nextSrc = this.src;
    if (nextSrc === this.activeSrc) {
      return;
    }

    this.activeSrc = nextSrc;
    this.requestId += 1;
    this.state.set(nextSrc ? 'pending' : 'placeholder');
    this.checkCachedImage();
  }

  private checkCachedImage(): void {
    queueMicrotask(() => {
      const image = this.imageElement;
      const src = this.activeSrc;
      const requestId = this.requestId;

      if (!image || !src || !image.complete || !image.naturalWidth) {
        return;
      }

      if (!this.isCurrentImage(image, requestId, src)) {
        return;
      }

      this.finishAfterDecode(image, requestId, src);
    });
  }

  private finishAfterDecode(image: HTMLImageElement, requestId: number, src: string): void {
    this.state.set('decoding');

    const decode = image.decode;
    if (typeof decode !== 'function') {
      this.markReady(image, requestId, src);
      return;
    }

    Promise.resolve(decode.call(image)).then(
      () => this.markReady(image, requestId, src),
      () => this.markReady(image, requestId, src),
    );
  }

  private markReady(image: HTMLImageElement, requestId: number, src: string): void {
    if (!this.isCurrentImage(image, requestId, src)) {
      return;
    }

    this.state.set('ready');
  }

  private isCurrentImage(image: HTMLImageElement, requestId: number, src: string | null): boolean {
    return (
      !!src &&
      image === this.imageElement &&
      image.dataset['mediaRequest'] === String(requestId) &&
      this.sameResource(image.currentSrc || image.src, src)
    );
  }

  private sameResource(left: string, right: string): boolean {
    if (left === right) {
      return true;
    }

    try {
      return new URL(left, document.baseURI).href === new URL(right, document.baseURI).href;
    } catch {
      return false;
    }
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
