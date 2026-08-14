import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  it('registers and enters JANO without a second login', () => {
    const auth = { register: vi.fn(() => of({ user: { id: 'user-1' } })) };
    const router = { navigateByUrl: vi.fn() };
    TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: {} },
        { provide: I18nService, useValue: { t: (key: string) => key } },
      ],
    });
    const component = TestBed.createComponent(RegisterComponent).componentInstance;
    component.form.setValue({
      name: 'New user',
      email: 'new@example.com',
      password: 'password-123',
    });

    component.submit();

    expect(auth.register).toHaveBeenCalledWith({
      name: 'New user',
      email: 'new@example.com',
      password: 'password-123',
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/my-space');
  });
});
