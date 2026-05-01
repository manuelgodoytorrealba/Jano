import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = false;
  error = '';

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

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

    const particleCount = 220;

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

      requestAnimationFrame(draw);
    };

    resize();

    window.addEventListener('resize', resize);

    window.addEventListener('mousemove', (event) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      mouse.active = true;
    });

    window.addEventListener('mouseleave', () => {
      mouse.active = false;
    });

    draw();
  }

  submit() {
    if (this.form.invalid || this.loading) return;

    this.loading = true;
    this.error = '';

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        const redirectTo = (this.route.snapshot.queryParamMap.get('redirectTo') ?? '').trim();
        this.router.navigateByUrl(redirectTo || '/my-space');
      },
      error: (err) => {
        this.loading = false;

        if (err?.status === 403) {
          this.router.navigateByUrl('/blocked');
          return;
        }

        this.error =
          err?.status === 401
            ? 'Credenciales incorrectas'
            : 'No se pudo iniciar sesión';
      },
    });
  }
}