export interface GraphLabelCandidate {
  id: string;
  priority: number;
  forced?: boolean;
}

export function shouldRenderGraphLabel(options: {
  mode: 'auto' | 'always' | 'hidden';
  scale: number;
  edgeCount: number;
  highlighted: boolean;
  connectedToSelection: boolean;
}): boolean {
  if (options.mode === 'hidden') {
    return false;
  }

  if (options.mode === 'always') {
    return true;
  }

  if (options.highlighted || options.connectedToSelection) {
    return true;
  }

  if (options.edgeCount <= 8) {
    return options.scale >= 0.82;
  }

  if (options.edgeCount <= 18) {
    return options.scale >= 1.04;
  }

  return options.scale >= 1.24;
}

export function graphNodeLabelBudget(options: {
  scale: number;
  nodeCount: number;
  edgeCount: number;
}): number {
  if (options.nodeCount <= 8) {
    return options.nodeCount;
  }

  let budget = options.scale >= 1.4
    ? 11
    : options.scale >= 1.1
      ? 9
      : options.scale >= 0.9
        ? 7
        : 5;

  if (options.nodeCount >= 18) {
    budget -= 1;
  }
  if (options.nodeCount >= 28) {
    budget -= 1;
  }
  if (options.edgeCount >= 32) {
    budget -= 1;
  }

  return Math.max(4, Math.min(options.nodeCount, budget));
}

export function graphEdgeLabelBudget(options: {
  scale: number;
  edgeCount: number;
}): number {
  if (options.edgeCount <= 6) {
    return options.edgeCount;
  }

  let budget = options.scale >= 1.4
    ? 6
    : options.scale >= 1.1
      ? 5
      : options.scale >= 0.9
        ? 4
        : 3;

  if (options.edgeCount >= 16) {
    budget -= 1;
  }
  if (options.edgeCount >= 28) {
    budget -= 1;
  }
  if (options.edgeCount >= 48) {
    budget -= 1;
  }

  return Math.max(1, Math.min(options.edgeCount, budget));
}

export function selectRankedGraphLabels(candidates: GraphLabelCandidate[], budget: number): Record<string, boolean> {
  if (!candidates.length) {
    return {};
  }

  const visible: Record<string, boolean> = {};
  const forced = candidates
    .filter((candidate) => candidate.forced)
    .sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id));

  for (const candidate of forced) {
    visible[candidate.id] = true;
  }

  const remainingBudget = Math.max(0, budget - forced.length);
  if (remainingBudget === 0) {
    return visible;
  }

  const ranked = candidates
    .filter((candidate) => !candidate.forced)
    .sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id))
    .slice(0, remainingBudget);

  for (const candidate of ranked) {
    visible[candidate.id] = true;
  }

  return visible;
}

export function compactGraphLabel(label: string, maxLength = 26): string {
  if ((label ?? '').length <= maxLength) {
    return label;
  }

  return `${label.slice(0, maxLength - 1)}…`;
}
