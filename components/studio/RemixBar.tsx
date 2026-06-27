import {
  Columns2,
  Download,
  Eraser,
  FileCode2,
  Film,
  Maximize2,
  ScanEye,
  Scissors,
  Shuffle,
  Sparkles,
  Trash2,
  UserCheck,
  Wand2,
  Workflow,
} from 'lucide-react';
import { useRemix } from '../../lib/studio/useRemix';
import { useStudio } from '../../lib/studio/store';
import type { StudioAsset } from '../../lib/studio/types';

function download(a: StudioAsset) {
  if (!a.url) return;
  const ext = a.mimeType?.includes('svg') ? 'svg' : a.isVideo ? 'mp4' : 'png';
  const el = document.createElement('a');
  el.href = a.url;
  el.download = `pixio-${a.modelLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${ext}`;
  el.click();
}

interface Props {
  asset: StudioAsset;
  variant?: 'overlay' | 'inline';
}

export default function RemixBar({ asset, variant = 'overlay' }: Props) {
  const { vary, upscale, removeBg, segment, classify, faceRestore, vectorize, animate, transformVideo, toCanvas, toNodes } = useRemix();
  const toggleCompare = useStudio((s) => s.toggleCompare);
  const removeAsset = useStudio((s) => s.removeAsset);
  const inCompare = useStudio((s) => s.compareIds.includes(asset.id));
  const ready = asset.status === 'done' && !!asset.url;
  const img = ready && !asset.isVideo;
  const vid = ready && !!asset.isVideo;

  const Btn = ({ icon, label, onClick, active, danger }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean; danger?: boolean }) => (
    <button
      className={`remix-btn${active ? ' active' : ''}${danger ? ' danger' : ''}`}
      title={label}
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      {icon}
    </button>
  );

  return (
    <div className={`remix-bar ${variant}`} onClick={(e) => e.stopPropagation()}>
      {img && <Btn icon={<Shuffle size={15} />} label="Make variations" onClick={() => vary(asset)} />}
      {img && <Btn icon={<Wand2 size={15} />} label="Edit on canvas" onClick={() => toCanvas(asset)} />}
      {img && <Btn icon={<Maximize2 size={15} />} label="Upscale" onClick={() => upscale(asset)} />}
      {img && <Btn icon={<Eraser size={15} />} label="Remove background" onClick={() => removeBg(asset)} />}
      {img && <Btn icon={<Scissors size={15} />} label="Segment masks" onClick={() => segment(asset)} />}
      {img && <Btn icon={<ScanEye size={15} />} label="Classify / NSFW labels" onClick={() => classify(asset)} />}
      {img && <Btn icon={<UserCheck size={15} />} label="Face restore" onClick={() => faceRestore(asset)} />}
      {img && <Btn icon={<FileCode2 size={15} />} label="Vectorize prompt" onClick={() => vectorize(asset)} />}
      {img && <Btn icon={<Film size={15} />} label="Animate to video" onClick={() => animate(asset)} />}
      {vid && <Btn icon={<Sparkles size={15} />} label="Transform video" onClick={() => transformVideo(asset)} />}
      {img && <Btn icon={<Workflow size={15} />} label="Send to Nodes" onClick={() => toNodes(asset)} />}
      {ready && <Btn icon={<Columns2 size={15} />} label="Compare" active={inCompare} onClick={() => toggleCompare(asset.id)} />}
      {ready && <Btn icon={<Download size={15} />} label="Download" onClick={() => download(asset)} />}
      <Btn icon={<Trash2 size={15} />} label="Delete" danger onClick={() => removeAsset(asset.id)} />
    </div>
  );
}
