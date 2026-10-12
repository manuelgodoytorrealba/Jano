import {
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { GraphTooltip } from './graph.models';
import { positionGraphTooltip } from './graph-tooltip-position';

@Directive({ selector: '[appGraphTooltipPosition]', standalone: true })
export class GraphTooltipPositionDirective implements OnChanges, OnDestroy {
  @Input({ required: true, alias: 'appGraphTooltipPosition' }) graphTooltipPosition!: GraphTooltip;
  @Input() tooltipAnchorId: string | null = null;
  @Input() tooltipCamera = '';
  @Output() anchorHidden = new EventEmitter<void>();
  private observer?: ResizeObserver;
  private frame: number | null = null;
  private anchor?: DOMPoint;
  private resetAnchor = true;

  constructor(private readonly element: ElementRef<HTMLElement>) {}

  ngOnChanges(changes?: SimpleChanges): void {
    if (changes?.['graphTooltipPosition']) this.resetAnchor = true;
    if (typeof requestAnimationFrame === 'undefined') return;
    if (this.frame !== null) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      this.position();
    });
  }

  private position(): void {
    const card = this.element.nativeElement;
    const stage = card.closest<HTMLElement>('.graph-stage');
    const camera = stage?.querySelector<SVGGElement>('.graph-svg > g');
    const matrix = camera?.getScreenCTM();
    if (!stage || !camera || !matrix) return;
    if (this.resetAnchor) {
      this.resetAnchor = false;
      this.anchor = new DOMPoint(
        this.graphTooltipPosition.x,
        this.graphTooltipPosition.y,
      ).matrixTransform(matrix.inverse());
    }
    if (!this.observer) {
      this.observer = new ResizeObserver(() => this.ngOnChanges());
      this.observer.observe(stage);
      this.observer.observe(card);
      window.addEventListener('resize', this.resize);
      window.addEventListener('scroll', this.resize, true);
    }
    const outer = stage.getBoundingClientRect();
    const style = getComputedStyle(stage);
    const rect = {
      left: outer.left + parseFloat(style.borderLeftWidth),
      top: outer.top + parseFloat(style.borderTopWidth),
      width: outer.width - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth),
      height: outer.height - parseFloat(style.borderTopWidth) - parseFloat(style.borderBottomWidth),
    };
    const toolbar = stage.parentElement?.querySelector('.graph-panel-bar')?.getBoundingClientRect();
    const bounds = {
      left: Math.max(0, -rect.left),
      top: Math.max(0, -rect.top, toolbar ? toolbar.bottom - rect.top : 0),
      right: Math.min(rect.width, window.innerWidth - rect.left),
      bottom: Math.min(rect.height, window.innerHeight - rect.top),
    };
    const point = this.anchor!.matrixTransform(matrix);
    const x = point.x - rect.left;
    const y = point.y - rect.top;
    const attribute = this.graphTooltipPosition.kind === 'node' ? 'data-node-id' : 'data-edge-id';
    const anchorElement = [...camera.querySelectorAll(`[${attribute}]`)].find(
      (element) => element.getAttribute(attribute) === this.tooltipAnchorId,
    );
    if (
      !anchorElement ||
      x < bounds.left ||
      x > bounds.right ||
      y < Math.max(0, -rect.top) ||
      y > bounds.bottom
    ) {
      card.style.visibility = 'hidden';
      this.anchorHidden.emit();
      return;
    }
    card.style.maxWidth = `${Math.max(0, bounds.right - bounds.left - 24)}px`;
    card.style.maxHeight = `${Math.max(0, bounds.bottom - bounds.top - 24)}px`;
    const size = card.getBoundingClientRect();
    const placement = positionGraphTooltip({ x, y }, size, bounds);
    card.style.left = `${placement.left}px`;
    card.style.top = `${placement.top}px`;
    card.style.visibility = 'visible';
  }

  private readonly resize = () => this.ngOnChanges();

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.resize);
      window.removeEventListener('scroll', this.resize, true);
    }
  }
}
