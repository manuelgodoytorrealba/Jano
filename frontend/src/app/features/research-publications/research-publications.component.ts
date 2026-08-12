import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ResearchApi } from '../../core/api/research.api';

@Component({
  standalone: true,
  imports: [AsyncPipe, DatePipe],
  templateUrl: './research-publications.component.html',
  styleUrl: './research-publications.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResearchPublicationsComponent {
  readonly publications$ = inject(ResearchApi).listPublished();
}
