import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AuthService } from '../../../core/auth/auth.service';

type Particle = {
  angle: number;
  radius: number;
  speed: number;
  length: number;
  width: number;
  hue: number;
  alpha: number;
};

@Component({
  standalone: true,
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  readonly i18n = inject(I18nService);
  private zone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private animationFrameId: number | null = null;
  private removeCanvasListeners: (() => void) | null = null;

  loading = false;
  error = '';

  form = this.fb.nonNullable.group({
    name: ['', [Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
  });

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    const canvas = this.canvasRef?.nativeElement;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    this.zone.runOutsideAngular(() => this.startCanvasAnimation(canvas, context));
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null && this.isBrowser)
      cancelAnimationFrame(this.animationFrameId);
    this.removeCanvasListeners?.();
  }

  submit() {
    if (this.form.invalid || this.loading) return;

    this.loading = true;
    this.error = '';

    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => void this.router.navigateByUrl('/my-space'),
      error: (err) => {
        this.loading = false;
        this.error =
          err?.status === 409
            ? this.i18n.t('auth.registerDuplicate')
            : this.i18n.t('auth.registerError');
      },
    });
  }

  private startCanvasAnimation(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): void {
    let width = 0;
    let height = 0;
    let centerX = 0;
    let centerY = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: 0, y: 0, active: false };
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const particleCount = Math.min(180, Math.max(96, Math.round(window.innerWidth / 9)));
    const particles: Particle[] = Array.from({ length: particleCount }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: Math.random(),
      speed: 0.0015 + Math.random() * 0.0028,
      length: 5 + Math.random() * 14,
      width: 1 + Math.random() * 2,
      hue: Math.random() > 0.55 ? 232 : 268,
      alpha: 0.28 + Math.random() * 0.55,
    }));

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      centerX = width * 0.5;
      centerY = height * 0.5;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      const targetX = mouse.active ? mouse.x : centerX;
      const targetY = mouse.active ? mouse.y : centerY;

      for (const particle of particles) {
        particle.angle += particle.speed;
        const radius = particle.radius * Math.max(width, height) * 0.62;
        const wave = Math.sin(particle.angle * 2.2 + particle.radius * 8) * 18;
        const x = centerX + Math.cos(particle.angle) * (radius + wave);
        const y = centerY + Math.sin(particle.angle) * (radius + wave);
        const dx = x - targetX;
        const dy = y - targetY;
        const pull = Math.max(0, 1 - Math.hypot(dx, dy) / 520);
        const finalX = x + dx * pull * 0.18;
        const finalY = y + dy * pull * 0.18;
        const tangent = particle.angle + Math.PI / 2;

        context.beginPath();
        context.moveTo(
          finalX - Math.cos(tangent) * particle.length * 0.5,
          finalY - Math.sin(tangent) * particle.length * 0.5,
        );
        context.lineTo(
          finalX + Math.cos(tangent) * particle.length * 0.5,
          finalY + Math.sin(tangent) * particle.length * 0.5,
        );
        context.lineWidth = particle.width;
        context.lineCap = 'round';
        context.strokeStyle = `hsla(${particle.hue}, 95%, 66%, ${particle.alpha})`;
        context.stroke();
      }

      this.animationFrameId = requestAnimationFrame(draw);
    };

    resize();
    if (reducedMotion) return;

    const handleMouseMove = (event: MouseEvent) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      mouse.active = true;
    };
    const handleMouseLeave = () => (mouse.active = false);
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    this.removeCanvasListeners = () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
    draw();
  }
}
