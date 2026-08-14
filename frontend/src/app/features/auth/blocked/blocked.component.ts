import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { I18nService } from '../../../core/i18n/i18n.service';

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
  readonly i18n = inject(I18nService);

  logout() {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
