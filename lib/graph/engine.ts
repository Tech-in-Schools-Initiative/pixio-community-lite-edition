// ──────────────────────────────────────────────────────────────────────────
// Pixio · Node graph execution engine
// Topologically sorts the graph (Kahn's algorithm) and executes each node in
// dependency order. Inputs for a node are gathered from its connected upstream
// nodes' outputs (matched by handle data type). Failures are isolated per node:
// a failed node marks its descendants as skipped rather than aborting the run.
// ──────────────────────────────────────────────────────────────────────────

import { buildConfig } from '../prodia/config';
import { getModel } from '../prodia/catalog';
import { jobErrorMessage, runJob } from '../prodia/client';
import type { GenerationParams, ProdiaModel } from '../prodia/types';
import { getSpec, type NodeType } from './registry';
import type { GraphNode, GraphState, NodeStatus } from './store';
import type { Edge } from '@xyflow/react';

export interface RunOptions {
  getApiKey: () => string;
  params: GenerationParams;
  trackCost: boolean;
  /** Skip nodes already 'done' whose inputs haven't changed (default true). */
  useCache?: boolean;
  /** Notify the host when a node finishes (for the global gallery). */
  onNodeDone?: (node: GraphNode) => void;
}

export interface RunResult {
  ran: number;
  skipped: number;
  failed: number;
  cached: number;
}

// ── store accessors the engine needs ────────────────────────────────────────
type Store = Pick<GraphState, 'setNodeStatus' | 'updateNodeData'> & {
  getNodes: () => GraphNode[];
  getEdges: () => Edge[];
};

// ── topological ordering (Kahn) ─────────────────────────────────────────────
/**
 * Returns node ids in execution order. Nodes that participate in a cycle are
 * omitted (a well-formed media graph is acyclic). Only the subset in `scope`
 * is ordered when provided.
 */
export function topoSort(nodes: GraphNode[], edges: Edge[], scope?: Set<string>): string[] {
  const inScope = (id: string) => !scope || scope.has(id);
  const ids = nodes.filter((n) => inScope(n.id)).map((n) => n.id);
  const idSet = new Set(ids);

  const indegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const id of ids) {
    indegree.set(id, 0);
    adj.set(id, []);
  }
  for (const e of edges) {
    if (!idSet.has(e.source) || !idSet.has(e.target)) continue;
    adj.get(e.source)!.push(e.target);
    indegree.set(e.target, (indegree.get(e.target) ?? 0) + 1);
  }

  // Stable queue: preserve the node array order among ready nodes.
  const queue = ids.filter((id) => (indegree.get(id) ?? 0) === 0);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of adj.get(id) ?? []) {
      const d = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, d);
      if (d === 0) queue.push(next);
    }
  }
  return order; // nodes left out (d>0) are in cycles and are silently dropped
}

/** Walk upstream from a node, collecting it and every ancestor. */
export function ancestorScope(targetId: string, edges: Edge[]): Set<string> {
  const scope = new Set<string>([targetId]);
  const stack = [targetId];
  while (stack.length) {
    const id = stack.pop()!;
    for (const e of edges) {
      if (e.target === id && !scope.has(e.source)) {
        scope.add(e.source);
        stack.push(e.source);
      }
    }
  }
  return scope;
}

// ── per-node input resolution ───────────────────────────────────────────────
interface NodeInputs {
  /** Image data URLs by input handle id (e.g. image, mask). */
  images: Record<string, string>;
  videos: Record<string, string>;
  audios: Record<string, string>;
  /** Prompt/instruction text gathered from a connected text node. */
  text?: string;
  /** Whether every required upstream produced something usable. */
  ready: boolean;
  /** Reason it isn't ready (for the skip message). */
  reason?: string;
}

/** Produce a node's own output value (data URL) for downstream consumers. */
function outputOf(node: GraphNode): string | undefined {
  if (node.data.type === 'prompt') return node.data.text;
  if (node.data.type === 'imageInput') return node.data.source;
  if (node.data.type === 'videoInput') return node.data.source;
  if (node.data.type === 'audioInput') return node.data.source;
  return node.data.output;
}

function gatherInputs(node: GraphNode, nodes: GraphNode[], edges: Edge[]): NodeInputs {
  const spec = getSpec(node.data.type);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const images: Record<string, string> = {};
  const videos: Record<string, string> = {};
  const audios: Record<string, string> = {};
  let text: string | undefined;

  const incoming = edges.filter((e) => e.target === node.id);

  for (const port of spec.inputs) {
    const edge = incoming.find((e) => e.targetHandle === port.id);
    if (!edge) continue;
    const upstream = byId.get(edge.source);
    if (!upstream) continue;
    const value = outputOf(upstream);
    if (!value) continue;

    if (port.dataType === 'text') {
      text = value;
    } else if (port.dataType === 'image') {
      images[port.id] = value;
    } else if (port.dataType === 'video') {
      videos[port.id] = value;
    } else if (port.dataType === 'audio') {
      audios[port.id] = value;
    }
  }

  // Validate that required inputs are present for the operation.
  const reason = missingInputReason(node.data.type, images, videos, audios, text);
  return { images, videos, audios, text, ready: !reason, reason };
}

