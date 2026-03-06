import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  standalone: true,
  selector: 'app-my-space',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <h1>My Space</h1>
      <p>Welcome {{ auth.user()?.email }}</p>
      <p>Email: {{ auth.user()?.email }}</p>
      <p>Role: {{ auth.user()?.role }}</p>

      <button (click)="logout()">Logout</button>
    </section>
  `,
})
export class MySpaceComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}