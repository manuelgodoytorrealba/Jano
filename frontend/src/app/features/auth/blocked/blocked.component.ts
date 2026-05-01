import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  standalone: true,
  selector: 'app-blocked',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './blocked.component.html',
  styleUrls: ['./blocked.component.scss'],
})
export class BlockedComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
