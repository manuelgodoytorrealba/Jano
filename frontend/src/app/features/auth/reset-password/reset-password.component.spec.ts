import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ResetPasswordComponent } from './reset-password.component';

describe('ResetPasswordComponent', () => {
  it('requires matching passwords before calling the API', () => {
    const auth = { resetPassword: vi.fn(() => of(void 0)) };
    TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: I18nService, useValue: { t: (key: string) => key } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => 'reset-token' } } },
        },
      ],
    });
    const component = TestBed.createComponent(ResetPasswordComponent).componentInstance;
    component.form.setValue({ password: 'new-password', confirmPassword: 'other-password' });
    component.submit();
    expect(auth.resetPassword).not.toHaveBeenCalled();
    expect(component.error()).toBe('auth.passwordMismatch');
  });
});
