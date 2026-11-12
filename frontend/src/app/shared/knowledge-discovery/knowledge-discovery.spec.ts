import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { I18nService } from '../../core/i18n/i18n.service';
import { ConnectionCardComponent } from './connection-card.component';
import { ConnectionsInviteComponent } from './connections-invite.component';
import { KnowledgeSourceComponent } from './knowledge-source.component';

const translations = { provide: I18nService, useValue: { t: (key: string) => key } };

describe('shared knowledge discovery', () => {
  it('links canonical entities, shows their summary and leaves unlinked research entries readable', () => {
    TestBed.configureTestingModule({
      imports: [ConnectionCardComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(ConnectionCardComponent);
    fixture.componentRef.setInput('title', 'La gran ola');
    fixture.componentRef.setInput('slug', 'la-gran-ola');
    fixture.componentRef.setInput('summary', 'Una ola frente al monte Fuji.');
    fixture.componentRef.setInput('image', '/uploads/wave.jpg');
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('a')?.getAttribute('href')).toBe('/entity/la-gran-ola');
    expect(root.querySelector('img')?.getAttribute('src')).toBe('/uploads/wave.jpg');
    expect(root.textContent).toContain('Una ola frente al monte Fuji.');
    fixture.componentRef.setInput('slug', null);
    fixture.componentRef.setInput('image', null);
    fixture.componentRef.setInput('summary', null);
    fixture.detectChanges();
    expect(root.querySelector('a')).toBeNull();
    expect(root.querySelector('app-jano-media')).toBeNull();
    expect(root.textContent).toContain('La gran ola');
  });

  it('keeps a connection readable and navigable when its assigned image fails', () => {
    TestBed.configureTestingModule({
      imports: [ConnectionCardComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(ConnectionCardComponent);
    fixture.componentRef.setInput('title', 'Una obra');
    fixture.componentRef.setInput('slug', 'una-obra');
    fixture.componentRef.setInput('entity', {
      id: 'work',
      slug: 'una-obra',
      title: 'Una obra',
      type: 'ARTWORK',
      resolvedMedia: { card: { url: '/uploads/missing.jpg' } },
    });
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector('img')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(root.querySelector('img')).toBeNull();
    expect(root.querySelector('a')?.getAttribute('href')).toBe('/entity/una-obra');
    expect(root.textContent).toContain('Una obra');
  });

  it('opens the map once and displays the supplied counts', () => {
    TestBed.configureTestingModule({
      imports: [ConnectionsInviteComponent],
      providers: [translations],
    });
    const fixture = TestBed.createComponent(ConnectionsInviteComponent);
    fixture.componentRef.setInput('entities', 20);
    fixture.componentRef.setInput('relations', 26);
    const open = vi.fn();
    fixture.componentInstance.open.subscribe(open);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.type).toBe('button');
    expect(button.textContent).toContain('20');
    expect(button.textContent).toContain('26');
    button.click();
    expect(open).toHaveBeenCalledOnce();
  });

  it('preserves source destinations and never turns an unsafe URL into an action', () => {
    TestBed.configureTestingModule({
      imports: [KnowledgeSourceComponent],
      providers: [translations],
    });
    const fixture = TestBed.createComponent(KnowledgeSourceComponent);
    fixture.componentRef.setInput('title', 'Catálogo del museo');
    fixture.componentRef.setInput('url', 'https://museum.example/catalogue?page=2#work');
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const link = root.querySelector('a')!;
    expect(link.href).toBe('https://museum.example/catalogue?page=2#work');
    expect(link.rel).toBe('noopener noreferrer');
    expect(link.target).toBe('_blank');
    fixture.componentRef.setInput('url', 'javascript:alert(1)');
    fixture.detectChanges();
    expect(root.querySelector('a')).toBeNull();
    expect(root.textContent).toContain('Catálogo del museo');
  });
});
