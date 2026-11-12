import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { I18nService } from '../../core/i18n/i18n.service';
import { VisualSearchInputComponent } from './visual-search-input.component';

describe('visual preparation modal', () => {
  it('validates both colors and closes without clearing applied query criteria', async () => {
    const params = new BehaviorSubject(
      convertToParamMap({ mode: 'color', q: 'Dante', layers: '{"type":["ARTWORK"]}' }),
    );
    const navigate = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        { provide: ActivatedRoute, useValue: { queryParamMap: params } },
        { provide: Router, useValue: { navigate } },
        { provide: I18nService, useValue: { t: (key: string) => key } },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new VisualSearchInputComponent());
    expect(component.showColors()).toBe(true);
    expect(component.colors()).toEqual(['#254e77']);
    component.addColor();
    component.setHex(0, '#oops');
    component.setHex(1, '#123456');
    expect(component.invalidColor()).toBe(true);
    component.setHex(0, '#abcdef');
    expect(component.invalidColor()).toBe(false);
    expect(component.colors()).toEqual(['#abcdef', '#123456']);
    await component.close();
    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { mode: null }, queryParamsHandling: 'merge' }),
    );
    params.next(convertToParamMap({ mode: 'image', q: 'Dante' }));
    expect(component.showColors()).toBe(false);
  });
});
