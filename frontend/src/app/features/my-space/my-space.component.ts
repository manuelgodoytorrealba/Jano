import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { CollectionsApi } from '../../core/api/collections.api';

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

      <section class="create-box">
        <div class="create-head">
          <div>
            <h2 class="section-title">Colecciones</h2>
            <p class="section-sub">Organiza tus entities en espacios personalizados.</p>
          </div>
        </div>

        <div class="create-form">
          <input
            class="input"
            type="text"
            placeholder="Nombre de la colección"
            [value]="newCollectionName"
            (input)="newCollectionName = $any($event.target).value"
          />

          <input
            class="input"
            type="text"
            placeholder="Descripción (opcional)"
            [value]="newCollectionDescription"
            (input)="newCollectionDescription = $any($event.target).value"
          />

          <button
            class="primary"
            type="button"
            [disabled]="creating || !newCollectionName.trim()"
            (click)="createCollection()"
          >
            @if (creating) { Creando... } @else { Crear colección }
          </button>
        </div>

        @if (createError) {
          <div class="error">{{ createError }}</div>
        }
      </section>

      @if (collections$ | async; as collections) {
        @if (collections.length) {
          <div class="collections">
            @for (collection of collections; track collection.id) {
              <section class="collection-card">
                <header class="collection-head">
                  <div>
                    <div class="collection-title-row">
                      <h3 class="collection-title">{{ collection.name }}</h3>
                      @if (collection.isDefault) {
                        <span class="pill">Default</span>
                      }
                    </div>

                    @if (collection.description) {
                      <p class="collection-description">{{ collection.description }}</p>
                    }
                  </div>

                  <div class="count-pill">
                    {{ collection.items?.length ?? 0 }} items
                  </div>
                </header>

                @if ((collection.items?.length ?? 0) > 0) {
                  <section class="grid">
                    @for (item of collection.items; track item.id) {
                      <article class="card">
                        <div class="thumb" (click)="go(item.entity.slug)">
                          @if (thumb(item.entity)) {
                            <img [src]="thumb(item.entity)!" [alt]="item.entity.title" />
                          } @else {
                            <div class="ph"></div>
                          }
                        </div>

                        <div class="body">
                          <div class="title" (click)="go(item.entity.slug)">
                            {{ item.entity.title }}
                          </div>

                          <div class="summary">
                            {{ cleanWiki(item.entity.summary ?? '') }}
                          </div>

                          <div class="actions">
                            <button type="button" class="ghost" (click)="go(item.entity.slug)">
                              Ver
                            </button>
                            <button
                              type="button"
                              class="danger"
                              (click)="removeFromCollection(collection.id, item.entity.id)"
                            >
                              Quitar
                            </button>
                          </div>
                        </div>
                      </article>
                    }
                  </section>
                } @else {
                  <div class="empty">
                    <div class="empty-title">Colección vacía</div>
                    <div class="empty-sub">Añade entities desde el detalle de una obra.</div>
                  </div>
                }
              </section>
            }
          </div>
        } @else {
          <div class="empty main-empty">
            <div class="empty-title">No tienes colecciones todavía</div>
            <div class="empty-sub">Crea tu primera colección para empezar a organizar JANO.</div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .page { padding: 28px; }

    .top {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: start;
      margin-bottom: 22px;
    }

    h1 { margin: 0; }
    .muted { margin: 6px 0 0; color: #666; }

    .logout {
      height: 40px;
      padding: 0 14px;
      border-radius: 12px;
      border: 1px solid rgba(0,0,0,.10);
      background: #fff;
      cursor: pointer;
    }

    .create-box {
      border: 1px solid rgba(0,0,0,.08);
      border-radius: 20px;
      background: #fff;
      padding: 18px;
      margin-bottom: 20px;
      display: grid;
      gap: 14px;
    }

    .section-title { margin: 0; font-size: 18px; }
    .section-sub { margin: 6px 0 0; color: #666; font-size: 14px; }

    .create-form {
      display: grid;
      grid-template-columns: 1fr 1fr auto;
      gap: 10px;
    }

    .input {
      height: 44px;
      border-radius: 12px;
      border: 1px solid rgba(0,0,0,.10);
      padding: 0 12px;
      background: #fff;
      outline: none;
    }

    .primary {
      height: 44px;
      padding: 0 16px;
      border-radius: 12px;
      border: none;
      background: #111;
      color: #fff;
      cursor: pointer;
      white-space: nowrap;
    }
    .primary:disabled {
      opacity: .5;
      cursor: not-allowed;
    }

    .error {
      color: #b00020;
      font-size: 13px;
    }

    .collections {
      display: grid;
      gap: 18px;
    }

    .collection-card {
      border: 1px solid rgba(0,0,0,.08);
      border-radius: 20px;
      background: #fff;
      padding: 18px;
      display: grid;
      gap: 16px;
    }

    .collection-head {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: start;
    }

    .collection-title-row {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }

    .collection-title {
      margin: 0;
      font-size: 20px;
      letter-spacing: -0.02em;
    }

    .collection-description {
      margin: 6px 0 0;
      color: #666;
      font-size: 14px;
    }

    .pill,
    .count-pill {
      font-size: 12px;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid rgba(0,0,0,.08);
      background: rgba(255,255,255,.8);
      color: rgba(0,0,0,.72);
      width: fit-content;
    }

    .grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    }

    .card {
      border: 1px solid rgba(0,0,0,.08);
      border-radius: 18px;
      overflow: hidden;
      background: #fff;
    }

    .thumb {
      height: 180px;
      background: #f3f3f3;
      cursor: pointer;
    }

    .thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .ph {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #f2f2f2, #fafafa);
    }

    .body {
      padding: 14px;
      display: grid;
      gap: 10px;
    }

    .title {
      font-weight: 800;
      cursor: pointer;
      letter-spacing: -0.02em;
    }

    .summary {
      font-size: 13px;
      color: #666;
      line-height: 1.4;
    }

    .actions {
      display: flex;
      gap: 10px;
    }

    .ghost,
    .danger {
      height: 36px;
      padding: 0 12px;
      border-radius: 10px;
      border: 1px solid rgba(0,0,0,.10);
      background: #fff;
      cursor: pointer;
    }

    .danger {
      border-color: rgba(176,0,32,.20);
      color: #b00020;
    }

    .empty {
      border: 1px solid rgba(0,0,0,.08);
      border-radius: 18px;
      background: #fff;
      padding: 18px;
    }

    .main-empty {
      margin-top: 10px;
    }

    .empty-title { font-weight: 800; }
    .empty-sub { margin-top: 6px; color: #666; }

    @media (max-width: 860px) {
      .create-form {
        grid-template-columns: 1fr;
      }

      .collection-head {
        flex-direction: column;
      }
    }
  `],
})
export class MySpaceComponent {
  auth = inject(AuthService);
  private collectionsApi = inject(CollectionsApi);
  private router = inject(Router);

  private refresh$ = new BehaviorSubject<void>(undefined);

  newCollectionName = '';
  newCollectionDescription = '';
  creating = false;
  createError = '';

  collections$ = combineLatest([this.auth.user$, this.refresh$]).pipe(
    switchMap(([user]) => {
      if (!user) return of([]);

      return this.collectionsApi.list().pipe(
        catchError(() => of([])),
      );
    }),
  );

  thumb(e: any): string | null {
    return e?.mediaLinks?.[0]?.media?.url ?? null;
  }

  cleanWiki(text: string): string {
    return (text ?? '').replace(/\[\[(.*?)\|(.*?)\]\]/g, '$2');
  }

  createCollection() {
    const name = this.newCollectionName.trim();
    const description = this.newCollectionDescription.trim();

    if (!name || this.creating) return;

    this.creating = true;
    this.createError = '';

    this.collectionsApi.create({
      name,
      description: description || undefined,
    }).subscribe({
      next: () => {
        this.newCollectionName = '';
        this.newCollectionDescription = '';
        this.creating = false;
        this.refresh$.next();
      },
      error: (err) => {
        this.creating = false;
        this.createError = err?.error?.message ?? 'No se pudo crear la colección';
      },
    });
  }

  removeFromCollection(collectionId: string, entityId: string) {
    this.collectionsApi.removeEntity(collectionId, entityId).subscribe({
      next: () => this.refresh$.next(),
      error: () => {},
    });
  }

  go(slug: string) {
    this.router.navigate(['/entity', slug]);
  }

  logout() {
    this.auth.logout();
    this.refresh$.next();
    this.router.navigate(['/login']);
  }
}