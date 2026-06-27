// ──────────────────────────────────────────────────────────────────────────
// Pixio · Node graph registry
// The single source of truth for what node types exist, their typed handle
// ports, their default model, and the rules that govern which connections are
// legal. Both the store (validation), the engine (execution) and the UI
// (rendering) read from here.
// ──────────────────────────────────────────────────────────────────────────

import type { Connection, Edge } from '@xyflow/react';
import {
  AUD2VID_MODELS,
  CLASSIFY_MODELS,
  FACE_RESTORE_MODELS,
  IMG2VID_MODELS,
  INPAINT_MODELS,
  SEGMENT_MODELS,
  TXT2IMG_MODELS,
  TXT2VID_MODELS,
  UTILITY_MODELS,
  VECTOR_MODELS,
  VID2VID_MODELS,
  editModels,
  getModel,
} from '../prodia/catalog';
import type { Operation, ProdiaModel } from '../prodia/types';

// ── Data types that flow along edges ────────────────────────────────────────
export type DataType = 'text' | 'image' | 'video' | 'audio' | 'number';

/** A coloured, typed handle on a node. */
export interface HandlePort {
  /** Stable handle id, unique within the node (used as the RF handle id). */
  id: string;
  dataType: DataType;
  label: string;
}

export type NodeCategory = 'input' | 'generate' | 'transform' | 'output';

/** Every node type registered in the editor. */
export type NodeType =
  | 'prompt'
  | 'imageInput'
  | 'videoInput'
  | 'audioInput'
  | 'generate'
  | 'vectorize'
  | 'edit'
  | 'inpaint'
  | 'upscale'
  | 'removebg'
  | 'segment'
  | 'classify'
  | 'facerestore'
  | 'animate'
  | 'vid2vid'
  | 'aud2vid'
  | 'output';

export interface NodeSpec {
  type: NodeType;
  title: string;
  subtitle: string;
  /** The Prodia operation this node maps to (input/output nodes have none). */
  operation?: Operation;
  category: NodeCategory;
  inputs: HandlePort[];
  outputs: HandlePort[];
  accent: string;
  /** The pool of models this node can choose from (empty for source/sink). */
  models: ProdiaModel[];
  /** Default model id for a freshly-created node. */
  defaultModel?: string;
}

// ── Colour per data type — driven by the two accent vars so the whole graph
//    recolors with the chosen accent (text/number = primary, image/video = secondary)
export const DATA_TYPE_COLORS: Record<DataType, string> = {
  text: 'var(--pink)',
  image: 'var(--violet)',
  video: 'var(--violet)',
  audio: 'var(--pink)',
  number: 'var(--pink)',
};

export const DATA_TYPE_LABELS: Record<DataType, string> = {
  text: 'Text',
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  number: 'Number',
};

const first = (list: ProdiaModel[]): string | undefined => list[0]?.id;

