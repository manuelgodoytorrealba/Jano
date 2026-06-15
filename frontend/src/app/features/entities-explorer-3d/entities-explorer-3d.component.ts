import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    EventEmitter,
    HostListener,
    Inject,
    Input,
    OnChanges,
    OnDestroy,
    Output,
    PLATFORM_ID,
    SimpleChanges,
    ViewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { inject } from '@angular/core';
import * as THREE from 'three';
import { I18nService } from '../../core/i18n/i18n.service';
import { ArtworkTransitionRect, EntityArtworkTransitionPayload } from '../../core/entity-route-artwork-transition.service';
import { MediaPresentation, resolveEntityMediaItem, resolveMediaPresentation } from '../../shared/media/media.utils';

type Entity = any;
type NavDirection = -1 | 1;

type CardUserData = {
    index: number;
    slug?: string;
    targetPosition?: THREE.Vector3;
    targetRotation?: THREE.Euler;
    targetScale?: number;
    targetOpacity?: number;
};

type Card3D = {
    group: THREE.Group;
    frame: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
    image: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
    glass: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
};

@Component({
    standalone: true,
    selector: 'app-entities-explorer-3d',
    templateUrl: './entities-explorer-3d.component.html',
    styleUrls: ['./entities-explorer-3d.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntitiesExplorer3dComponent
    implements AfterViewInit, OnChanges, OnDestroy {
    @Input() items: Entity[] = [];
    @Input() activeIndex = 0;
    @Input() infoOpen = true;

    @Output() activeIndexChange = new EventEmitter<number>();
    @Output() openEntity = new EventEmitter<EntityArtworkTransitionPayload>();
    @Output() requestInfoOpen = new EventEmitter<void>();
    @Output() requestInfoClose = new EventEmitter<void>();

    @ViewChild('canvasHost', { static: true })
    canvasHostRef!: ElementRef<HTMLDivElement>;

    @ViewChild('root', { static: true })
    rootRef!: ElementRef<HTMLDivElement>;

    private readonly isBrowser: boolean;
    readonly i18n = inject(I18nService);

    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;
    private raycaster = new THREE.Raycaster();
    private pointer = new THREE.Vector2();

    private animationFrameId = 0;
    private resizeObserver?: ResizeObserver;
    private canvasInteractionsAttached = false;

    private cards: Card3D[] = [];
    private raycastTargets: THREE.Mesh[] = [];

    private isDragging = false;
    private dragStartX = 0;
    private dragAccumulatedX = 0;
    private dragMoved = false;
    private hoveredIndex: number | null = null;

    private hasInitializedCenter = false;
    private wheelIntent = 0;
    private lastWheelEventAt = 0;
    private lastWheelNavigationAt = 0;
    private keyboardNavigationActive = false;

    constructor(@Inject(PLATFORM_ID) platformId: object) {
        this.isBrowser = isPlatformBrowser(platformId);
    }

    get activeItem(): Entity | null {
        return this.items[this.activeIndex] ?? null;
    }

    ngAfterViewInit(): void {
        if (!this.isBrowser) return;

        this.initScene();
        this.ensureCenteredStart();
        this.buildCards();
        this.updateCardTargets();
        this.startRenderLoop();
        this.observeResize();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (!this.isBrowser) return;

        if (changes['items']) {
            this.ensureCenteredStart();

            if (this.scene) {
                this.buildCards();
                this.updateCardTargets();
            }
        }

        if (changes['activeIndex'] && this.scene) {
            this.updateCardTargets();
        }

        if (changes['infoOpen'] && this.renderer?.domElement) {
            if (changes['infoOpen'].currentValue) {
                this.cancelCanvasInteraction();
            }

            this.syncCanvasInteractionState();
        }
    }

    ngOnDestroy(): void {
        if (!this.isBrowser) return;

        if (this.animationFrameId) {
            window.cancelAnimationFrame(this.animationFrameId);
        }

        this.resizeObserver?.disconnect();

        this.detachCanvasInteractions();

        this.disposeCards();
        this.renderer?.dispose();
    }

    openActive(): void {
        this.openIndex(this.activeIndex);
    }

    openInfoPanel(): void {
        this.requestInfoOpen.emit();
    }

    closeInfoPanel(): void {
        this.requestInfoClose.emit();
    }

    onInfoBackdropWheel(event: WheelEvent): void {
        if (!this.infoOpen) {
            return;
        }

        this.onWheel(event);
        event.stopPropagation();
    }

    private cancelCanvasInteraction(): void {
        this.isDragging = false;
        this.dragMoved = false;
        this.dragAccumulatedX = 0;
        this.wheelIntent = 0;
        this.hoveredIndex = null;
        this.renderer?.domElement?.classList.remove('is-dragging');
        this.updateCardTargets();
    }

    cleanWiki(text: string): string {
        if (!text) return '';
        return text.replace(/\[\[(.*?)\|(.*?)\]\]/g, '$2');
    }

    private ensureCenteredStart(): void {
        if (this.hasInitializedCenter || !this.items.length) return;

        const middle = Math.floor(this.items.length / 2);
        if (this.activeIndex !== middle) {
            this.activeIndexChange.emit(middle);
        }

        this.hasInitializedCenter = true;
    }

    @HostListener('window:keydown', ['$event'])
    onWindowKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Escape' && this.infoOpen) {
            event.preventDefault();
            this.closeInfoPanel();
            return;
        }

        if (!this.keyboardNavigationActive) return;
        if (this.shouldIgnoreKeyboardEvent(event)) return;

        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            this.prev();
            return;
        }

        if (event.key === 'ArrowRight') {
            event.preventDefault();
            this.next();
            return;
        }

        if (event.key === 'Home') {
            event.preventDefault();
            this.goToIndex(0);
            return;
        }

        if (event.key === 'End') {
            event.preventDefault();
            this.goToIndex(this.items.length - 1);
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            this.openActive();
        }
    }

    onMouseEnter(): void {
        this.activateExplorerFocus('hover');
    }

    onMouseLeave(): void {
        this.deactivateExplorerFocus();
    }

    private initScene(): void {
        const host = this.canvasHostRef.nativeElement;
        const width = host.clientWidth || 1200;
        const height = host.clientHeight || 700;

        this.scene = new THREE.Scene();
        this.scene.background = null;

        this.camera = new THREE.PerspectiveCamera(33, width / height, 0.1, 100);
        this.camera.position.set(0, 0.1, 11.9);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
        });

        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(width, height);

        host.innerHTML = '';
        host.appendChild(this.renderer.domElement);
        this.syncCanvasInteractionState();
    }

    private syncCanvasInteractionState(): void {
        if (!this.renderer?.domElement) return;

        this.renderer.domElement.style.pointerEvents = this.infoOpen ? 'none' : 'auto';

        if (this.infoOpen) {
            this.detachCanvasInteractions();
            return;
        }

        this.attachCanvasInteractions();
    }

    private attachCanvasInteractions(): void {
        if (!this.renderer?.domElement || this.canvasInteractionsAttached) return;

        this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
        this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
        this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
        this.renderer.domElement.addEventListener('pointerleave', this.onPointerLeave);
        this.renderer.domElement.addEventListener('wheel', this.onWheel as EventListener, {
            passive: false,
        });
        this.canvasInteractionsAttached = true;
    }

    private detachCanvasInteractions(): void {
        if (!this.renderer?.domElement || !this.canvasInteractionsAttached) return;

        this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
        this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
        this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp);
        this.renderer.domElement.removeEventListener('pointerleave', this.onPointerLeave);
        this.renderer.domElement.removeEventListener('wheel', this.onWheel as EventListener);
        this.canvasInteractionsAttached = false;
    }

    private disposeCards(): void {
        this.cards.forEach((card) => {
            card.frame.geometry.dispose();
            card.frame.material.map?.dispose();
            card.frame.material.dispose();

            card.image.geometry.dispose();
            card.image.material.map?.dispose();
            card.image.material.dispose();

            card.glass.geometry.dispose();
            card.glass.material.map?.dispose();
            card.glass.material.dispose();

            this.scene.remove(card.group);
        });

        this.cards = [];
        this.raycastTargets = [];
    }

    private createRoundedRectTexture(
        width: number,
        height: number,
        radius: number,
        fillStyle: string,
        strokeStyle?: string,
        strokeWidth = 0,
        alpha = 1,
    ): THREE.CanvasTexture {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('No se pudo crear canvas 2D');
        }

        ctx.clearRect(0, 0, width, height);
        ctx.globalAlpha = alpha;

        this.drawRoundedRect(ctx, 0, 0, width, height, radius);

        const ambient = ctx.createLinearGradient(0, 0, 0, height);
        ambient.addColorStop(0, 'rgba(255,255,255,0.22)');
        ambient.addColorStop(0.28, 'rgba(255,255,255,0.08)');
        ambient.addColorStop(0.7, 'rgba(255,255,255,0.03)');
        ambient.addColorStop(1, 'rgba(255,255,255,0.1)');

        ctx.fillStyle = fillStyle;
        ctx.fill();
        ctx.fillStyle = ambient;
        ctx.fill();

        if (strokeStyle && strokeWidth > 0) {
            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth = strokeWidth;
            ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        return texture;
    }

    private createSpecularHighlightTexture(
        width: number,
        height: number,
        radius: number,
    ): THREE.CanvasTexture {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('No se pudo crear canvas 2D');
        }

        ctx.clearRect(0, 0, width, height);

        this.drawRoundedRect(ctx, 0, 0, width, height, radius);
        ctx.clip();

        const grad = ctx.createLinearGradient(0, 0, width * 0.72, height);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(0.14, 'rgba(255,255,255,0)');
        grad.addColorStop(0.23, 'rgba(255,255,255,0.62)');
        grad.addColorStop(0.31, 'rgba(255,255,255,0.2)');
        grad.addColorStop(0.38, 'rgba(255,255,255,0.08)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        const rim = ctx.createLinearGradient(0, 0, 0, height);
        rim.addColorStop(0, 'rgba(255,255,255,0.22)');
        rim.addColorStop(0.18, 'rgba(255,255,255,0.08)');
        rim.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = rim;
        ctx.fillRect(0, 0, width, height * 0.18);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        return texture;
    }

    private createRoundedImageTexture(
        image: HTMLImageElement,
        width: number,
        height: number,
        radius: number,
        presentation: MediaPresentation,
    ): THREE.CanvasTexture {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('No se pudo crear canvas 2D');
        }

        ctx.clearRect(0, 0, width, height);

        this.drawRoundedRect(ctx, 0, 0, width, height, radius);
        ctx.clip();

        ctx.fillStyle = '#e9e3dc';
        ctx.fillRect(0, 0, width, height);

        const draw = this.resolveImagePlacement({
            imageWidth: image.width,
            imageHeight: image.height,
            width,
            height,
            presentation,
        });

        ctx.drawImage(image, draw.dx, draw.dy, draw.drawWidth, draw.drawHeight);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        return texture;
    }

    private drawRoundedRect(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number,
    ): void {
        const r = Math.min(radius, width / 2, height / 2);

        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + width - r, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + r);
        ctx.lineTo(x + width, y + height - r);
        ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
        ctx.lineTo(x + r, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    private buildCards(): void {
        this.disposeCards();

        this.items.forEach((item, index) => {
            const frameGeometry = new THREE.PlaneGeometry(2.84, 3.08, 1, 1);
            const imageGeometry = new THREE.PlaneGeometry(2.64, 2.90, 1, 1);
            const glassGeometry = new THREE.PlaneGeometry(2.74, 2.98, 1, 1);

            const frameTexture = this.createRoundedRectTexture(
                1100,
                1200,
                58,
                'rgba(255,255,255,0.08)',
                'rgba(255,255,255,0.52)',
                6,
                1,
            );

            const glassTexture = this.createSpecularHighlightTexture(1100, 1200, 54);

            const frameMaterial = new THREE.MeshBasicMaterial({
                map: frameTexture,
                transparent: true,
                opacity: 0.42,
                depthWrite: false,
            });

            const imageMaterial = new THREE.MeshBasicMaterial({
                color: new THREE.Color('#f2f2ef'),
                transparent: true,
                opacity: 1,
            });

            const glassMaterial = new THREE.MeshBasicMaterial({
                map: glassTexture,
                transparent: true,
                opacity: 0.18,
                depthWrite: false,
            });

            const frame = new THREE.Mesh(frameGeometry, frameMaterial);
            const image = new THREE.Mesh(imageGeometry, imageMaterial);
            const glass = new THREE.Mesh(glassGeometry, glassMaterial);

            const group = new THREE.Group();

            frame.position.z = -0.022;
            image.position.z = 0.02;
            glass.position.z = 0.036;

            const textureUrl = this.thumb(item);
            if (textureUrl) {
                const presentation = this.mediaPresentation(item);
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    const roundedTexture = this.createRoundedImageTexture(
                        img,
                        1100,
                        1200,
                        48,
                        presentation,
                    );
                    imageMaterial.map = roundedTexture;
                    imageMaterial.needsUpdate = true;
                };
                img.src = textureUrl;
            } else {
                imageMaterial.color = new THREE.Color('#ecece8');
            }

            group.userData = {
                index,
                slug: item?.slug,
            } satisfies CardUserData;

            image.userData = {
                index,
                slug: item?.slug,
            } satisfies CardUserData;

            group.add(frame);
            group.add(image);
            group.add(glass);

            this.scene.add(group);

            this.cards.push({
                group,
                frame,
                image,
                glass,
            });

            this.raycastTargets.push(image);
        });
    }

    private getCircularOffset(index: number, active: number, total: number): number {
        let diff = index - active;
        const half = Math.floor(total / 2);

        if (diff > half) diff -= total;
        if (diff < -half) diff += total;

        return diff;
    }

    private updateCardTargets(): void {
        const total = this.items.length;
        if (!total) return;

        const spacing = 1.4;
        const depthSpacing = 1.2;

        // Ajusta este valor para subir o bajar TODAS las cards
        const baseY = 0.2;

        // Déjalo en 0 para mantenerlas alineadas y ordenadas
        const sideYOffset = 0;

        this.cards.forEach((card, i) => {
            const offset = this.getCircularOffset(i, this.activeIndex, total);
            const abs = Math.abs(offset);

            const visible = abs <= Math.min(5, Math.floor(total / 2));
            card.group.visible = visible;

            if (!visible) return;

            const isHovered = this.hoveredIndex === i;
            const isActive = offset === 0;

            const x = offset * spacing;
            const y = baseY + (isActive ? 0 : sideYOffset);
            const z =
                -abs * depthSpacing +
                (isActive ? 1.55 : 0) +
                (isHovered ? 0.42 : 0);

            const rotY = isActive ? 0 : offset * -0.082;
            const rotZ = isActive ? 0 : offset * -0.018;

            const scaleBase = isActive ? 1.16 : Math.max(0.76, 0.94 - abs * 0.05);
            const scale = isHovered ? scaleBase + 0.04 : scaleBase;

            const opacityBase = isActive ? 1 : Math.max(0.2, 0.66 - abs * 0.095);
            const opacity = isHovered ? Math.min(1, opacityBase + 0.1) : opacityBase;

            const userData = card.group.userData as CardUserData;
            userData.targetPosition = new THREE.Vector3(x, y, z);
            userData.targetRotation = new THREE.Euler(0, rotY, rotZ);
            userData.targetScale = scale;
            userData.targetOpacity = opacity;
        });
    }

    private startRenderLoop(): void {
        const tick = () => {
            this.animationFrameId = window.requestAnimationFrame(tick);

            this.cards.forEach((card) => {
                if (!card.group.visible) return;

                const userData = card.group.userData as CardUserData;
                const targetPosition = userData.targetPosition;
                const targetRotation = userData.targetRotation;
                const targetScale = userData.targetScale;
                const targetOpacity = userData.targetOpacity;

                if (targetPosition) {
                    card.group.position.lerp(targetPosition, 0.082);
                }

                if (targetRotation) {
                    card.group.rotation.x = THREE.MathUtils.lerp(
                        card.group.rotation.x,
                        targetRotation.x,
                        0.082,
                    );
                    card.group.rotation.y = THREE.MathUtils.lerp(
                        card.group.rotation.y,
                        targetRotation.y,
                        0.082,
                    );
                    card.group.rotation.z = THREE.MathUtils.lerp(
                        card.group.rotation.z,
                        targetRotation.z,
                        0.082,
                    );
                }

                if (typeof targetScale === 'number') {
                    const next = THREE.MathUtils.lerp(card.group.scale.x, targetScale, 0.082);
                    card.group.scale.setScalar(next);
                }

                if (typeof targetOpacity === 'number') {
                    card.image.material.opacity = THREE.MathUtils.lerp(
                        card.image.material.opacity,
                        targetOpacity,
                        0.082,
                    );

                    card.frame.material.opacity = THREE.MathUtils.lerp(
                        card.frame.material.opacity,
                        targetOpacity === 1 ? 0.5 : Math.max(0.12, targetOpacity * 0.2),
                        0.082,
                    );

                    card.glass.material.opacity = THREE.MathUtils.lerp(
                        card.glass.material.opacity,
                        targetOpacity === 1 ? 0.16 : Math.max(0.05, targetOpacity * 0.08),
                        0.082,
                    );
                }
            });

            this.renderer.render(this.scene, this.camera);
        };

        tick();
    }

    private observeResize(): void {
        this.resizeObserver = new ResizeObserver(() => {
            const host = this.canvasHostRef.nativeElement;
            const width = host.clientWidth || 1200;
            const height = host.clientHeight || 700;

            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        });

        this.resizeObserver.observe(this.canvasHostRef.nativeElement);
    }

    private thumb(e: Entity): string | null {
        return this.mediaPresentation(e).src;
    }

    private mediaPresentation(entity: Entity): MediaPresentation {
        return resolveMediaPresentation(
            resolveEntityMediaItem(entity, 'explorer3d'),
            'explorer3d',
        );
    }

    private resolveImagePlacement(options: {
        imageWidth: number;
        imageHeight: number;
        width: number;
        height: number;
        presentation: MediaPresentation;
    }): { drawWidth: number; drawHeight: number; dx: number; dy: number } {
        const {
            imageWidth,
            imageHeight,
            width,
            height,
            presentation,
        } = options;

        const baseScale = presentation.objectFit === 'contain'
            ? Math.min(width / imageWidth, height / imageHeight)
            : Math.max(width / imageWidth, height / imageHeight);
        const scale = baseScale * presentation.zoom;
        const drawWidth = imageWidth * scale;
        const drawHeight = imageHeight * scale;
        const focusX = drawWidth * (presentation.focusX / 100);
        const focusY = drawHeight * (presentation.focusY / 100);

        const targetDx = width / 2 - focusX;
        const targetDy = height / 2 - focusY;

        return {
            drawWidth,
            drawHeight,
            dx: this.clampDrawOffset(targetDx, drawWidth, width),
            dy: this.clampDrawOffset(targetDy, drawHeight, height),
        };
    }

    private clampDrawOffset(offset: number, drawSize: number, viewportSize: number): number {
        if (drawSize <= viewportSize) {
            return (viewportSize - drawSize) / 2;
        }

        return THREE.MathUtils.clamp(offset, viewportSize - drawSize, 0);
    }

    private pickPlane(clientX: number, clientY: number): THREE.Intersection<THREE.Object3D>[] {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.pointer, this.camera);
        return this.raycaster.intersectObjects(this.raycastTargets, false);
    }

    private goToIndex(next: number): void {
        const total = this.items.length;
        if (!total) return;

        let circular = next;

        if (circular < 0) circular = total - 1;
        if (circular >= total) circular = 0;

        if (circular === this.activeIndex) return;

        this.activeIndexChange.emit(circular);
    }

    private next(): void {
        this.moveByDirection(1);
    }

    private prev(): void {
        this.moveByDirection(-1);
    }

    private moveByDirection(direction: NavDirection): void {
        if (!this.items.length) return;
        this.goToIndex(this.activeIndex + direction);
    }

    private openIndex(index: number): void {
        const item = this.items[index];
        const sourceBounds = this.activeCardBounds();
        const imageUrl = item ? this.thumb(item) : null;

        if (item?.slug && sourceBounds && imageUrl) {
            this.openEntity.emit({
                slug: item.slug,
                title: item.title ?? '',
                imageUrl,
                sourceBounds,
                sourceSurface: 'explorer3d',
            });
            return;
        }

        if (item?.slug && imageUrl) {
            this.openEntity.emit({
                slug: item.slug,
                title: item.title ?? '',
                imageUrl,
                sourceBounds: this.fallbackCanvasBounds(),
                sourceSurface: 'explorer3d',
            });
        }
    }

    private activeCardBounds(): ArtworkTransitionRect | null {
        const card = this.cards[this.activeIndex];
        const canvas = this.renderer?.domElement;
        if (!card || !canvas) {
            return null;
        }

        const imageMesh = card.image;
        imageMesh.updateWorldMatrix(true, false);
        const rect = canvas.getBoundingClientRect();
        const halfWidth = 1.32;
        const halfHeight = 1.45;
        const corners = [
            new THREE.Vector3(-halfWidth, halfHeight, 0),
            new THREE.Vector3(halfWidth, halfHeight, 0),
            new THREE.Vector3(halfWidth, -halfHeight, 0),
            new THREE.Vector3(-halfWidth, -halfHeight, 0),
        ];

        const projected = corners.map((corner) => {
            const point = corner.clone().applyMatrix4(imageMesh.matrixWorld).project(this.camera);
            return {
                x: ((point.x + 1) / 2) * rect.width + rect.left,
                y: ((1 - point.y) / 2) * rect.height + rect.top,
            };
        });

        const xs = projected.map((point) => point.x);
        const ys = projected.map((point) => point.y);
        const left = Math.min(...xs);
        const right = Math.max(...xs);
        const top = Math.min(...ys);
        const bottom = Math.max(...ys);

        if (!Number.isFinite(left) || !Number.isFinite(top) || right <= left || bottom <= top) {
            return null;
        }

        return {
            left,
            top,
            width: right - left,
            height: bottom - top,
        };
    }

    private fallbackCanvasBounds(): ArtworkTransitionRect {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const width = Math.min(rect.width * 0.28, 320);
        const height = width * 1.08;

        return {
            left: rect.left + (rect.width - width) / 2,
            top: rect.top + (rect.height - height) / 2,
            width,
            height,
        };
    }

    private activateExplorerFocus(source: 'hover' | 'pointer' | 'wheel'): void {
        if (!this.isBrowser) return;

        const activeElement = document.activeElement as HTMLElement | null;

        if (source === 'hover' && this.shouldPreserveExternalFocus(activeElement)) {
            return;
        }

        this.keyboardNavigationActive = true;
    }

    private deactivateExplorerFocus(): void {
        if (!this.isBrowser) return;
        this.keyboardNavigationActive = false;
    }

    private shouldIgnoreKeyboardEvent(event: KeyboardEvent): boolean {
        const target = event.target as HTMLElement | null;
        if (!target) return false;

        return !!target.closest(
            'input, textarea, select, button, a, [contenteditable=""], [contenteditable="true"]',
        );
    }

    private shouldPreserveExternalFocus(activeElement: HTMLElement | null): boolean {
        if (!activeElement || activeElement === document.body) {
            return false;
        }

        if (this.rootRef.nativeElement.contains(activeElement)) {
            return false;
        }

        return !!activeElement.closest(
            'input, textarea, select, [contenteditable=""], [contenteditable="true"]',
        );
    }

    private isTrackpadWheel(event: WheelEvent): boolean {
        if (event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL) {
            return false;
        }

        const absX = Math.abs(event.deltaX);
        const absY = Math.abs(event.deltaY);
        const hasFractionalDelta = !Number.isInteger(event.deltaX) || !Number.isInteger(event.deltaY);

        return hasFractionalDelta || (absX > 0 && absX < 24) || (absY > 0 && absY < 24);
    }

    private normalizeWheelDelta(event: WheelEvent): number {
        const multiplier =
            event.deltaMode === WheelEvent.DOM_DELTA_LINE
                ? 16
                : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
                    ? window.innerHeight
                    : 1;

        const scaledX = event.deltaX * multiplier * 0.65;
        const scaledY = event.deltaY * multiplier;

        return Math.abs(scaledX) > Math.abs(scaledY) ? scaledX : scaledY;
    }

    private trackWheelIntent(event: WheelEvent): NavDirection | null {
        const now = performance.now();
        const delta = this.normalizeWheelDelta(event);
        const isTrackpad = this.isTrackpadWheel(event);
        const threshold = isTrackpad ? 90 : 48;
        const cooldown = isTrackpad ? 260 : 140;
        const resetWindow = isTrackpad ? 180 : 120;

        if (Math.abs(delta) < 4) {
            return null;
        }

        if (now - this.lastWheelEventAt > resetWindow) {
            this.wheelIntent = 0;
        }

        if (this.wheelIntent !== 0 && Math.sign(this.wheelIntent) !== Math.sign(delta)) {
            this.wheelIntent = 0;
        }

        this.lastWheelEventAt = now;
        this.wheelIntent += delta;

        if (Math.abs(this.wheelIntent) < threshold) {
            return null;
        }

        if (now - this.lastWheelNavigationAt < cooldown) {
            this.wheelIntent = Math.sign(this.wheelIntent) * threshold;
            return null;
        }

        this.lastWheelNavigationAt = now;

        const direction = this.wheelIntent > 0 ? 1 : -1;
        this.wheelIntent = 0;
        return direction;
    }

    private onWheel = (event: WheelEvent) => {
        event.preventDefault();

        if (!this.items.length) return;
        this.activateExplorerFocus('wheel');

        const direction = this.trackWheelIntent(event);
        if (!direction) return;

        this.moveByDirection(direction);
    };

    private onPointerDown = (event: PointerEvent) => {
        if (this.infoOpen) {
            event.preventDefault();
            this.cancelCanvasInteraction();
            return;
        }

        this.activateExplorerFocus('pointer');
        this.isDragging = true;
        this.dragMoved = false;
        this.dragStartX = event.clientX;
        this.dragAccumulatedX = 0;
        this.renderer.domElement.classList.add('is-dragging');
    };

    private onPointerMove = (event: PointerEvent) => {
        if (this.infoOpen) {
            this.cancelCanvasInteraction();
            return;
        }

        const hits = this.pickPlane(event.clientX, event.clientY);
        const first = hits[0];
        this.hoveredIndex = first ? (first.object.userData as CardUserData).index : null;
        this.updateCardTargets();

        if (!this.isDragging) return;

        const delta = event.clientX - this.dragStartX;
        this.dragAccumulatedX += delta * 0.85;
        this.dragStartX = event.clientX;

        if (Math.abs(this.dragAccumulatedX) >= 52) {
            this.dragMoved = true;

            const direction = this.dragAccumulatedX < 0 ? 1 : -1;
            this.moveByDirection(direction);

            this.dragAccumulatedX = 0;
        }
    };

    private onPointerUp = (event: PointerEvent) => {
        if (this.infoOpen) {
            this.cancelCanvasInteraction();
            return;
        }

        if (!this.isDragging) return;
        this.isDragging = false;
        this.renderer.domElement.classList.remove('is-dragging');

        if (this.dragMoved) {
            this.dragMoved = false;
            return;
        }

        const hits = this.pickPlane(event.clientX, event.clientY);
        const first = hits[0];
        if (!first) return;

        const data = first.object.userData as CardUserData;

        if (data.index === this.activeIndex) {
            this.openIndex(data.index);
            return;
        }

        this.goToIndex(data.index);
    };

    private onPointerLeave = () => {
        if (this.infoOpen) {
            this.cancelCanvasInteraction();
            return;
        }

        this.isDragging = false;
        this.dragMoved = false;
        this.hoveredIndex = null;
        this.renderer.domElement.classList.remove('is-dragging');
        this.updateCardTargets();
    };
}
