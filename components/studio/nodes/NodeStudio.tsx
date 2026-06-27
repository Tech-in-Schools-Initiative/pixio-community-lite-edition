// ──────────────────────────────────────────────────────────────────────────
// Pixio · Node Studio — the full node-workflow surface.
// A ComfyUI-grade visual editor for chaining Prodia generations. Wraps
// <ReactFlow> with a glassy command bar, an "Add node" palette, a drag-to-empty
// quick-add menu, live cost readout and the execution engine.
//
// DEFAULT EXPORT: <NodeStudio apiKey params trackCost theme onAsset? />
// ──────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type FinalConnectionState,
  type IsValidConnection,
} from '@xyflow/react';
import {
  Download,
  FolderOpen,
  Frame,
  Play,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { TOKENS, type StudioAsset, type Theme } from '../../../lib/studio/types';
import { getAccent } from '../../../lib/studio/theme';
import { useStudio } from '../../../lib/studio/store';
import type { GenerationParams } from '../../../lib/prodia/types';
import { getModel } from '../../../lib/prodia/catalog';
import {
  DATA_TYPE_COLORS,
  PALETTE_GROUPS,
  findInput,
  getSpec,
  resolveOutputDataType,
  type DataType,
  type NodeType,
} from '../../../lib/graph/registry';
import { useGraphStore, type GraphNode } from '../../../lib/graph/store';
import { runGraph, runNodeChain, type RunResult } from '../../../lib/graph/engine';
import { NodeHostContext, nodeTypes } from './NodeTypes';
import { paletteFor } from './shared';

export interface NodeStudioProps {
  apiKey: string;
  params: GenerationParams;
  trackCost: boolean;
  theme: Theme;
  onAsset?: (a: StudioAsset) => void;
  /** An image data URL handed off from another surface; dropped in as an Image node. */
  seedImage?: string | null;
}

// ── default starter graph (prompt → generate → output) ──────────────────────
function seedGraph(add: ReturnType<typeof useGraphStore.getState>['addNode'], connect: (c: Connection) => void) {
  const p = add('prompt', { x: 40, y: 140 }, { text: 'a luminous jellyfish drifting through a neon city, cinematic' });
  const g = add('generate', { x: 360, y: 110 });
  const o = add('output', { x: 700, y: 140 });
  connect({ source: p, target: g, sourceHandle: 'text', targetHandle: 'prompt' });
  connect({ source: g, target: o, sourceHandle: 'image', targetHandle: 'image' });
}

// ── inner component (needs ReactFlowProvider context) ───────────────────────
const Inner: React.FC<NodeStudioProps> = ({ apiKey, params, trackCost, theme, onAsset, seedImage }) => {
  const pal = paletteFor(theme);
  const rf = useReactFlow();
  const wrapRef = useRef<HTMLDivElement>(null);

  // store slices
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const onNodesChange = useGraphStore((s) => s.onNodesChange);
  const onEdgesChange = useGraphStore((s) => s.onEdgesChange);
  const onConnect = useGraphStore((s) => s.onConnect);
  const addNode = useGraphStore((s) => s.addNode);
  const isValidConn = useGraphStore((s) => s.isValidConnection);
  const save = useGraphStore((s) => s.save);
  const load = useGraphStore((s) => s.load);
  const clear = useGraphStore((s) => s.clear);
  const exportJSON = useGraphStore((s) => s.exportJSON);
  const importJSON = useGraphStore((s) => s.importJSON);
  const accentId = useStudio((s) => s.accent);

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; tone: 'ok' | 'err' } | null>(null);
  const [quickAdd, setQuickAdd] = useState<QuickAddState | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const seededRef = useRef(false);

  // Bootstrap: load from localStorage, else lay down a starter graph. Once.
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    load();
    // Defer the seed decision until after load() has flushed into the store.
    setTimeout(() => {
      const st = useGraphStore.getState();
      if (st.nodes.length === 0) {
        seedGraph(st.addNode, st.onConnect);
      }
      if (seedImage) {
        st.addNode('imageInput', { x: 60, y: 340 }, { source: seedImage });
      }
      window.requestAnimationFrame(() => rf.fitView({ padding: 0.2, duration: 400 }));
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flash = useCallback((text: string, tone: 'ok' | 'err' = 'ok') => {
    setToast({ text, tone });
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  // Keep the latest params/key/cost in a ref so the engine always runs fresh.
  const runEnv = useRef({ apiKey, params, trackCost });
  runEnv.current = { apiKey, params, trackCost };

  const engineStore = useMemo(
    () => ({
      getNodes: () => useGraphStore.getState().nodes,
      getEdges: () => useGraphStore.getState().edges,
      setNodeStatus: (id: string, status: any, patch?: any) =>
        useGraphStore.getState().setNodeStatus(id, status, patch),
      updateNodeData: (id: string, patch: any) =>
        useGraphStore.getState().updateNodeData(id, patch),
    }),
    [],
  );

  const emitAsset = useCallback(
    (node: GraphNode) => {
      if (!onAsset || !node.data.output) return;
      const model = node.data.modelId ? getModel(node.data.modelId) : undefined;
      onAsset({
        id: `${node.id}-${node.data.rev ?? 0}`,
        status: 'done',
        url: node.data.output,
        isVideo: !!node.data.outputIsVideo,
        outputs: node.data.outputs as string[] | undefined,
        metadata: node.data.metadata as Record<string, unknown> | null | undefined,
        mimeType: node.data.mimeType as string | undefined,
        prompt: node.data.text ?? '',
        modelType: model?.type ?? '',
        modelLabel: model?.label ?? node.data.type,
        family: model?.family ?? 'Utility',
        source: 'nodes',
        createdAt: Date.now(),
        price: node.data.price ?? null,
      });
    },
    [onAsset],
  );

  const doRun = useCallback(
    async (mode: 'graph' | 'node', targetId?: string) => {
      if (busy) return;
      setBusy(true);
      try {
        const opts = {
          getApiKey: () => runEnv.current.apiKey,
          params: runEnv.current.params,
          trackCost: runEnv.current.trackCost,
          onNodeDone: emitAsset,
        };
        const res: RunResult =
          mode === 'graph'
            ? await runGraph(engineStore, opts)
            : await runNodeChain(targetId!, engineStore, opts);
        save();
        const bits = [`${res.ran} ran`];
        if (res.cached) bits.push(`${res.cached} cached`);
        if (res.failed) bits.push(`${res.failed} failed`);
        if (res.skipped) bits.push(`${res.skipped} skipped`);
        flash(bits.join(' · '), res.failed ? 'err' : 'ok');
      } catch (err: any) {
        flash(err?.message ?? 'Run failed', 'err');
      } finally {
        setBusy(false);
      }
    },
    [busy, emitAsset, engineStore, flash, save],
  );

  // ── connect-to-empty-canvas → quick-add a compatible node ─────────────────
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, state: FinalConnectionState) => {
      if (state.isValid) return; // landed on a valid handle — RF handles it
      if (!state.fromNode || !state.fromHandle) return;
      // Only spawn from an OUTPUT (source) handle drag.
      if (state.fromHandle.type !== 'source') return;

      const sourceType = (state.fromNode as unknown as GraphNode).data?.type as NodeType | undefined;
      if (!sourceType) return;
      const handleId = state.fromHandle.id ?? undefined;
      const outType =
        sourceType === 'generate'
          ? resolveOutputDataType('generate', (state.fromNode as unknown as GraphNode).data?.modelId)
          : getSpec(sourceType).outputs.find((p) => p.id === handleId)?.dataType;
      if (!outType) return;

      const point = 'clientX' in event ? { x: event.clientX, y: event.clientY } : { x: 0, y: 0 };
      const flowPos = rf.screenToFlowPosition(point);

      setQuickAdd({
        x: point.x,
        y: point.y,
        flowPos,
        dataType: outType,
        source: state.fromNode.id,
        sourceHandle: handleId ?? null,
      });
    },
    [rf],
  );

  const addFromQuick = useCallback(
    (targetType: NodeType, targetHandle: string) => {
      if (!quickAdd) return;
      const id = addNode(targetType, quickAdd.flowPos);
      // Connect on the next tick so the node exists in the store first.
      window.setTimeout(() => {
        useGraphStore.getState().onConnect({
          source: quickAdd.source,
          sourceHandle: quickAdd.sourceHandle,
          target: id,
          targetHandle,
        });
      }, 0);
      setQuickAdd(null);
    },
    [addNode, quickAdd],
  );

  // ── palette add (places node near viewport centre) ────────────────────────
  const addAtCenter = useCallback(
    (type: NodeType) => {
      const el = wrapRef.current;
      const rect = el?.getBoundingClientRect();
      const center = rect
        ? rf.screenToFlowPosition({ x: rect.left + rect.width * 0.42, y: rect.top + rect.height * 0.4 })
        : { x: 200, y: 200 };
      // Stagger so successive adds don't stack exactly.
      const jitter = (useGraphStore.getState().seq % 5) * 26;
      addNode(type, { x: center.x + jitter, y: center.y + jitter });
    },
    [addNode, rf],
  );

  // ── export / import ───────────────────────────────────────────────────────
  const onExport = useCallback(() => {
    if (typeof document === 'undefined') return;
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pixio-graph-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    flash('Graph exported');
  }, [exportJSON, flash]);

  const onImportFile = useCallback(
    (file?: File | null) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const ok = importJSON(String(reader.result));
        if (ok) {
          flash('Graph imported');
          window.requestAnimationFrame(() => rf.fitView({ padding: 0.2, duration: 400 }));
        } else {
          flash('Invalid graph file', 'err');
        }
      };
      reader.readAsText(file);
    },
    [importJSON, flash, rf],
  );

  // ── cost + status readout ─────────────────────────────────────────────────
  const totalCost = useMemo(
    () => nodes.reduce((sum, n) => sum + (typeof n.data.price === 'number' ? n.data.price : 0), 0),
    [nodes],
  );
  const runningCount = useMemo(() => nodes.filter((n) => n.data.status === 'running').length, [nodes]);

  // colour-code edges live by their data type
  const styledEdges = useMemo<Edge[]>(
    () =>
      edges.map((e) => {
        const dt = (e.data as { dataType?: DataType } | undefined)?.dataType ?? 'image';
        const color = DATA_TYPE_COLORS[dt];
        return {
          ...e,
          style: { stroke: color, strokeWidth: 2, ...(e.style as object) },
          animated: true,
        };
      }),
    [edges],
  );

  const isValidConnection = useCallback<IsValidConnection<Edge>>(
    (edge) => isValidConn(edge as Connection),
    [isValidConn],
  );

  const host = useMemo(
    () => ({ theme, runNode: (id: string) => doRun('node', id), busy }),
    [theme, doRun, busy],
  );

  // MiniMap fills SVG via attributes, so resolve real theme colors.
  const activeAccent = useMemo(() => getAccent(accentId), [accentId]);
  const minimapColor = useCallback(
    (n: GraphNode) => (getSpec(n.data.type).category === 'transform' ? activeAccent.c2 : activeAccent.c1),
    [activeAccent],
  );
  const minimapMask = theme === 'light' ? `${activeAccent.c1}18` : `${activeAccent.c2}66`;

  return (
    <NodeHostContext.Provider value={host}>
      <div className="px-studio" ref={wrapRef} style={{ background: pal.bg, color: pal.text }}>
        {/* ── command bar ─────────────────────────────────────────────── */}
        <div className="px-bar" style={{ background: pal.panel, borderColor: pal.line }}>
          <div className="px-brand">
            <span className="px-logo" style={{ background: TOKENS.accent }}>
              <Sparkles size={14} color="#fff" />
            </span>
            <div className="px-brandtxt">
              <span className="px-brandname">Node Studio</span>
              <span className="px-brandsub" style={{ color: pal.faint }}>visual workflow</span>
            </div>
          </div>

          <div className="px-bar-actions">
            <button className="px-run" onClick={() => doRun('graph')} disabled={busy} style={{ background: TOKENS.accent }}>
              <Play size={15} /> {busy ? 'Running…' : 'Run graph'}
            </button>
            <span className="px-divider" style={{ background: pal.line }} />
            <ToolBtn pal={pal} icon={<Frame size={15} />} label="Fit" onClick={() => rf.fitView({ padding: 0.2, duration: 400 })} />
            <ToolBtn pal={pal} icon={<Save size={15} />} label="Save" onClick={() => { save(); flash('Graph saved'); }} />
            <ToolBtn pal={pal} icon={<FolderOpen size={15} />} label="Load" onClick={() => { load(); flash('Graph loaded'); window.requestAnimationFrame(() => rf.fitView({ padding: 0.2, duration: 400 })); }} />
            <ToolBtn pal={pal} icon={<Download size={15} />} label="Export" onClick={onExport} />
            <ToolBtn pal={pal} icon={<Upload size={15} />} label="Import" onClick={() => importRef.current?.click()} />
            <ToolBtn pal={pal} icon={<Trash2 size={15} />} label="Clear" tone="danger" onClick={() => { if (typeof window === 'undefined' || window.confirm('Clear the entire graph?')) { clear(); flash('Graph cleared'); } }} />
          </div>

          <div className="px-readout" style={{ borderColor: pal.line, color: pal.muted }}>
            <span><b style={{ color: pal.text }}>{nodes.length}</b> nodes</span>
            <span className="px-sep" style={{ background: pal.line }} />
            <span><b style={{ color: pal.text }}>{edges.length}</b> links</span>
            {runningCount > 0 ? (<><span className="px-sep" style={{ background: pal.line }} /><span style={{ color: TOKENS.cyan }}>{runningCount} running</span></>) : null}
            {totalCost > 0 ? (<><span className="px-sep" style={{ background: pal.line }} /><span style={{ color: TOKENS.mint }}>${totalCost.toFixed(4)}</span></>) : null}
          </div>
        </div>

        {/* ── add-node palette ───────────────────────────────────────────── */}
        <div className="px-palette" style={{ background: pal.panel, borderColor: pal.line }}>
          <div className="px-palette-title" style={{ color: pal.faint }}>Add node</div>
          {PALETTE_GROUPS.map((group) => (
            <div key={group.category} className="px-pgroup">
              <div className="px-pgroup-label" style={{ color: pal.faint }}>{group.label}</div>
              {group.types.map((t) => {
                const spec = getSpec(t);
                return (
                  <button
                    key={t}
                    className="px-padd"
                    onClick={() => addAtCenter(t)}
                    style={{ borderColor: pal.line, background: pal.field, color: pal.text }}
                  >
                    <span className="px-padd-dot" style={{ background: spec.accent, boxShadow: `0 0 8px ${spec.accent}` }} />
                    <span className="px-padd-txt">
                      <span className="px-padd-title">{spec.title}</span>
                      <span className="px-padd-sub" style={{ color: pal.faint }}>{spec.subtitle}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
          <div className="px-legend" style={{ borderColor: pal.line }}>
            <div className="px-legend-title" style={{ color: pal.faint }}>Ports</div>
            {(Object.keys(DATA_TYPE_COLORS) as DataType[]).map((dt) => (
              <div key={dt} className="px-legend-row" style={{ color: pal.muted }}>
                <span className="px-legend-dot" style={{ background: DATA_TYPE_COLORS[dt] }} />
                {dt}
              </div>
            ))}
          </div>
        </div>

        {/* ── canvas ─────────────────────────────────────────────────────── */}
        <ReactFlow
          nodes={nodes}
          edges={styledEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectEnd={onConnectEnd}
          isValidConnection={isValidConnection}
          fitView
          minZoom={0.2}
          maxZoom={2.4}
          defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
          proOptions={{ hideAttribution: true }}
          deleteKeyCode={['Backspace', 'Delete']}
          className="px-canvas"
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color={pal.lineStrong} />
          <Controls showInteractive={false} className="px-controls" />
          <MiniMap
            pannable
            zoomable
            nodeColor={minimapColor}
            nodeStrokeWidth={3}
            maskColor={minimapMask}
            style={{ background: pal.panel2, border: `1px solid ${pal.line}`, borderRadius: 12 }}
          />
        </ReactFlow>

        {/* ── quick-add menu (drag from handle to empty canvas) ──────────── */}
        {quickAdd ? (
          <QuickAddMenu state={quickAdd} pal={pal} onPick={addFromQuick} onClose={() => setQuickAdd(null)} />
        ) : null}

        {/* ── toast ──────────────────────────────────────────────────────── */}
        {toast ? (
          <div className="px-toast" style={{ background: pal.panel2, borderColor: toast.tone === 'err' ? TOKENS.danger : pal.lineStrong, color: pal.text }}>
            <span className="px-toast-dot" style={{ background: toast.tone === 'err' ? TOKENS.danger : TOKENS.mint }} />
            {toast.text}
          </div>
        ) : null}

        <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={(e) => { onImportFile(e.target.files?.[0]); e.currentTarget.value = ''; }} />
      </div>

      {/* styles + React Flow theme overrides (plain global style tag — reliable across Babel/SWC) */}
      <style dangerouslySetInnerHTML={{ __html: studioCss(pal, theme) + '\n' + globalFlowCss(pal) }} />
    </NodeHostContext.Provider>
  );
};

// ── tool button ──────────────────────────────────────────────────────────────
const ToolBtn: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  pal: ReturnType<typeof paletteFor>;
  tone?: 'danger';
}> = ({ icon, label, onClick, pal, tone }) => (
  <button
    className="px-tool"
    onClick={onClick}
    title={label}
    style={{ color: tone === 'danger' ? TOKENS.danger : pal.muted, borderColor: pal.line }}
  >
    {icon}
    <span className="px-tool-label">{label}</span>
    <style jsx>{`
      .px-tool {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 11px;
        border: 1px solid;
        border-radius: 9px;
        background: transparent;
        cursor: pointer;
        font-family: ${TOKENS.font};
        font-size: 12px;
        font-weight: 600;
        transition: background 0.14s ease, transform 0.1s ease, color 0.14s ease;
      }
      .px-tool:hover { background: rgba(255,255,255,0.06); }
      .px-tool:active { transform: scale(0.96); }
      @media (max-width: 1100px) { .px-tool-label { display: none; } }
    `}</style>
  </button>
);

// ── quick-add menu ───────────────────────────────────────────────────────────
interface QuickAddState {
  x: number;
  y: number;
  flowPos: { x: number; y: number };
  dataType: DataType;
  source: string;
  sourceHandle: string | null;
}

const QuickAddMenu: React.FC<{
  state: QuickAddState;
  pal: ReturnType<typeof paletteFor>;
  onPick: (type: NodeType, handle: string) => void;
  onClose: () => void;
}> = ({ state, pal, onPick, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc); };
  }, [onClose]);

  // every node type that has an input port accepting this data type
  const options = useMemo(() => {
    const out: { type: NodeType; handle: string }[] = [];
    PALETTE_GROUPS.forEach((g) =>
      g.types.forEach((t) => {
        const port = getSpec(t).inputs.find((p) => p.dataType === state.dataType);
        if (port) out.push({ type: t, handle: port.id });
      }),
    );
    return out;
  }, [state.dataType]);

  return (
    <div
      ref={ref}
      className="px-qa"
      style={{ left: state.x + 6, top: state.y + 6, background: pal.panel2, borderColor: pal.lineStrong }}
    >
      <div className="px-qa-head" style={{ color: pal.faint }}>
        <span className="px-qa-dot" style={{ background: DATA_TYPE_COLORS[state.dataType] }} />
        Add {state.dataType} node
      </div>
      {options.length === 0 ? (
        <div className="px-qa-empty" style={{ color: pal.faint }}>No compatible node</div>
      ) : (
        options.map(({ type, handle }) => {
          const spec = getSpec(type);
          const portLabel = findInput(type, handle)?.label ?? handle;
          return (
            <button key={type} className="px-qa-item" onClick={() => onPick(type, handle)} style={{ color: pal.text }}>
              <span className="px-qa-idot" style={{ background: spec.accent }} />
              <span className="px-qa-name">{spec.title}</span>
              <span className="px-qa-port" style={{ color: pal.faint }}>→ {portLabel}</span>
            </button>
          );
        })
      )}
      <style jsx>{`
        .px-qa {
          position: fixed;
          z-index: 60;
          min-width: 190px;
          border: 1px solid;
          border-radius: 12px;
          padding: 7px;
          box-shadow: ${TOKENS.shadow};
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          font-family: ${TOKENS.font};
          animation: px-pop 0.14s ease;
        }
        @keyframes px-pop { from { opacity: 0; transform: scale(0.96) translateY(-4px); } to { opacity: 1; transform: none; } }
        .px-qa-head { display: flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; padding: 4px 8px 7px; }
        .px-qa-dot { width: 8px; height: 8px; border-radius: 50%; }
        .px-qa-empty { font-size: 11px; padding: 6px 8px; }
        .px-qa-item {
          display: flex; align-items: center; gap: 8px; width: 100%;
          padding: 8px 9px; border: none; border-radius: 8px;
          background: transparent; cursor: pointer; text-align: left;
          font-family: ${TOKENS.font}; font-size: 12px; font-weight: 600;
          transition: background 0.12s ease;
        }
        .px-qa-item:hover { background: rgba(255,255,255,0.07); }
        .px-qa-idot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
        .px-qa-name { flex: 1; }
        .px-qa-port { font-size: 10px; font-weight: 600; }
      `}</style>
    </div>
  );
};

// ── styles ───────────────────────────────────────────────────────────────────
const studioCss = (pal: ReturnType<typeof paletteFor>, _theme: Theme) => `
  .px-studio {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 520px;
    border-radius: ${TOKENS.radius}px;
    overflow: hidden;
    font-family: ${TOKENS.font};
  }
  .px-canvas { width: 100%; height: 100%; }

  /* command bar */
  .px-bar {
    position: absolute; z-index: 20; top: 12px; left: 12px; right: 12px;
    display: flex; align-items: center; gap: 14px;
    padding: 10px 14px; border: 1px solid; border-radius: 14px;
    backdrop-filter: blur(20px) saturate(1.3); -webkit-backdrop-filter: blur(20px) saturate(1.3);
    box-shadow: ${TOKENS.shadow};
  }
  .px-brand { display: flex; align-items: center; gap: 10px; flex: none; }
  .px-logo { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 9px; box-shadow: 0 6px 18px color-mix(in srgb, var(--violet) 40%, transparent); }
  .px-brandtxt { display: flex; flex-direction: column; line-height: 1.1; }
  .px-brandname { font-size: 13px; font-weight: 800; letter-spacing: -0.01em; }
  .px-brandsub { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
  .px-bar-actions { display: flex; align-items: center; gap: 7px; flex: 1; }
  .px-run {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 16px; border: none; border-radius: 10px;
    color: #fff; font-family: ${TOKENS.font}; font-size: 12.5px; font-weight: 800;
    cursor: pointer; box-shadow: 0 8px 22px color-mix(in srgb, var(--pink) 40%, transparent);
    transition: transform 0.1s ease, filter 0.14s ease, opacity 0.14s ease;
  }
  .px-run:hover:not(:disabled) { filter: brightness(1.07); }
  .px-run:active:not(:disabled) { transform: scale(0.97); }
  .px-run:disabled { opacity: 0.7; cursor: default; }
  .px-divider { width: 1px; height: 22px; margin: 0 2px; }
  .px-readout { display: flex; align-items: center; gap: 9px; padding: 7px 12px; border: 1px solid; border-radius: 10px; font-size: 11px; font-weight: 600; white-space: nowrap; flex: none; }
  .px-readout .px-sep { width: 1px; height: 12px; }

  /* palette */
  .px-palette {
    position: absolute; z-index: 18; left: 12px; top: 78px; bottom: 12px; width: 184px;
    padding: 14px 12px; border: 1px solid; border-radius: 14px;
    overflow-y: auto;
    backdrop-filter: blur(20px) saturate(1.3); -webkit-backdrop-filter: blur(20px) saturate(1.3);
    box-shadow: ${TOKENS.shadow};
  }
  .px-palette-title { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 10px; }
  .px-pgroup { margin-bottom: 12px; }
  .px-pgroup-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; opacity: 0.8; }
  .px-padd {
    display: flex; align-items: center; gap: 9px; width: 100%;
    padding: 8px 9px; margin-bottom: 6px; border: 1px solid; border-radius: 10px;
    cursor: pointer; text-align: left; font-family: ${TOKENS.font};
    transition: transform 0.1s ease, border-color 0.14s ease, background 0.14s ease;
  }
  .px-padd:hover { transform: translateX(2px); }
  .px-padd:active { transform: scale(0.98); }
  .px-padd-dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
  .px-padd-txt { display: flex; flex-direction: column; line-height: 1.2; min-width: 0; }
  .px-padd-title { font-size: 12px; font-weight: 700; }
  .px-padd-sub { font-size: 9.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .px-legend { margin-top: 6px; padding-top: 12px; border-top: 1px solid; }
  .px-legend-title { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 7px; }
  .px-legend-row { display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 600; text-transform: capitalize; margin-bottom: 5px; }
  .px-legend-dot { width: 9px; height: 9px; border-radius: 3px; }

  /* toast */
  .px-toast {
    position: absolute; z-index: 50; bottom: 18px; left: 50%; transform: translateX(-50%);
    display: flex; align-items: center; gap: 9px;
    padding: 10px 16px; border: 1px solid; border-radius: 999px;
    font-size: 12.5px; font-weight: 600;
    box-shadow: ${TOKENS.shadow}; backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
    animation: px-toast-in 0.2s ease;
  }
  .px-toast-dot { width: 8px; height: 8px; border-radius: 50%; }
  @keyframes px-toast-in { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }

  /* responsive */
  @media (max-width: 1100px) {
    .px-palette { width: 156px; }
    .px-readout { padding: 6px 9px; }
  }
  @media (max-width: 880px) {
    .px-bar { flex-wrap: wrap; gap: 8px; padding: 8px 10px; }
    .px-bar-actions { order: 3; width: 100%; flex: 1 0 100%; overflow-x: auto; padding-bottom: 2px; }
    .px-readout { display: none; }
    .px-palette { top: 132px; width: 148px; }
  }
  @media (max-width: 600px) {
    .px-palette { display: none; }
    .px-brandsub { display: none; }
    .px-bar { left: 8px; right: 8px; top: 8px; }
    .px-run { padding: 8px 12px; }
  }
`;

// React Flow internals need global selectors (they render outside styled-jsx scope).
const globalFlowCss = (pal: ReturnType<typeof paletteFor>) => `
  .px-canvas .react-flow__attribution { display: none; }
  .px-canvas .react-flow__controls {
    border-radius: 12px; overflow: hidden;
    box-shadow: ${TOKENS.shadow};
    border: 1px solid ${pal.line};
  }
  .px-canvas .react-flow__controls-button {
    background: ${pal.panel2};
    border-bottom: 1px solid ${pal.line};
    color: ${pal.text};
    width: 28px; height: 28px;
  }
  .px-canvas .react-flow__controls-button:hover { background: ${pal.panel}; }
  .px-canvas .react-flow__controls-button svg { fill: ${pal.text}; }
  .px-canvas .react-flow__edge.selected .react-flow__edge-path,
  .px-canvas .react-flow__edge:focus .react-flow__edge-path { stroke-width: 3; filter: drop-shadow(0 0 5px currentColor); }
  .px-canvas .react-flow__handle { width: 12px; height: 12px; border-width: 2px; }
  .px-canvas .react-flow__handle:hover { transform: scale(1.25); }
  .px-canvas .react-flow__handle-connecting { transform: scale(1.3); }
  .px-canvas .react-flow__connection-path { stroke: ${TOKENS.pinkSoft}; stroke-width: 2.5; }
  .px-canvas .react-flow__node { font-family: ${TOKENS.font}; }
`;

// ── default export: provider wrapper ────────────────────────────────────────
const NodeStudio: React.FC<NodeStudioProps> = (props) => (
  <ReactFlowProvider>
    <Inner {...props} />
  </ReactFlowProvider>
);

export default NodeStudio;
