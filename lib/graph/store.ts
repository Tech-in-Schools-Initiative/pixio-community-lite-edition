// ──────────────────────────────────────────────────────────────────────────
// Pixio · Node graph store (zustand)
// Holds the React Flow nodes/edges plus per-node runtime state, and exposes
// immutable actions for every mutation the editor performs. Persists to
// localStorage so a graph survives reloads. The execution engine reads/writes
// node runtime via setNodeStatus / updateNodeData.
// ──────────────────────────────────────────────────────────────────────────

import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import { create } from 'zustand';
import {
  getSpec,
  isValidConnection as validateConnection,
  resolveOutputDataType,
  type DataType,
  type NodeType,
} from './registry';

export const STORAGE_KEY = 'PIXIO_GRAPH';

export type NodeStatus = 'idle' | 'queued' | 'running' | 'done' | 'error';

/** The serialisable data carried by every graph node. */
export interface GraphNodeData {
  type: NodeType;
  /** Chosen Prodia model id (generate/edit/etc). Undefined for source/sink. */
  modelId?: string;
  /** Editable text for prompt nodes / inline instructions. */
  text?: string;
  /** Data URL for imageInput nodes (the uploaded/pasted source). */
  source?: string;
  /** Live execution status. */
  status: NodeStatus;
  /** Output data URL produced by the last successful run. */
  output?: string;
  outputs?: string[];
  metadata?: Record<string, unknown> | null;
  mimeType?: string;
  /** Whether the output is a video. */
  outputIsVideo?: boolean;
  /** Last error message, if status === 'error'. */
  error?: string;
  /** Exact dollar cost of the last run, if tracked. */
  price?: number | null;
  /** Bumps every time a run finishes — lets the UI react to fresh output. */
  rev?: number;
  /** Free-form label the user can rename a node to. */
  label?: string;
  [key: string]: unknown;
}

export type GraphNode = Node<GraphNodeData>;

export interface GraphState {
  nodes: GraphNode[];
  edges: Edge[];
  /** Monotonic counter used to mint unique node ids. */
  seq: number;

  // mutations ----------------------------------------------------------------
  addNode: (type: NodeType, position: { x: number; y: number }, data?: Partial<GraphNodeData>) => string;
  updateNodeData: (id: string, patch: Partial<GraphNodeData>) => void;
  removeNode: (id: string) => void;
  duplicateNode: (id: string) => void;

  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (conn: Connection) => void;
  removeEdge: (id: string) => void;

  setNodeStatus: (
    id: string,
    status: NodeStatus,
    patch?: Partial<GraphNodeData>,
  ) => void;

  isValidConnection: (conn: Connection | Edge) => boolean;

  // persistence --------------------------------------------------------------
  save: () => void;
  load: () => void;
  exportJSON: () => string;
  importJSON: (json: string) => boolean;
  clear: () => void;
  replace: (nodes: GraphNode[], edges: Edge[]) => void;
}

// ── helpers ─────────────────────────────────────────────────────────────────
const nodeTypeOf = (nodes: GraphNode[]) => (id: string): NodeType | undefined =>
  nodes.find((n) => n.id === id)?.data.type;

const modelIdOf = (nodes: GraphNode[]) => (id: string): string | undefined =>
  nodes.find((n) => n.id === id)?.data.modelId;

/** A title-cased default label for a node. */
const defaultLabel = (type: NodeType) => getSpec(type).title;