// ── The registry ────────────────────────────────────────────────────────────
export const NODE_SPECS: Record<NodeType, NodeSpec> = {
  prompt: {
    type: 'prompt',
    title: 'Prompt',
    subtitle: 'Text source',
    category: 'input',
    inputs: [],
    outputs: [{ id: 'text', dataType: 'text', label: 'Prompt' }],
    accent: 'var(--pink)',
    models: [],
  },

  imageInput: {
    type: 'imageInput',
    title: 'Image',
    subtitle: 'Upload or URL',
    category: 'input',
    inputs: [],
    outputs: [{ id: 'image', dataType: 'image', label: 'Image' }],
    accent: 'var(--violet)',
    models: [],
  },

  videoInput: {
    type: 'videoInput',
    title: 'Video',
    subtitle: 'Upload or URL',
    category: 'input',
    inputs: [],
    outputs: [{ id: 'video', dataType: 'video', label: 'Video' }],
    accent: 'var(--violet)',
    models: [],
  },

  audioInput: {
    type: 'audioInput',
    title: 'Audio',
    subtitle: 'Upload or URL',
    category: 'input',
    inputs: [],
    outputs: [{ id: 'audio', dataType: 'audio', label: 'Audio' }],
    accent: 'var(--pink)',
    models: [],
  },

  generate: {
    type: 'generate',
    title: 'Generate',
    subtitle: 'Text → image / video',
    operation: 'txt2img',
    category: 'generate',
    inputs: [{ id: 'prompt', dataType: 'text', label: 'Prompt' }],
    // Output medium follows the chosen model (resolved at render/exec time);
    // we expose both an image and a video out so either model class connects.
    outputs: [
      { id: 'image', dataType: 'image', label: 'Image' },
      { id: 'video', dataType: 'video', label: 'Video' },
    ],
    accent: 'var(--pink)',
    models: [...TXT2IMG_MODELS, ...TXT2VID_MODELS],
    defaultModel: first(TXT2IMG_MODELS),
  },

  vectorize: {
    type: 'vectorize',
    title: 'Vectorize',
    subtitle: 'Text -> SVG',
    operation: 'vectorize',
    category: 'generate',
    inputs: [{ id: 'prompt', dataType: 'text', label: 'Prompt' }],
    outputs: [{ id: 'image', dataType: 'image', label: 'SVG' }],
    accent: 'var(--violet)',
    models: VECTOR_MODELS,
    defaultModel: first(VECTOR_MODELS),
  },

  edit: {
    type: 'edit',
    title: 'Edit',
    subtitle: 'Instruction edit',
    operation: 'edit',
    category: 'transform',
    inputs: [
      { id: 'image', dataType: 'image', label: 'Image' },
      { id: 'prompt', dataType: 'text', label: 'Instruction' },
    ],
    outputs: [{ id: 'image', dataType: 'image', label: 'Image' }],
    accent: 'var(--violet)',
    models: editModels(),
    defaultModel: first(editModels()),
  },

  inpaint: {
    type: 'inpaint',
    title: 'Inpaint',
    subtitle: 'Masked repaint',
    operation: 'inpaint',
    category: 'transform',
    inputs: [
      { id: 'image', dataType: 'image', label: 'Image' },
      { id: 'mask', dataType: 'image', label: 'Mask' },
      { id: 'prompt', dataType: 'text', label: 'Prompt' },
    ],
    outputs: [{ id: 'image', dataType: 'image', label: 'Image' }],
    accent: 'var(--violet)',
    models: INPAINT_MODELS,
    defaultModel: first(INPAINT_MODELS),
  },

  upscale: {
    type: 'upscale',
    title: 'Upscale',
    subtitle: 'Super-resolution',
    operation: 'upscale',
    category: 'transform',
    inputs: [{ id: 'image', dataType: 'image', label: 'Image' }],
    outputs: [{ id: 'image', dataType: 'image', label: 'Image' }],
    accent: 'var(--pink)',
    models: UTILITY_MODELS.filter((model) => model.operation === 'upscale'),
    defaultModel: first(UTILITY_MODELS.filter((model) => model.operation === 'upscale')),
  },

  removebg: {
    type: 'removebg',
    title: 'Remove BG',
    subtitle: 'Subject cutout',
    operation: 'removebg',
    category: 'transform',
    inputs: [{ id: 'image', dataType: 'image', label: 'Image' }],
    outputs: [{ id: 'image', dataType: 'image', label: 'Cutout' }],
    accent: 'var(--violet)',
    models: UTILITY_MODELS.filter((model) => model.operation === 'removebg'),
    defaultModel: first(UTILITY_MODELS.filter((model) => model.operation === 'removebg')),
  },

  segment: {
    type: 'segment',
    title: 'Segment',
    subtitle: 'Object masks',
    operation: 'segment',
    category: 'transform',
    inputs: [
      { id: 'image', dataType: 'image', label: 'Image' },
      { id: 'prompt', dataType: 'text', label: 'Prompt' },
    ],
    outputs: [{ id: 'image', dataType: 'image', label: 'Mask' }],
    accent: 'var(--pink)',
    models: SEGMENT_MODELS,
    defaultModel: first(SEGMENT_MODELS),
  },

  classify: {
    type: 'classify',
    title: 'Classify',
    subtitle: 'Labels / NSFW',
    operation: 'classify',
    category: 'transform',
    inputs: [{ id: 'image', dataType: 'image', label: 'Image' }],
    outputs: [{ id: 'image', dataType: 'image', label: 'Image' }],
    accent: 'var(--violet)',
    models: CLASSIFY_MODELS,
    defaultModel: first(CLASSIFY_MODELS),
  },

  facerestore: {
    type: 'facerestore',
    title: 'Face Restore',
    subtitle: 'Portrait repair',
    operation: 'facerestore',
    category: 'transform',
    inputs: [{ id: 'image', dataType: 'image', label: 'Image' }],
    outputs: [{ id: 'image', dataType: 'image', label: 'Image' }],
    accent: 'var(--pink)',
    models: FACE_RESTORE_MODELS,
    defaultModel: first(FACE_RESTORE_MODELS),
  },

  animate: {
    type: 'animate',
    title: 'Animate',
    subtitle: 'Image → video',
    operation: 'img2vid',
    category: 'transform',
    inputs: [
      { id: 'image', dataType: 'image', label: 'Image' },
      { id: 'prompt', dataType: 'text', label: 'Motion' },
    ],
    outputs: [{ id: 'video', dataType: 'video', label: 'Video' }],
    accent: 'var(--pink)',
    models: IMG2VID_MODELS,
    defaultModel: first(IMG2VID_MODELS),
  },

  vid2vid: {
    type: 'vid2vid',
    title: 'Transform Video',
    subtitle: 'Runway Gen-4',
    operation: 'vid2vid',
    category: 'transform',
    inputs: [
      { id: 'video', dataType: 'video', label: 'Video' },
      { id: 'prompt', dataType: 'text', label: 'Prompt' },
    ],
    outputs: [{ id: 'video', dataType: 'video', label: 'Video' }],
    accent: 'var(--pink)',
    models: VID2VID_MODELS,
    defaultModel: first(VID2VID_MODELS),
  },

  aud2vid: {
    type: 'aud2vid',
    title: 'Audio to Video',
    subtitle: 'Pruna P-Video',
    operation: 'aud2vid',
    category: 'transform',
    inputs: [
      { id: 'audio', dataType: 'audio', label: 'Audio' },
      { id: 'prompt', dataType: 'text', label: 'Prompt' },
    ],
    outputs: [{ id: 'video', dataType: 'video', label: 'Video' }],
    accent: 'var(--violet)',
    models: AUD2VID_MODELS,
    defaultModel: first(AUD2VID_MODELS),
  },

  output: {
    type: 'output',
    title: 'Output',
    subtitle: 'Preview & download',
    category: 'output',
    inputs: [
      { id: 'image', dataType: 'image', label: 'Image' },
      { id: 'video', dataType: 'video', label: 'Video' },
    ],
    outputs: [],
    accent: 'var(--pink)',
    models: [],
  },
};

