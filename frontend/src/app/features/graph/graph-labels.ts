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

export function compactGraphLabel(label: string, maxLength = 26): string {
  if ((label ?? '').length <= maxLength) {
    return label;
  }

  return `${label.slice(0, maxLength - 1)}…`;
}
