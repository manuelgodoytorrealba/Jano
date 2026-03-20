import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    EventEmitter,
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
import * as THREE from 'three';

type Entity = any;

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

    @Output() activeIndexChange = new EventEmitter<number>();
    @Output() openEntity = new EventEmitter<string>();

    @ViewChild('canvasHost', { static: true })
    canvasHostRef!: ElementRef<HTMLDivElement>;

    private readonly isBrowser: boolean;

    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;
    private raycaster = new THREE.Raycaster();
    private pointer = new THREE.Vector2();

    private animationFrameId = 0;
    private resizeObserver?: ResizeObserver;

    private cards: Card3D[] = [];
    private raycastTargets: THREE.Mesh[] = [];

    private isDragging = false;
    private dragStartX = 0;
    private dragAccumulatedX = 0;
    private dragMoved = false;
    private hoveredIndex: number | null = null;

    private hasInitializedCenter = false;

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
    }

    ngOnDestroy(): void {
        if (!this.isBrowser) return;

        if (this.animationFrameId) {
            window.cancelAnimationFrame(this.animationFrameId);
        }

        this.resizeObserver?.disconnect();

        if (this.renderer?.domElement) {
            this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
            this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
            this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp);
            this.renderer.domElement.removeEventListener('pointerleave', this.onPointerLeave);
            this.renderer.domElement.removeEventListener('wheel', this.onWheel as EventListener);
        }

        this.disposeCards();
        this.renderer?.dispose();
    }

    openActive(): void {
        const active = this.activeItem;
        if (active?.slug) {
            this.openEntity.emit(active.slug);
        }
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

    private initScene(): void {
        const host = this.canvasHostRef.nativeElement;
        const width = host.clientWidth || 1200;
        const height = host.clientHeight || 700;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#f5f5f3');

        this.camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100);
        this.camera.position.set(0, 0.1, 11.2);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
        });

        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(width, height);

        host.innerHTML = '';
        host.appendChild(this.renderer.domElement);

        this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
        this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
        this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
        this.renderer.domElement.addEventListener('pointerleave', this.onPointerLeave);
        this.renderer.domElement.addEventListener('wheel', this.onWheel as EventListener, {
            passive: false,
        });
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

        ctx.fillStyle = fillStyle;
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
        grad.addColorStop(0.16, 'rgba(255,255,255,0)');
        grad.addColorStop(0.26, 'rgba(255,255,255,0.48)');
        grad.addColorStop(0.34, 'rgba(255,255,255,0.14)');
        grad.addColorStop(0.42, 'rgba(255,255,255,0.06)');
        grad.addColorStop(0.54, 'rgba(255,255,255,0)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

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

        const imageRatio = image.width / image.height;
        const canvasRatio = width / height;

        let drawWidth = width;
        let drawHeight = height;
        let dx = 0;
        let dy = 0;

        if (imageRatio > canvasRatio) {
            drawHeight = height;
            drawWidth = height * imageRatio;
            dx = (width - drawWidth) / 2;
        } else {
            drawWidth = width;
            drawHeight = width / imageRatio;
            dy = (height - drawHeight) / 2;
        }

        ctx.drawImage(image, dx, dy, drawWidth, drawHeight);

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
            const frameGeometry = new THREE.PlaneGeometry(3.18, 3.43, 1, 1);
            const imageGeometry = new THREE.PlaneGeometry(2.95, 3.2, 1, 1);
            const glassGeometry = new THREE.PlaneGeometry(3.08, 3.33, 1, 1);

            const frameTexture = this.createRoundedRectTexture(
                1100,
                1200,
                58,
                'rgba(255,255,255,0.16)',
                'rgba(255,255,255,0.95)',
                12,
                1,
            );

            const glassTexture = this.createSpecularHighlightTexture(1100, 1200, 54);

            const frameMaterial = new THREE.MeshBasicMaterial({
                map: frameTexture,
                transparent: true,
                opacity: 0.56,
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
                opacity: 0.24,
                depthWrite: false,
            });

            const frame = new THREE.Mesh(frameGeometry, frameMaterial);
            const image = new THREE.Mesh(imageGeometry, imageMaterial);
            const glass = new THREE.Mesh(glassGeometry, glassMaterial);

            const group = new THREE.Group();

            frame.position.z = -0.035;
            image.position.z = 0.02;
            glass.position.z = 0.055;

            const textureUrl = this.thumb(item);
            if (textureUrl) {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    const roundedTexture = this.createRoundedImageTexture(img, 1100, 1200, 48);
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

        const spacing = 1.72;
        const depthSpacing = 1.28;

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

            const rotY = isActive ? 0 : offset * -0.09;
            const rotZ = isActive ? 0 : offset * -0.022;

            const scaleBase = isActive ? 1.34 : Math.max(0.86, 1 - abs * 0.06);
            const scale = isHovered ? scaleBase + 0.045 : scaleBase;

            const opacityBase = isActive ? 1 : Math.max(0.22, 0.68 - abs * 0.1);
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
                        targetOpacity === 1 ? 0.68 : Math.max(0.2, targetOpacity * 0.3),
                        0.082,
                    );

                    card.glass.material.opacity = THREE.MathUtils.lerp(
                        card.glass.material.opacity,
                        targetOpacity === 1 ? 0.24 : Math.max(0.07, targetOpacity * 0.12),
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
        return e?.mediaLinks?.[0]?.media?.url ?? null;
    }

    private pickPlane(clientX: number, clientY: number): THREE.Intersection<THREE.Object3D>[] {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.pointer, this.camera);
        return this.raycaster.intersectObjects(this.raycastTargets, false);
    }

    private setActiveIndex(next: number): void {
        const total = this.items.length;
        if (!total) return;

        let circular = next;

        if (circular < 0) circular = total - 1;
        if (circular >= total) circular = 0;

        if (circular === this.activeIndex) return;

        this.activeIndexChange.emit(circular);
    }

    private onWheel = (event: WheelEvent) => {
        event.preventDefault();

        if (!this.items.length) return;

        const direction = event.deltaY > 0 ? 1 : -1;
        this.setActiveIndex(this.activeIndex + direction);
    };

    private onPointerDown = (event: PointerEvent) => {
        this.isDragging = true;
        this.dragMoved = false;
        this.dragStartX = event.clientX;
        this.dragAccumulatedX = 0;
        this.renderer.domElement.classList.add('is-dragging');
    };

    private onPointerMove = (event: PointerEvent) => {
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
            this.setActiveIndex(this.activeIndex + direction);

            this.dragAccumulatedX = 0;
        }
    };

    private onPointerUp = (event: PointerEvent) => {
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
            if (data.slug) {
                this.openEntity.emit(data.slug);
            }
            return;
        }

        this.setActiveIndex(data.index);
    };

    private onPointerLeave = () => {
        this.isDragging = false;
        this.dragMoved = false;
        this.hoveredIndex = null;
        this.renderer.domElement.classList.remove('is-dragging');
        this.updateCardTargets();
    };
}