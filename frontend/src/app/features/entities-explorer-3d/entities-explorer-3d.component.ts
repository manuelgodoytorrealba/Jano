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

type PlaneUserData = {
    index: number;
    slug?: string;
    targetPosition?: THREE.Vector3;
    targetRotation?: THREE.Euler;
    targetScale?: number;
    targetOpacity?: number;
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

    private planes: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshPhysicalMaterial>[] = [];
    private textureLoader = new THREE.TextureLoader();

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
        this.buildPlanes();
        this.updatePlaneTargets();
        this.startRenderLoop();
        this.observeResize();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (!this.isBrowser) return;

        if (changes['items']) {
            this.ensureCenteredStart();

            if (this.scene) {
                this.buildPlanes();
                this.updatePlaneTargets();
            }
        }

        if (changes['activeIndex'] && this.scene) {
            this.updatePlaneTargets();
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

        this.planes.forEach((plane) => {
            plane.geometry.dispose();
            plane.material.map?.dispose();
            plane.material.dispose();
            this.scene.remove(plane);
        });

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

    private buildPlanes(): void {
        this.planes.forEach((plane) => {
            plane.geometry.dispose();
            plane.material.map?.dispose();
            plane.material.dispose();
            this.scene.remove(plane);
        });

        this.planes = [];

        this.items.forEach((item, index) => {
            // Más anchas para un look más panel / premium
            const geometry = new THREE.PlaneGeometry(2.95, 3.2, 1, 1);

            const material = new THREE.MeshPhysicalMaterial({
                color: new THREE.Color('#ffffff'),
                transparent: true,
                opacity: 0.58,
                roughness: 0.08,
                metalness: 0,
                transmission: 0.9,
                thickness: 0.45,
                reflectivity: 0.35,
                clearcoat: 0.65,
                clearcoatRoughness: 0.1,
            });

            const textureUrl = this.thumb(item);
            if (textureUrl) {
                this.textureLoader.load(textureUrl, (texture: THREE.Texture) => {
                    texture.colorSpace = THREE.SRGBColorSpace;
                    material.map = texture;
                    material.needsUpdate = true;
                });
            } else {
                material.color = new THREE.Color('#ecece8');
            }

            const mesh = new THREE.Mesh(geometry, material);
            mesh.userData = {
                index,
                slug: item?.slug,
            } satisfies PlaneUserData;

            this.scene.add(mesh);
            this.planes.push(mesh);
        });
    }

    private getCircularOffset(index: number, active: number, total: number): number {
        let diff = index - active;
        const half = Math.floor(total / 2);

        if (diff > half) diff -= total;
        if (diff < -half) diff += total;

        return diff;
    }

    private updatePlaneTargets(): void {
        const total = this.items.length;
        if (!total) return;

        const spacing = 1.72;
        const depthSpacing = 1.28;

        this.planes.forEach((plane, i) => {
            const offset = this.getCircularOffset(i, this.activeIndex, total);
            const abs = Math.abs(offset);

            const visible = abs <= Math.min(5, Math.floor(total / 2));
            plane.visible = visible;

            if (!visible) return;

            const isHovered = this.hoveredIndex === i;
            const isActive = offset === 0;

            // Diagonal limpia y más viva
            const x = offset * spacing;
            const y = -offset * 0.2;
            const z =
                -abs * depthSpacing +
                (isActive ? 1.55 : 0) +
                (isHovered ? 0.95 : 0);

            // La activa casi recta. Las demás se inclinan de forma sutil.
            const rotY = isActive ? 0 : offset * -0.09;
            const rotZ = isActive ? 0 : offset * -0.022;

            const scaleBase = isActive ? 1.34 : Math.max(0.86, 1 - abs * 0.06);
            const scale = isHovered ? scaleBase + 0.1 : scaleBase;

            const opacityBase = isActive ? 1 : Math.max(0.22, 0.68 - abs * 0.1);
            const opacity = isHovered ? Math.min(1, opacityBase + 0.1) : opacityBase;

            const userData = plane.userData as PlaneUserData;
            userData.targetPosition = new THREE.Vector3(x, y, z);
            userData.targetRotation = new THREE.Euler(0, rotY, rotZ);
            userData.targetScale = scale;
            userData.targetOpacity = opacity;
        });
    }

    private startRenderLoop(): void {
        const tick = () => {
            this.animationFrameId = window.requestAnimationFrame(tick);

            this.planes.forEach((plane) => {
                if (!plane.visible) return;

                const userData = plane.userData as PlaneUserData;
                const targetPosition = userData.targetPosition;
                const targetRotation = userData.targetRotation;
                const targetScale = userData.targetScale;
                const targetOpacity = userData.targetOpacity;

                if (targetPosition) {
                    plane.position.lerp(targetPosition, 0.082);
                }

                if (targetRotation) {
                    plane.rotation.x = THREE.MathUtils.lerp(plane.rotation.x, targetRotation.x, 0.082);
                    plane.rotation.y = THREE.MathUtils.lerp(plane.rotation.y, targetRotation.y, 0.082);
                    plane.rotation.z = THREE.MathUtils.lerp(plane.rotation.z, targetRotation.z, 0.082);
                }

                if (typeof targetScale === 'number') {
                    const next = THREE.MathUtils.lerp(plane.scale.x, targetScale, 0.082);
                    plane.scale.setScalar(next);
                }

                if (typeof targetOpacity === 'number') {
                    plane.material.opacity = THREE.MathUtils.lerp(
                        plane.material.opacity,
                        targetOpacity,
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
        return this.raycaster.intersectObjects(this.planes, false);
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
    };

    private onPointerMove = (event: PointerEvent) => {
        const hits = this.pickPlane(event.clientX, event.clientY);
        const first = hits[0];
        this.hoveredIndex = first ? (first.object.userData as PlaneUserData).index : null;
        this.updatePlaneTargets();

        if (!this.isDragging) return;

        const delta = event.clientX - this.dragStartX;
        this.dragAccumulatedX += delta;
        this.dragStartX = event.clientX;

        if (Math.abs(this.dragAccumulatedX) >= 34) {
            this.dragMoved = true;

            const direction = this.dragAccumulatedX < 0 ? 1 : -1;
            this.setActiveIndex(this.activeIndex + direction);

            this.dragAccumulatedX = 0;
        }
    };

    private onPointerUp = (event: PointerEvent) => {
        if (!this.isDragging) return;
        this.isDragging = false;

        if (this.dragMoved) {
            this.dragMoved = false;
            return;
        }

        const hits = this.pickPlane(event.clientX, event.clientY);
        const first = hits[0];
        if (!first) return;

        const data = first.object.userData as PlaneUserData;

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
        this.updatePlaneTargets();
    };
}