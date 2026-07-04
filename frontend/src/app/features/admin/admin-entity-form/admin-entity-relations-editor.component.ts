import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AdminEntitiesApi,
  AdminEntityRelationRecord,
  AdminEntitySearchListItem,
} from '../../../core/api/admin-entities.api';
import { RelationType, RelationTypesApi } from '../../../core/api/relation-types.api';
import {
  AdminEntityRelationDraft,
  buildCreateRelationPayload,
  buildSelectedRelationSearchLabel,
  buildUpdateRelationPayload,
  canSubmitRelationDraft,
  createEmptyRelationDraft,
  filterRelationSearchResults,
  resolveRelationTypeSelection,
  shouldSearchRelationTargets,
} from './admin-entity-relations.presenter';

export type AdminEntityRelationsState = {
  relations: AdminEntityRelationRecord[];
  incomingRelations: AdminEntityRelationRecord[];
  loading: boolean;
  hasError: boolean;
};

@Component({
  standalone: true,
  selector: 'app-admin-entity-relations-editor',
  imports: [FormsModule],
  templateUrl: './admin-entity-relations-editor.component.html',
  styleUrls: ['./admin-entity-relations-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminEntityRelationsEditorComponent implements OnInit {
  private readonly adminApi = inject(AdminEntitiesApi);
  private readonly relationTypesApi = inject(RelationTypesApi);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) entityId = '';
  @Output() stateChange = new EventEmitter<AdminEntityRelationsState>();

  relationTypes: RelationType[] = [];
  relations: AdminEntityRelationRecord[] = [];
  incomingRelations: AdminEntityRelationRecord[] = [];
  relationSearch = '';
  relationResults: AdminEntitySearchListItem[] = [];
  relationLoading = false;
  relationsLoading = false;
  incomingRelationsLoading = false;
  errorMessage = '';
  newRelation: AdminEntityRelationDraft = createEmptyRelationDraft([]);

  ngOnInit(): void {
    this.loadRelationTypes();
    this.loadRelations();
    this.loadIncomingRelations();
  }

  searchRelationTargets(): void {
    const query = this.relationSearch.trim();
    if (!shouldSearchRelationTargets(query)) {
      this.relationResults = [];
      return;
    }
    this.relationLoading = true;
    this.adminApi.list({ q: query, limit: 12, page: 1, sort: 'title' }).subscribe({
      next: (response) => {
        this.relationResults = filterRelationSearchResults(
          Array.isArray(response?.items) ? response.items : [],
          this.entityId,
        );
        this.relationLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.relationResults = [];
        this.relationLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  selectRelationTarget(entity: AdminEntitySearchListItem): void {
    this.newRelation = { ...this.newRelation, toId: entity.id };
    this.relationSearch = buildSelectedRelationSearchLabel(entity);
    this.relationResults = [];
  }

  onRelationTypeChange(relationTypeId: string): void {
    this.newRelation = resolveRelationTypeSelection(
      this.relationTypes,
      relationTypeId,
      this.newRelation,
    );
  }

  addRelation(): void {
    if (!canSubmitRelationDraft(this.entityId, this.newRelation)) return;
    this.errorMessage = '';
    this.adminApi
      .createRelation(this.entityId, buildCreateRelationPayload(this.newRelation))
      .subscribe({
        next: () => {
          this.newRelation = createEmptyRelationDraft(this.relationTypes);
          this.relationSearch = '';
          this.relationResults = [];
          this.loadRelations();
          this.loadIncomingRelations();
        },
        error: () => {
          this.errorMessage = 'No se pudo crear la relación.';
          this.emitState();
        },
      });
  }

  saveRelation(relation: AdminEntityRelationRecord): void {
    this.errorMessage = '';
    this.adminApi
      .updateRelation(this.entityId, relation.id, buildUpdateRelationPayload(relation))
      .subscribe({
        next: (updated) => {
          this.relations = this.relations.map((item) => (item.id === updated.id ? updated : item));
          this.incomingRelations = this.incomingRelations.map((item) =>
            item.id === updated.id ? updated : item,
          );
          this.emitState();
        },
        error: () => {
          this.errorMessage = 'No se pudo actualizar la relación.';
          this.emitState();
        },
      });
  }

  removeRelation(relationId: string): void {
    if (!window.confirm('¿Quitar esta relación?')) return;
    const previousRelations = this.relations;
    const previousIncoming = this.incomingRelations;
    this.relations = this.relations.filter((relation) => relation.id !== relationId);
    this.incomingRelations = this.incomingRelations.filter(
      (relation) => relation.id !== relationId,
    );
    this.emitState();
    this.adminApi.deleteRelation(this.entityId, relationId).subscribe({
      error: () => {
        this.relations = previousRelations;
        this.incomingRelations = previousIncoming;
        this.errorMessage = 'No se pudo borrar la relación.';
        this.emitState();
      },
    });
  }

  private loadRelationTypes(): void {
    this.relationTypesApi.list().subscribe({
      next: (types) => {
        this.relationTypes = types;
        this.newRelation = createEmptyRelationDraft(types);
        this.cdr.markForCheck();
      },
      error: () => {
        this.relationTypes = [];
        this.cdr.markForCheck();
      },
    });
  }

  private loadRelations(): void {
    if (!this.entityId) return;
    this.relationsLoading = true;
    this.adminApi.listRelations(this.entityId).subscribe({
      next: (relations) => {
        this.relations = relations;
        this.relationsLoading = false;
        this.emitState();
      },
      error: () => {
        this.relations = [];
        this.relationsLoading = false;
        this.errorMessage = 'No se pudieron cargar las relaciones.';
        this.emitState();
      },
    });
  }

  private loadIncomingRelations(): void {
    if (!this.entityId) return;
    this.incomingRelationsLoading = true;
    this.adminApi.listIncomingRelations(this.entityId).subscribe({
      next: (relations) => {
        this.incomingRelations = relations;
        this.incomingRelationsLoading = false;
        this.emitState();
      },
      error: () => {
        this.incomingRelations = [];
        this.incomingRelationsLoading = false;
        this.errorMessage = 'No se pudieron cargar las relaciones entrantes.';
        this.emitState();
      },
    });
  }

  private emitState(): void {
    this.stateChange.emit({
      relations: [...this.relations],
      incomingRelations: [...this.incomingRelations],
      loading: this.relationsLoading || this.incomingRelationsLoading,
      hasError: !!this.errorMessage,
    });
    this.cdr.markForCheck();
  }
}
