import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SavedApi } from '../../core/api/saved.api';
import { BehaviorSubject, of, switchMap, catchError, combineLatest } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  standalone: true,
  selector: 'app-my-space',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe],
  template: `
    <div class="page">
      <header class="top">
        <div>
          <h1>My Space</h1>
          <p class="muted">
            @if (auth.user$ | async; as user) {
              Bienvenido, {{ user.name || user.email }}
            }
          </p>
        </div>

        <button class="logout" type="button" (click)="logout()">Salir</button>
      </header>

      @if (saved$ | async; as items) {
        @if (items.length) {
          <section class="grid">
            @for (row of items; track row.id) {
              <article class="card">
                <div class="thumb" (click)="go(row.entity.slug)">
                  @if (thumb(row.entity)) {
                    <img [src]="thumb(row.entity)!" [alt]="row.entity.title" />
                  } @else {
                    <div class="ph"></div>
                  }
                </div>

                <div class="body">
                  <div class="title" (click)="go(row.entity.slug)">{{ row.entity.title }}</div>
                  <div class="summary">{{ cleanWiki(row.entity.summary ?? '') }}</div>

                  <div class="actions">
                    <button type="button" class="ghost" (click)="go(row.entity.slug)">Ver</button>
                    <button type="button" class="danger" (click)="remove(row.entity.id)">Quitar</button>
                  </div>
                </div>
              </article>
            }
          </section>
        } @else {
          <div class="empty">
            <div class="empty-title">No tienes entities guardadas</div>
            <div class="empty-sub">Explora JANO y empieza a construir tu espacio.</div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .page{ padding:28px; }
    .top{ display:flex; justify-content:space-between; gap:16px; align-items:start; margin-bottom:18px; }
    h1{ margin:0; }
    .muted{ margin:6px 0 0; color:#666; }
    .logout{ height:40px; padding:0 14px; border-radius:12px; border:1px solid rgba(0,0,0,.10); background:#fff; cursor:pointer; }

    .grid{ display:grid; gap:12px; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); }
    .card{ border:1px solid rgba(0,0,0,.08); border-radius:18px; overflow:hidden; background:#fff; }
    .thumb{ height:180px; background:#f3f3f3; cursor:pointer; }
    .thumb img{ width:100%; height:100%; object-fit:cover; }
    .ph{ width:100%; height:100%; background:linear-gradient(135deg,#f2f2f2,#fafafa); }
    .body{ padding:14px; display:grid; gap:10px; }
    .title{ font-weight:800; cursor:pointer; }
    .summary{ font-size:13px; color:#666; line-height:1.4; }
    .actions{ display:flex; gap:10px; }
    .ghost,.danger{ height:36px; padding:0 12px; border-radius:10px; border:1px solid rgba(0,0,0,.10); background:#fff; cursor:pointer; }
    .danger{ border-color: rgba(176,0,32,.20); color:#b00020; }
    .empty{ border:1px solid rgba(0,0,0,.08); border-radius:18px; background:#fff; padding:18px; }
    .empty-title{ font-weight:800; }
    .empty-sub{ margin-top:6px; color:#666; }
  `],
})
export class MySpaceComponent {
  auth = inject(AuthService);
  private savedApi = inject(SavedApi);
  private router = inject(Router);

  private refresh$ = new BehaviorSubject<void>(undefined);

  saved$ = combineLatest([this.auth.user$, this.refresh$]).pipe(
    switchMap(([user]) => {
      if (!user) return of([]);

      return this.savedApi.list().pipe(
        catchError(() => of([]))
      );
    })
  );

  thumb(e: any): string | null {
    return e?.mediaLinks?.[0]?.media?.url ?? null;
  }

  cleanWiki(text: string): string {
    return (text ?? '').replace(/\[\[(.*?)\|(.*?)\]\]/g, '$2');
  }

  go(slug: string) {
    this.router.navigate(['/entity', slug]);
  }

  remove(entityId: string) {
    this.savedApi.remove(entityId).subscribe({
      next: () => this.refresh$.next(),
      error: () => { },
    });
  }


  logout() {
  this.auth.logout();
  this.refresh$.next();
  this.router.navigate(['/login']);
}
}