export const ALL_NODE_TYPES: NodeType[] = Object.keys(NODE_SPECS) as NodeType[];

export const getSpec = (type: NodeType): NodeSpec => NODE_SPECS[type];

export const isNodeType = (value: string): value is NodeType =>
  Object.prototype.hasOwnProperty.call(NODE_SPECS, value);

// ── Palette grouping for the "Add node" panel ───────────────────────────────
export interface PaletteGroup {
  category: NodeCategory;
  label: string;
  types: NodeType[];
}

export const PALETTE_GROUPS: PaletteGroup[] = [
  { category: 'input', label: 'Inputs', types: ['prompt', 'imageInput', 'videoInput', 'audioInput'] },
  { category: 'generate', label: 'Generate', types: ['generate', 'vectorize'] },
  {
    category: 'transform',
    label: 'Transform',
    types: ['edit', 'inpaint', 'upscale', 'removebg', 'segment', 'classify', 'facerestore', 'animate', 'vid2vid', 'aud2vid'],
  },
  { category: 'output', label: 'Output', types: ['output'] },
];

// ── Handle lookups ──────────────────────────────────────────────────────────
export const findOutput = (type: NodeType, handleId?: string | null): HandlePort | undefined => {
  const outs = NODE_SPECS[type].outputs;
  if (!handleId) return outs[0];
  return outs.find((port) => port.id === handleId);
};

export const findInput = (type: NodeType, handleId?: string | null): HandlePort | undefined => {
  const ins = NODE_SPECS[type].inputs;
  if (!handleId) return ins[0];
  return ins.find((port) => port.id === handleId);
};

/**
 * The data type that a node's chosen model actually produces. For a `generate`
 * node this depends on whether a video or image model is selected, so we
 * resolve it from the model rather than the static spec.
 */
export const resolveOutputDataType = (type: NodeType, modelId?: string): DataType => {
  if (type === 'generate' && modelId) {
    const model = getModel(modelId);
    if (model) return model.medium === 'video' ? 'video' : 'image';
  }
  const spec = NODE_SPECS[type];
  return spec.outputs[0]?.dataType ?? 'image';
};

// ── Connection validation ───────────────────────────────────────────────────
/**
 * A connection is valid only when the source output's data type matches the
 * target input's data type (text→text, image→image, …). We also reject self
 * loops. This is the rule the store + <ReactFlow isValidConnection> both use.
 */
export function isValidConnection(
  conn: Connection | Edge,
  nodeTypeOf: (id: string) => NodeType | undefined,
  modelIdOf: (id: string) => string | undefined,
): boolean {
  const { source, target, sourceHandle, targetHandle } = conn as Connection;
  if (!source || !target) return false;
  if (source === target) return false;

  const sourceType = nodeTypeOf(source);
  const targetType = nodeTypeOf(target);
  if (!sourceType || !targetType) return false;

  const out = findOutput(sourceType, sourceHandle);
  const inp = findInput(targetType, targetHandle);
  if (!out || !inp) return false;

  // For generate nodes the live output type depends on the chosen model.
  const sourceDataType =
    sourceType === 'generate'
      ? resolveOutputDataType('generate', modelIdOf(source))
      : out.dataType;

  return sourceDataType === inp.dataType;
}
