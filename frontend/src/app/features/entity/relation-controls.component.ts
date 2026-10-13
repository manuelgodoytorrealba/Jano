import { entitySymbol } from '../../shared/entity-symbols';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicEntityRelationEndpoint } from '../../core/api/entities.models';
@Component({
  selector: 'app-relation-controls',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './relation-controls.component.html',
  styleUrl: './relation-controls.component.scss',
})
export class RelationControlsComponent {
  readonly endpoint = input.required<PublicEntityRelationEndpoint>();
  readonly symbol = computed(() => entitySymbol(this.endpoint().type, this.endpoint().kind));
  readonly label = input.required<string>();
}
