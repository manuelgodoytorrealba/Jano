/// <reference lib="webworker" />

import { GraphResponseDto } from '../../graph/graph.models';
import { createAdminGlobalGraphLayout } from './admin-global-graph-layout';

addEventListener('message', ({ data }: MessageEvent<{ id: number; graph: GraphResponseDto }>) => {
  postMessage({ id: data.id, layout: createAdminGlobalGraphLayout(data.graph) });
});
