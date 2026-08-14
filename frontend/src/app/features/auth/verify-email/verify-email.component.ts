import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  standalone: true,
  selector: 'app-verify-email',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<main>
    <section>
      <strong>JANO</strong>
      <h1>{{ i18n.t('auth.verifyEmailTitle') }}</h1>
      <p>{{ message() }}</p>
      @if (success()) {
        <a routerLink="/home">{{ i18n.t('auth.continueToJano') }}</a>
      } @else {
        <a routerLink="/login">{{ i18n.t('auth.login') }}</a>
      }
    </section>
  </main>`,
  styles: [
    `
      main {
        min-height: var(--app-viewport-block);
        display: grid;
        place-items: center;
        padding: 24px;
        background: #050506;
        color: #e8e6e3;
      }
      section {
        width: min(430px, 100%);
        display: grid;
        gap: 18px;
        padding: 34px;
        border: 1px solid #ffffff18;
        border-radius: 18px;
        background: #121214a6;
      }
      h1,
      p {
        margin: 0;
      }
      p {
        color: #aaa;
      }
      a {
        color: #fff;
      }
    `,
  ],
})
export class VerifyEmailComponent {
  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);
  readonly success = signal(false);
  readonly message = signal(this.i18n.t('auth.verifyEmailChecking'));
  constructor() {
    const token = (this.route.snapshot.queryParamMap.get('token') ?? '').trim();
    if (!token) {
      this.message.set(this.i18n.t('auth.verifyEmailInvalid'));
      return;
    }
    this.auth.verifyEmail(token).subscribe({
      next: () => {
        this.success.set(true);
        this.message.set(this.i18n.t('auth.verifyEmailSuccess'));
        this.auth.refreshSession().subscribe({ error: () => undefined });
      },
      error: () => this.message.set(this.i18n.t('auth.verifyEmailInvalid')),
    });
  }
}
