// ──────────────────────────────────────────────────────────────────────────
// Pixio · Node components
// One React Flow custom node component per registered node type. Each reads &
// writes its slice of the zustand graph store and asks the host to run itself
// via a context-provided runNode callback. The visual chrome lives in shared.tsx.
// ──────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useRef, useState } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Download, FileAudio, ImagePlus, Link2, Sparkles, Type, Upload, Video } from 'lucide-react';
import { TOKENS, type Theme } from '../../../lib/studio/types';
import { getModel } from '../../../lib/prodia/catalog';
import { getSpec, resolveOutputDataType } from '../../../lib/graph/registry';
import { useGraphStore, type GraphNode, type GraphNodeData } from '../../../lib/graph/store';
import { ModelPicker, NodeFrame, OutputPreview, paletteFor } from './shared';

// ── host context: theme + run-single-node + asset readback ──────────────────
export interface NodeHost {
  theme: Theme;
  runNode: (id: string) => void;
  busy: boolean;
}

export const NodeHostContext = createContext<NodeHost>({
  theme: 'dark',
  runNode: () => {},
  busy: false,
});

const useHost = () => useContext(NodeHostContext);

// ── shared hooks ─────────────────────────────────────────────────────────────
function useNode(id: string) {
  const node = useGraphStore((s) => s.nodes.find((n) => n.id === id)) as GraphNode | undefined;
  const updateNodeData = useGraphStore((s) => s.updateNodeData);
  const removeNode = useGraphStore((s) => s.removeNode);
  const duplicateNode = useGraphStore((s) => s.duplicateNode);
  return { node, updateNodeData, removeNode, duplicateNode };
}

// ── PROMPT ──────────────────────────────────────────────────────────────────
export const PromptNode: React.FC<NodeProps<GraphNode>> = ({ id, data, selected }) => {
  const host = useHost();
  const pal = paletteFor(host.theme);
  const { updateNodeData, removeNode, duplicateNode } = useNode(id);
  const spec = getSpec('prompt');
  const text = data.text ?? '';

  return (
    <NodeFrame
      spec={spec}
      pal={pal}
      selected={selected}
      status={data.status}
      title={data.label ?? spec.title}
      onDuplicate={() => duplicateNode(id)}
      onRemove={() => removeNode(id)}
    >
      <textarea
        className="nodrag nowheel px-ta"
        value={text}
        placeholder="Describe what you want to create…"
        onChange={(e) => updateNodeData(id, { text: e.target.value })}
        style={{ background: pal.field, borderColor: pal.fieldLine, color: pal.text }}
        rows={4}
      />
      <div className="px-prompt-foot" style={{ color: pal.faint }}>
        <Type size={11} /> {text.trim() ? `${text.trim().length} chars` : 'Empty prompt'}
      </div>
      <style jsx>{`
        .px-ta {
          width: 100%;
          resize: vertical;
          min-height: 78px;
          border: 1px solid;
          border-radius: 10px;
          padding: 9px 11px;
          font-family: ${TOKENS.font};
          font-size: 12px;
          line-height: 1.5;
          outline: none;
          transition: border-color 0.16s ease;
        }
        .px-ta:focus { border-color: ${spec.accent}; }
        .px-prompt-foot { display: flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 600; }
      `}</style>
    </NodeFrame>
  );
};

