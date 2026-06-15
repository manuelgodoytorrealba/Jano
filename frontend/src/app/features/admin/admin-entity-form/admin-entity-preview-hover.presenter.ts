import { PublicEntityPreview } from '../../../core/api/entities.models';

export type AdminEntityPreviewHoverState = {
  hoveredSlug: string | null;
  previewData: PublicEntityPreview | null;
  previewLoading: boolean;
  isHoveringPreviewLink: boolean;
  isHoveringPreviewPopup: boolean;
  previewRequestId: number;
};

export function createAdminEntityPreviewHoverState(): AdminEntityPreviewHoverState {
  return {
    hoveredSlug: null,
    previewData: null,
    previewLoading: false,
    isHoveringPreviewLink: false,
    isHoveringPreviewPopup: false,
    previewRequestId: 0,
  };
}

export function beginAdminEntityPreviewRequest(
  state: AdminEntityPreviewHoverState,
  slug: string,
): { nextState: AdminEntityPreviewHoverState; requestId: number; shouldFetch: boolean } {
  if (state.hoveredSlug === slug && (state.previewLoading || state.previewData)) {
    return {
      nextState: state,
      requestId: state.previewRequestId,
      shouldFetch: false,
    };
  }

  const requestId = state.previewRequestId + 1;
  return {
    requestId,
    shouldFetch: true,
    nextState: {
      ...state,
      hoveredSlug: slug,
      previewData: null,
      previewLoading: true,
      previewRequestId: requestId,
    },
  };
}

export function resolveAdminEntityPreviewRequest(
  state: AdminEntityPreviewHoverState,
  input: {
    requestId: number;
    slug: string;
    previewData: PublicEntityPreview | null;
  },
): AdminEntityPreviewHoverState {
  if (input.requestId !== state.previewRequestId || state.hoveredSlug !== input.slug) {
    return state;
  }

  return {
    ...state,
    previewData: input.previewData,
    previewLoading: false,
  };
}

export function setAdminEntityPreviewLinkHover(
  state: AdminEntityPreviewHoverState,
  hovering: boolean,
): AdminEntityPreviewHoverState {
  return {
    ...state,
    isHoveringPreviewLink: hovering,
  };
}

export function setAdminEntityPreviewPopupHover(
  state: AdminEntityPreviewHoverState,
  hovering: boolean,
): AdminEntityPreviewHoverState {
  return {
    ...state,
    isHoveringPreviewPopup: hovering,
  };
}

export function shouldKeepAdminEntityPreviewOpen(
  state: AdminEntityPreviewHoverState,
): boolean {
  return state.isHoveringPreviewLink || state.isHoveringPreviewPopup;
}

export function closeAdminEntityPreview(
  state: AdminEntityPreviewHoverState,
): AdminEntityPreviewHoverState {
  return {
    ...state,
    hoveredSlug: null,
    previewData: null,
    previewLoading: false,
  };
}
