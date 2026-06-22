import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/auth/auth.service';

describe('LoginComponent', () => {
  it('redirects to the requested url after a successful login', () => {
    const auth = {
      login: vi.fn(() =>
        of({
          accessToken: 'token',
          user: { id: '1', email: 'admin@test.com', name: null, role: 'ADMIN', isBeta: true },
        }),
      ),
    };
    const router = {
      navigateByUrl: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({ redirectTo: '/admin/entities' }),
            },
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;

    component.form.setValue({
      email: 'admin@test.com',
      password: 'secret123',
    });

    component.submit();

    expect(auth.login).toHaveBeenCalledWith({
      email: 'admin@test.com',
      password: 'secret123',
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/admin/entities');
  });
});