/** Returns a human reason a node can't run, or undefined when satisfied. */
function missingInputReason(
  type: NodeType,
  images: Record<string, string>,
  videos: Record<string, string>,
  audios: Record<string, string>,
  text?: string,
): string | undefined {
  switch (type) {
    case 'generate':
    case 'vectorize':
      return undefined; // prompt is optional (can fall back to params/empty)
    case 'edit':
    case 'animate':
      return images.image ? undefined : 'No input image connected';
    case 'inpaint':
      if (!images.image) return 'No input image connected';
      if (!images.mask) return 'No mask connected';
      return undefined;
    case 'upscale':
    case 'removebg':
    case 'segment':
    case 'classify':
    case 'facerestore':
      return images.image ? undefined : 'No input image connected';
    case 'vid2vid':
      return videos.video ? undefined : 'No input video connected';
    case 'aud2vid':
      return audios.audio ? undefined : 'No input audio connected';
    default:
      return undefined;
  }
}

// ── executable check ────────────────────────────────────────────────────────
const EXECUTABLE: NodeType[] = [
  'generate',
  'vectorize',
  'edit',
  'inpaint',
  'upscale',
  'removebg',
  'segment',
  'classify',
  'facerestore',
  'animate',
  'vid2vid',
  'aud2vid',
];
const isExecutable = (type: NodeType) => EXECUTABLE.indexOf(type) !== -1;

/** Build a cache signature from the inputs + model so unchanged nodes skip. */
function signature(node: GraphNode, inputs: NodeInputs): string {
  return JSON.stringify({
    m: node.data.modelId,
    t: inputs.text ?? '',
    i: inputs.images,
    v: inputs.videos,
    a: inputs.audios,
  });
}

// ── the run loop ────────────────────────────────────────────────────────────
async function executeOrder(
  order: string[],
  store: Store,
  opts: RunOptions,
): Promise<RunResult> {
  const useCache = opts.useCache !== false;
  const result: RunResult = { ran: 0, skipped: 0, failed: 0, cached: 0 };

  // Nodes whose upstream failed/skipped — their descendants are skipped too.
  const poisoned = new Set<string>();

  for (const id of order) {
    // Re-read live nodes each iteration so we see freshly-written outputs.
    const nodes = store.getNodes();
    const edges = store.getEdges();
    const node = nodes.find((n) => n.id === id);
    if (!node) continue;
    const type = node.data.type;

    // Source / sink nodes are pass-through; nothing to run.
    if (!isExecutable(type)) {
      // An output node inherits whatever its upstream produced (UI reads it
      // directly via edges, so no work needed here).
      continue;
    }

    // If any upstream is poisoned, skip this node and poison it forward.
    const upstreamPoisoned = edges.some(
      (e) => e.target === id && poisoned.has(e.source),
    );
    if (upstreamPoisoned) {
      poisoned.add(id);
      store.setNodeStatus(id, 'idle', { error: 'Skipped — upstream failed' });
      result.skipped += 1;
      continue;
    }

    const inputs = gatherInputs(node, nodes, edges);
    if (!inputs.ready) {
      poisoned.add(id);
      store.setNodeStatus(id, 'error', { error: inputs.reason });
      result.skipped += 1;
      continue;
    }

    const model = node.data.modelId ? getModel(node.data.modelId) : undefined;
    if (!model) {
      poisoned.add(id);
      store.setNodeStatus(id, 'error', { error: 'No model selected' });
      result.failed += 1;
      continue;
    }

    // Cache: skip a node that's already done with the same inputs+model.
    const sig = signature(node, inputs);
    if (useCache && node.data.status === 'done' && node.data.output && node.data._sig === sig) {
      result.cached += 1;
      continue;
    }

    try {
      store.setNodeStatus(id, 'running', { error: undefined });
      const out = await runNode(model, node, inputs, opts);
      store.setNodeStatus(id, 'done', {
        output: out.url ?? undefined,
        outputIsVideo: out.video,
        outputs: out.outputs,
        metadata: out.metadata,
        mimeType: out.mimeType,
        price: out.price?.dollars ?? null,
        error: undefined,
        rev: (node.data.rev ?? 0) + 1,
        _sig: sig,
      });
      result.ran += 1;
      const done = store.getNodes().find((n) => n.id === id);
      if (done && opts.onNodeDone) opts.onNodeDone(done);
    } catch (err) {
      poisoned.add(id);
      store.setNodeStatus(id, 'error', { error: jobErrorMessage(err) });
      result.failed += 1;
    }
  }

  return result;
}

/** Run a single Prodia job for one executable node. */
async function runNode(
  model: ProdiaModel,
  node: GraphNode,
  inputs: NodeInputs,
  opts: RunOptions,
) {
  const promptText = inputs.text;
  const config = buildConfig(model, opts.params, promptText);

  // Order inputs the way runJob expects: image first, mask second.
  const ordered: string[] = [];
  if (inputs.images.image) ordered.push(inputs.images.image);
  if (inputs.images.mask) ordered.push(inputs.images.mask);
  if (inputs.videos.video) ordered.push(inputs.videos.video);
  if (inputs.audios.audio) ordered.push(inputs.audios.audio);

  return runJob({
    type: model.type,
    config,
    inputs: ordered.length ? ordered : undefined,
    apiKey: opts.getApiKey() || undefined,
    format: opts.params.outputFormat,
    trackCost: opts.trackCost,
  });
}

// ── public API ──────────────────────────────────────────────────────────────
/** Execute the entire graph in dependency order. */
export async function runGraph(store: Store, opts: RunOptions): Promise<RunResult> {
  const order = topoSort(store.getNodes(), store.getEdges());
  return executeOrder(order, store, opts);
}

/** Execute a single node together with its upstream dependency chain. */
export async function runNodeChain(
  targetId: string,
  store: Store,
  opts: RunOptions,
): Promise<RunResult> {
  const edges = store.getEdges();
  const scope = ancestorScope(targetId, edges);
  const order = topoSort(store.getNodes(), edges, scope);
  return executeOrder(order, store, opts);
}