// ── IMAGE INPUT ─────────────────────────────────────────────────────────────
export const ImageInputNode: React.FC<NodeProps<GraphNode>> = ({ id, data, selected }) => {
  const host = useHost();
  const pal = paletteFor(host.theme);
  const { updateNodeData, removeNode, duplicateNode } = useNode(id);
  const spec = getSpec('imageInput');
  const fileRef = useRef<HTMLInputElement>(null);
  const [urlDraft, setUrlDraft] = useState('');

  const onFile = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateNodeData(id, { source: String(reader.result), status: 'done' });
    reader.readAsDataURL(file);
  };

  const applyUrl = () => {
    const u = urlDraft.trim();
    if (u) updateNodeData(id, { source: u, status: 'done' });
  };

  return (
    <NodeFrame
      spec={spec}
      pal={pal}
      selected={selected}
      status={data.status}
      title={data.label ?? spec.title}
      onDuplicate={() => duplicateNode(id)}
      onRemove={() => removeNode(id)}
    >
      {data.source ? (
        <div className="px-imgwrap" style={{ borderColor: pal.fieldLine }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.source} alt="input" className="px-img" />
          <button
            className="nodrag px-clear"
            onClick={() => updateNodeData(id, { source: undefined, status: 'idle' })}
            style={{ background: pal.panel2, color: pal.text, border: `1px solid ${pal.line}` }}
          >
            Replace
          </button>
        </div>
      ) : (
        <button
          className="nodrag px-drop"
          onClick={() => fileRef.current?.click()}
          style={{ borderColor: pal.fieldLine, background: pal.field, color: pal.muted }}
        >
          <Upload size={18} />
          <span>Upload image</span>
          <span className="px-drop-sub" style={{ color: pal.faint }}>PNG · JPG · WEBP</span>
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      <div className="px-url-row">
        <span className="px-url-ico" style={{ color: pal.faint }}><Link2 size={13} /></span>
        <input
          className="nodrag px-url"
          placeholder="…or paste an image URL"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') applyUrl(); }}
          style={{ background: pal.field, borderColor: pal.fieldLine, color: pal.text }}
        />
        <button className="nodrag px-url-go" onClick={applyUrl} style={{ color: spec.accent, borderColor: pal.fieldLine }}>
          Set
        </button>
      </div>

      <style jsx>{`
        .px-imgwrap { position: relative; width: 100%; aspect-ratio: 1/1; border: 1px solid; border-radius: 12px; overflow: hidden; }
        .px-img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .px-clear {
          position: absolute; bottom: 8px; right: 8px;
          font-size: 11px; font-weight: 600; padding: 5px 10px;
          border: none; border-radius: 8px; cursor: pointer;
          backdrop-filter: blur(8px);
        }
        .px-drop {
          width: 100%; aspect-ratio: 16/10;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
          border: 1px dashed; border-radius: 12px; cursor: pointer;
          font-size: 12px; font-weight: 600;
          transition: border-color 0.16s ease, background 0.16s ease;
        }
        .px-drop:hover { border-color: ${spec.accent}; }
        .px-drop-sub { font-size: 10px; font-weight: 500; }
        .px-url-row { display: flex; align-items: center; gap: 0; border-radius: 10px; }
        .px-url-ico { display: flex; align-items: center; padding-right: 6px; }
        .px-url {
          flex: 1; min-width: 0; border: 1px solid; border-radius: 9px 0 0 9px; border-right: none;
          padding: 7px 9px; font-size: 11px; font-family: ${TOKENS.font}; outline: none;
        }
        .px-url-go {
          border: 1px solid; border-radius: 0 9px 9px 0; background: transparent;
          padding: 7px 11px; font-size: 11px; font-weight: 700; cursor: pointer;
        }
      `}</style>
    </NodeFrame>
  );
};

const MediaInputNode: React.FC<NodeProps<GraphNode> & {
  kind: 'videoInput' | 'audioInput';
  accept: string;
  label: string;
  formats: string;
}> = ({ id, data, selected, kind, accept, label, formats }) => {
  const host = useHost();
  const pal = paletteFor(host.theme);
  const { updateNodeData, removeNode, duplicateNode } = useNode(id);
  const spec = getSpec(kind);
  const fileRef = useRef<HTMLInputElement>(null);
  const [urlDraft, setUrlDraft] = useState('');
  const isAudio = kind === 'audioInput';

  const onFile = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateNodeData(id, { source: String(reader.result), status: 'done' });
    reader.readAsDataURL(file);
  };

  const applyUrl = () => {
    const u = urlDraft.trim();
    if (u) updateNodeData(id, { source: u, status: 'done' });
  };

  return (
    <NodeFrame
      spec={spec}
      pal={pal}
      selected={selected}
      status={data.status}
      title={data.label ?? spec.title}
      onDuplicate={() => duplicateNode(id)}
      onRemove={() => removeNode(id)}
    >
      {data.source ? (
        <div className="px-mediawrap" style={{ borderColor: pal.fieldLine, background: pal.field }}>
          {isAudio ? (
            <audio src={data.source} controls className="px-audio" />
          ) : (
            <video src={data.source} controls muted playsInline className="px-video" />
          )}
          <button
            className="nodrag px-clear"
            onClick={() => updateNodeData(id, { source: undefined, status: 'idle' })}
            style={{ background: pal.panel2, color: pal.text, border: `1px solid ${pal.line}` }}
          >
            Replace
          </button>
        </div>
      ) : (
        <button
          className="nodrag px-drop"
          onClick={() => fileRef.current?.click()}
          style={{ borderColor: pal.fieldLine, background: pal.field, color: pal.muted }}
        >
          {isAudio ? <FileAudio size={18} /> : <Video size={18} />}
          <span>{label}</span>
          <span className="px-drop-sub" style={{ color: pal.faint }}>{formats}</span>
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      <div className="px-url-row">
        <span className="px-url-ico" style={{ color: pal.faint }}><Link2 size={13} /></span>
        <input
          className="nodrag px-url"
          placeholder={`...or paste a ${isAudio ? 'audio' : 'video'} URL`}
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') applyUrl(); }}
          style={{ background: pal.field, borderColor: pal.fieldLine, color: pal.text }}
        />
        <button className="nodrag px-url-go" onClick={applyUrl} style={{ color: spec.accent, borderColor: pal.fieldLine }}>
          Set
        </button>
      </div>

      <style jsx>{`
        .px-mediawrap { position: relative; width: 100%; aspect-ratio: ${isAudio ? '16/5' : '16/10'}; border: 1px solid; border-radius: 12px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
        .px-video { width: 100%; height: 100%; object-fit: cover; display: block; }
        .px-audio { width: calc(100% - 20px); }
        .px-clear {
          position: absolute; bottom: 8px; right: 8px;
          font-size: 11px; font-weight: 600; padding: 5px 10px;
          border: none; border-radius: 8px; cursor: pointer;
          backdrop-filter: blur(8px);
        }
        .px-drop {
          width: 100%; aspect-ratio: ${isAudio ? '16/5' : '16/10'};
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
          border: 1px dashed; border-radius: 12px; cursor: pointer;
          font-size: 12px; font-weight: 600;
          transition: border-color 0.16s ease, background 0.16s ease;
        }
        .px-drop:hover { border-color: ${spec.accent}; }
        .px-drop-sub { font-size: 10px; font-weight: 500; }
        .px-url-row { display: flex; align-items: center; gap: 0; border-radius: 10px; }
        .px-url-ico { display: flex; align-items: center; padding-right: 6px; }
        .px-url {
          flex: 1; min-width: 0; border: 1px solid; border-radius: 9px 0 0 9px; border-right: none;
          padding: 7px 9px; font-size: 11px; font-family: ${TOKENS.font}; outline: none;
        }
        .px-url-go {
          border: 1px solid; border-radius: 0 9px 9px 0; background: transparent;
          padding: 7px 11px; font-size: 11px; font-weight: 700; cursor: pointer;
        }
      `}</style>
    </NodeFrame>
  );
};

export const VideoInputNode: React.FC<NodeProps<GraphNode>> = (p) => (
  <MediaInputNode {...p} kind="videoInput" accept="video/mp4,video/*" label="Upload video" formats="MP4" />
);

export const AudioInputNode: React.FC<NodeProps<GraphNode>> = (p) => (
  <MediaInputNode {...p} kind="audioInput" accept="audio/mpeg,audio/wav,audio/flac,audio/*" label="Upload audio" formats="MP3 · WAV · FLAC" />
);

// ── generic "model + preview" node factory ──────────────────────────────────
const ModelNode: React.FC<NodeProps<GraphNode> & { kind: GraphNodeData['type']; placeholder: string }> = ({
  id,
  data,
  selected,
  kind,
  placeholder,
}) => {
  const host = useHost();
  const pal = paletteFor(host.theme);
  const { updateNodeData, removeNode, duplicateNode } = useNode(id);
  const spec = getSpec(kind);
  const model = data.modelId ? getModel(data.modelId) : undefined;
  const dataType = resolveOutputDataType(kind, data.modelId);

  return (
    <NodeFrame
      spec={spec}
      pal={pal}
      selected={selected}
      status={data.status}
      error={data.error}
      title={data.label ?? spec.title}
      badge={model?.medium === 'video' ? 'Video' : undefined}
      onRun={() => host.runNode(id)}
      runDisabled={host.busy}
      onDuplicate={() => duplicateNode(id)}
      onRemove={() => removeNode(id)}
    >
      <ModelPicker
        models={spec.models}
        value={data.modelId}
        onChange={(mid) => updateNodeData(id, { modelId: mid })}
        pal={pal}
        accent={spec.accent}
      />
      <OutputPreview
        url={data.output}
        isVideo={dataType === 'video' || data.outputIsVideo}
        status={data.status}
        pal={pal}
        accent={spec.accent}
        placeholder={placeholder}
      />
      {typeof data.price === 'number' ? (
        <div className="px-price" style={{ color: pal.faint }}>
          <Sparkles size={11} /> ${data.price.toFixed(4)}
        </div>
      ) : null}
      <style jsx>{`
        .px-price { display: flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 600; }
      `}</style>
    </NodeFrame>
  );
};

export const GenerateNode: React.FC<NodeProps<GraphNode>> = (p) => (
  <ModelNode {...p} kind="generate" placeholder="Connect a prompt, then run" />
);
export const VectorizeNode: React.FC<NodeProps<GraphNode>> = (p) => (
  <ModelNode {...p} kind="vectorize" placeholder="Connect a prompt to generate SVG" />
);
export const EditNode: React.FC<NodeProps<GraphNode>> = (p) => (
  <ModelNode {...p} kind="edit" placeholder="Connect image + instruction" />
);
export const InpaintNode: React.FC<NodeProps<GraphNode>> = (p) => (
  <ModelNode {...p} kind="inpaint" placeholder="Connect image, mask & prompt" />
);
export const UpscaleNode: React.FC<NodeProps<GraphNode>> = (p) => (
  <ModelNode {...p} kind="upscale" placeholder="Connect an image to upscale" />
);
export const RemoveBgNode: React.FC<NodeProps<GraphNode>> = (p) => (
  <ModelNode {...p} kind="removebg" placeholder="Connect an image to cut out" />
);
export const SegmentNode: React.FC<NodeProps<GraphNode>> = (p) => (
  <ModelNode {...p} kind="segment" placeholder="Connect an image; optional prompt for SAM 3" />
);
export const ClassifyNode: React.FC<NodeProps<GraphNode>> = (p) => (
  <ModelNode {...p} kind="classify" placeholder="Connect an image for labels" />
);
export const FaceRestoreNode: React.FC<NodeProps<GraphNode>> = (p) => (
  <ModelNode {...p} kind="facerestore" placeholder="Connect a portrait to restore" />
);
export const AnimateNode: React.FC<NodeProps<GraphNode>> = (p) => (
  <ModelNode {...p} kind="animate" placeholder="Connect an image to animate" />
);
export const Vid2VidNode: React.FC<NodeProps<GraphNode>> = (p) => (
  <ModelNode {...p} kind="vid2vid" placeholder="Connect video + prompt" />
);
export const Aud2VidNode: React.FC<NodeProps<GraphNode>> = (p) => (
  <ModelNode {...p} kind="aud2vid" placeholder="Connect audio + prompt" />
);

// ── OUTPUT (terminal preview + download) ────────────────────────────────────
export const OutputNode: React.FC<NodeProps<GraphNode>> = ({ id, data, selected }) => {
  const host = useHost();
  const pal = paletteFor(host.theme);
  const { removeNode, duplicateNode } = useNode(id);
  const spec = getSpec('output');

  // Read the upstream-produced media off the connected source node.
  const upstream = useGraphStore((s) => {
    const edge = s.edges.find((e) => e.target === id);
    if (!edge) return undefined;
    const src = s.nodes.find((n) => n.id === edge.source);
    if (!src) return undefined;
    if (src.data.type === 'imageInput') return { url: src.data.source, video: false };
    if (src.data.type === 'videoInput') return { url: src.data.source, video: true };
    if (src.data.type === 'prompt') return undefined;
    return { url: src.data.output, video: !!src.data.outputIsVideo };
  });

  const url = upstream?.url;
  const isVideo = !!upstream?.video;

  const download = () => {
    if (!url || typeof document === 'undefined') return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `pixio-${isVideo ? 'video' : 'image'}-${Date.now()}.${isVideo ? 'mp4' : 'png'}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <NodeFrame
      spec={spec}
      pal={pal}
      selected={selected}
      status={url ? 'done' : 'idle'}
      title={data.label ?? spec.title}
      onDuplicate={() => duplicateNode(id)}
      onRemove={() => removeNode(id)}
    >
      <OutputPreview
        url={url}
        isVideo={isVideo}
        status={url ? 'done' : 'idle'}
        pal={pal}
        accent={spec.accent}
        placeholder="Connect any image or video"
      />
      <button
        className="nodrag px-dl"
        onClick={download}
        disabled={!url}
        style={{ background: url ? spec.accent : pal.field, color: url ? '#1a0512' : pal.faint, borderColor: pal.fieldLine }}
      >
        <Download size={14} /> Download
      </button>
      <style jsx>{`
        .px-dl {
          display: flex; align-items: center; justify-content: center; gap: 7px;
          width: 100%; padding: 9px; border: 1px solid; border-radius: 10px;
          font-size: 12px; font-weight: 700; cursor: pointer;
          transition: transform 0.1s ease, filter 0.14s ease;
        }
        .px-dl:hover:not(:disabled) { filter: brightness(1.08); }
        .px-dl:active:not(:disabled) { transform: scale(0.98); }
        .px-dl:disabled { cursor: default; }
      `}</style>
    </NodeFrame>
  );
};

// ── nodeTypes map for <ReactFlow> ───────────────────────────────────────────
export const nodeTypes = {
  prompt: PromptNode,
  imageInput: ImageInputNode,
  videoInput: VideoInputNode,
  audioInput: AudioInputNode,
  generate: GenerateNode,
  vectorize: VectorizeNode,
  edit: EditNode,
  inpaint: InpaintNode,
  upscale: UpscaleNode,
  removebg: RemoveBgNode,
  segment: SegmentNode,
  classify: ClassifyNode,
  facerestore: FaceRestoreNode,
  animate: AnimateNode,
  vid2vid: Vid2VidNode,
  aud2vid: Aud2VidNode,
  output: OutputNode,
};
