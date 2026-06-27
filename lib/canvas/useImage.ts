// ──────────────────────────────────────────────────────────────────────────
// Pixio · Canvas image-loading hook
// `use-image` is not installed, so this is a small dependency-free replacement.
// It loads a bitmap with crossOrigin='anonymous' so the Konva stage stays
// untainted and can be exported via toDataURL. Data URLs work fine.
// All window/Image access is guarded inside the effect (never at module scope).
// ──────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';

export type ImageStatus = 'loading' | 'loaded' | 'failed' | 'empty';

interface ImageState {
  image: HTMLImageElement | undefined;
  status: ImageStatus;
}

/**
 * Load an image for use in <KonvaImage image={...} />.
 * Returns [image, status, naturalSize].
 */
export function useCanvasImage(
  src: string | undefined,
): [HTMLImageElement | undefined, ImageStatus, { width: number; height: number }] {
  const [state, setState] = useState<ImageState>({ image: undefined, status: src ? 'loading' : 'empty' });
  const sizeRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    if (!src || typeof window === 'undefined') {
      setState({ image: undefined, status: src ? 'loading' : 'empty' });
      return;
    }
    let cancelled = false;
    setState((prev) => ({ image: prev.image, status: 'loading' }));

    const img = new window.Image();
    // Data URLs are same-origin; for remote http URLs this keeps the canvas
    // exportable. Set before src so it takes effect on the request.
    img.crossOrigin = 'anonymous';

    const onLoad = () => {
      if (cancelled) return;
      sizeRef.current = { width: img.naturalWidth, height: img.naturalHeight };
      setState({ image: img, status: 'loaded' });
    };
    const onError = () => {
      if (cancelled) return;
      // Retry once without crossOrigin in case the host lacks CORS headers.
      if (img.crossOrigin) {
        const retry = new window.Image();
        retry.onload = () => {
          if (cancelled) return;
          sizeRef.current = { width: retry.naturalWidth, height: retry.naturalHeight };
          setState({ image: retry, status: 'loaded' });
        };
        retry.onerror = () => {
          if (!cancelled) setState({ image: undefined, status: 'failed' });
        };
        retry.src = src;
        return;
      }
      setState({ image: undefined, status: 'failed' });
    };

    img.addEventListener('load', onLoad);
    img.addEventListener('error', onError);
    img.src = src;

    return () => {
      cancelled = true;
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
    };
  }, [src]);

  return [state.image, state.status, sizeRef.current];
}

/**
 * Imperatively load a bitmap and resolve with its natural size.
 * Used by upload / seed / AI-result placement (outside React render).
 */
export function loadImageSize(src: string): Promise<{ image: HTMLImageElement; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('No window'));
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve({ image: img, width: img.naturalWidth || 512, height: img.naturalHeight || 512 });
    img.onerror = () => {
      // retry without crossOrigin
      const retry = new window.Image();
      retry.onload = () => resolve({ image: retry, width: retry.naturalWidth || 512, height: retry.naturalHeight || 512 });
      retry.onerror = () => reject(new Error('Failed to load image'));
      retry.src = src;
    };
    img.src = src;
  });
}

/** Read a File into a data URL. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
