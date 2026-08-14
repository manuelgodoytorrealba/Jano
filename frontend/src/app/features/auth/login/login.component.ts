import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { I18nService } from '../../../core/i18n/i18n.service';

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
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  readonly i18n = inject(I18nService);
  private zone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private animationFrameId: number | null = null;
  private removeCanvasListeners: (() => void) | null = null;

  loading = false;
  error = '';

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(72)]],
  });

  ngAfterViewInit() {
    if (!this.isBrowser) {
      return;
    }

    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    this.zone.runOutsideAngular(() => this.startCanvasAnimation(canvas, ctx));
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null && this.isBrowser) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.removeCanvasListeners?.();
    this.removeCanvasListeners = null;
  }

  private startCanvasAnimation(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
    let width = 0;
    let height = 0;
    let centerX = 0;
    let centerY = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const mouse = {
      x: 0,
      y: 0,
      active: false,
    };

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

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const targetX = mouse.active ? mouse.x : centerX;
      const targetY = mouse.active ? mouse.y : centerY;

      for (const p of particles) {
        p.angle += p.speed;

        const maxRadius = Math.max(width, height) * 0.62;
        const r = p.radius * maxRadius;

        const wave = Math.sin(p.angle * 2.2 + p.radius * 8) * 18;
        const x = centerX + Math.cos(p.angle) * (r + wave);
        const y = centerY + Math.sin(p.angle) * (r + wave);

        const dx = x - targetX;
        const dy = y - targetY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const pull = Math.max(0, 1 - distance / 520);
        const finalX = x + dx * pull * 0.18;
        const finalY = y + dy * pull * 0.18;

        const tangent = p.angle + Math.PI / 2;
        const startX = finalX - Math.cos(tangent) * p.length * 0.5;
        const startY = finalY - Math.sin(tangent) * p.length * 0.5;
        const endX = finalX + Math.cos(tangent) * p.length * 0.5;
        const endY = finalY + Math.sin(tangent) * p.length * 0.5;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.lineWidth = p.width;
        ctx.lineCap = 'round';
        ctx.strokeStyle = `hsla(${p.hue}, 95%, 66%, ${p.alpha})`;
        ctx.stroke();
      }

      this.animationFrameId = requestAnimationFrame(draw);
    };

    resize();

    if (reducedMotion) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

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

  submit() {
    if (this.form.invalid || this.loading) return;

    this.loading = true;
    this.error = '';

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        void this.router.navigateByUrl(this.redirectTarget());
      },
      error: (err) => {
        this.loading = false;

        this.error =
          err?.status === 401 || err?.status === 403
            ? this.i18n.t('auth.invalidCredentials')
            : this.i18n.t('auth.loginError');
      },
    });
  }

  private redirectTarget() {
    const redirectTo = (this.route.snapshot.queryParamMap.get('redirectTo') ?? '').trim();
    return redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/my-space';
  }
}
