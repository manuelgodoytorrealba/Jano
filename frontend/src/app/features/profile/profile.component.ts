import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  standalone: true,
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  readonly auth = inject(AuthService);

  isAdmin(user: any): boolean {
    return String(user?.role ?? '').toUpperCase() === 'ADMIN';
  }

  roleLabel(user: any): string {
    return this.isAdmin(user) ? 'Administrador' : 'Miembro';
  }
}
