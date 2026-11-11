import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { I18nService } from '../../core/i18n/i18n.service';
import { ArticleHeroComponent } from './article-hero.component';

describe('article cover', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('shows the selected cover and credits, and keeps articles without media readable', () => {
    TestBed.configureTestingModule({
      imports: [ArticleHeroComponent],
      providers: [{ provide: I18nService, useValue: { t: (key: string) => key } }],
    });
    const fixture = TestBed.createComponent(ArticleHeroComponent);
    fixture.componentRef.setInput('title', 'Dante');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('figure')).toBeNull();
    fixture.componentRef.setInput('media', {
      url: '/uploads/dante.jpg',
      alt: 'Dos interpretaciones de Dante',
      photoBy: 'Fundación Canal',
      license: 'Derechos reservados',
    });
    fixture.detectChanges();
    const image = fixture.nativeElement.querySelector('img');
    expect(image.getAttribute('src')).toBe('/uploads/dante.jpg');
    expect(image.getAttribute('alt')).toBe('Dos interpretaciones de Dante');
    expect(fixture.nativeElement.querySelector('figcaption').textContent).toContain(
      'Fundación Canal',
    );
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Dante');
  });
});