// ── store ─────────────────────────────────────────────────────────────────
export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  seq: 1,

  addNode: (type, position, data) => {
    const spec = getSpec(type);
    const id = `${type}-${get().seq}`;
    const node: GraphNode = {
      id,
      type,
      position,
      data: {
        type,
        modelId: spec.defaultModel,
        text: type === 'prompt' ? '' : undefined,
        status: 'idle',
        rev: 0,
        label: defaultLabel(type),
        ...data,
      },
    };
    set((s) => ({ nodes: [...s.nodes, node], seq: s.seq + 1 }));
    return id;
  },

  updateNodeData: (id, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
      ),
    })),

  removeNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
    })),

  duplicateNode: (id) => {
    const src = get().nodes.find((n) => n.id === id);
    if (!src) return;
    const newId = `${src.data.type}-${get().seq}`;
    const clone: GraphNode = {
      ...src,
      id: newId,
      position: { x: src.position.x + 40, y: src.position.y + 40 },
      selected: false,
      data: { ...src.data, status: 'idle', output: undefined, error: undefined, rev: 0 },
    };
    set((s) => ({ nodes: [...s.nodes, clone], seq: s.seq + 1 }));
  },

  onNodesChange: (changes) =>
    set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) as GraphNode[] })),

  onEdgesChange: (changes) =>
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges) })),

  onConnect: (conn) => {
    const { nodes, edges } = get();
    if (!validateConnection(conn, nodeTypeOf(nodes), modelIdOf(nodes))) return;

    // An input handle accepts a single upstream connection: drop any edge that
    // already targets the same input port before adding the new one.
    const pruned = edges.filter(
      (e) => !(e.target === conn.target && e.targetHandle === conn.targetHandle),
    );

    const sourceType = nodeTypeOf(nodes)(conn.source!);
    const out = sourceType ? getSpec(sourceType).outputs.find((p) => p.id === conn.sourceHandle) : undefined;
    const sourceModelId = conn.source ? modelIdOf(nodes)(conn.source) : undefined;
    const dataType: DataType = sourceType ? resolveOutputDataType(sourceType, sourceModelId) : (out?.dataType ?? 'image');

    const edge: Edge = {
      ...conn,
      id: `e-${conn.source}:${conn.sourceHandle ?? ''}-${conn.target}:${conn.targetHandle ?? ''}`,
      type: 'smoothstep',
      animated: true,
      data: { dataType },
    } as Edge;

    set({ edges: addEdge(edge, pruned) });
  },

  removeEdge: (id) => set((s) => ({ edges: s.edges.filter((e) => e.id !== id) })),

  setNodeStatus: (id, status, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, status, ...patch } }
          : n,
      ),
    })),

  isValidConnection: (conn) => {
    const { nodes } = get();
    return validateConnection(conn, nodeTypeOf(nodes), modelIdOf(nodes));
  },

  // ── persistence ───────────────────────────────────────────────────────────
  save: () => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, get().exportJSON());
    } catch {
      /* quota / private mode — ignore */
    }
  },

  load: () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) get().importJSON(raw);
    } catch {
      /* corrupt payload — ignore */
    }
  },

  exportJSON: () => {
    const { nodes, edges, seq } = get();
    // Strip volatile runtime state so the export is a clean, replayable graph,
    // but keep produced output so reopening shows the last results.
    const cleanNodes = nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: {
        type: n.data.type,
        modelId: n.data.modelId,
        text: n.data.text,
        source: n.data.source,
        output: n.data.output,
        outputs: n.data.outputs,
        metadata: n.data.metadata,
        mimeType: n.data.mimeType,
        outputIsVideo: n.data.outputIsVideo,
        label: n.data.label,
        status: n.data.output ? ('done' as NodeStatus) : ('idle' as NodeStatus),
        rev: n.data.rev ?? 0,
      },
    }));
    return JSON.stringify({ version: 1, seq, nodes: cleanNodes, edges }, null, 2);
  },

  importJSON: (json) => {
    try {
      const parsed = JSON.parse(json) as {
        nodes?: GraphNode[];
        edges?: Edge[];
        seq?: number;
      };
      if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
        return false;
      }
      const nodes: GraphNode[] = parsed.nodes.map((n) => ({
        ...n,
        data: { status: 'idle', rev: 0, ...n.data },
      }));
      // Ensure seq is past every existing id so new nodes never collide.
      let maxSeq = parsed.seq ?? 1;
      for (const n of nodes) {
        const tail = Number(n.id.split('-').pop());
        if (!Number.isNaN(tail)) maxSeq = Math.max(maxSeq, tail + 1);
      }
      set({ nodes, edges: parsed.edges, seq: maxSeq });
      return true;
    } catch {
      return false;
    }
  },

  clear: () => set({ nodes: [], edges: [], seq: 1 }),

  replace: (nodes, edges) => set({ nodes, edges }),
}));
