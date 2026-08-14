import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ForgotPasswordComponent } from './forgot-password.component';

describe('ForgotPasswordComponent', () => {
  it('always moves to the generic success state', () => {
    const auth = { forgotPassword: vi.fn(() => of(void 0)) };
    TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: I18nService, useValue: { t: (key: string) => key } },
        { provide: ActivatedRoute, useValue: {} },
      ],
    });
    const component = TestBed.createComponent(ForgotPasswordComponent).componentInstance;
    component.form.setValue({ email: 'user@example.com' });
    component.submit();
    expect(auth.forgotPassword).toHaveBeenCalledWith('user@example.com');
    expect(component.submitted()).toBe(true);
  });
});
