// Pixio accent system. Each accent maps onto the primary and secondary UI hues,
// and also derives the base background/panel/line tokens so no old fixed tint
// leaks through when the user changes colors.

export interface Accent {
  id: string;
  name: string;
  c1: string;
  c2: string;
}

export const ACCENTS: Accent[] = [
  { id: 'pixio', name: 'Pixio', c1: '#ff5fb7', c2: '#8b5cf6' },
  { id: 'sunset', name: 'Sunset', c1: '#fb7185', c2: '#f59e0b' },
  { id: 'ocean', name: 'Ocean', c1: '#38bdf8', c2: '#3b82f6' },
  { id: 'aurora', name: 'Aurora', c1: '#34d399', c2: '#22d3ee' },
  { id: 'grape', name: 'Grape', c1: '#a855f7', c2: '#6366f1' },
  { id: 'flamingo', name: 'Flamingo', c1: '#f472b6', c2: '#fb7185' },
  { id: 'citrus', name: 'Citrus', c1: '#f59e0b', c2: '#ef4444' },
  { id: 'mint', name: 'Mint', c1: '#34d399', c2: '#14b8a6' },
  { id: 'royal', name: 'Royal', c1: '#6366f1', c2: '#8b5cf6' },
  { id: 'coral', name: 'Coral', c1: '#ff7a59', c2: '#ff5fb7' },
  { id: 'lagoon', name: 'Lagoon', c1: '#06b6d4', c2: '#14b8a6' },
  { id: 'berry', name: 'Berry', c1: '#ec4899', c2: '#a855f7' },
  { id: 'ember', name: 'Ember', c1: '#ef4444', c2: '#f59e0b' },
  { id: 'sky', name: 'Sky', c1: '#38bdf8', c2: '#818cf8' },
  { id: 'lime', name: 'Lime', c1: '#84cc16', c2: '#22c55e' },
  { id: 'fuchsia', name: 'Fuchsia', c1: '#c026d3', c2: '#7c3aed' },
  { id: 'peach', name: 'Peach', c1: '#fda4af', c2: '#fb923c' },
  { id: 'neon', name: 'Neon', c1: '#d946ef', c2: '#22d3ee' },
  { id: 'rosegold', name: 'Rose Gold', c1: '#fb7185', c2: '#fbbf24' },
  { id: 'graphite', name: 'Graphite', c1: '#94a3b8', c2: '#64748b' },
];

export const getAccent = (id: string): Accent => ACCENTS.find((a) => a.id === id) ?? ACCENTS[0];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const int = parseInt(n, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

const rgba = (hex: string, a: number) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};

const lighten = (hex: string, amt: number) => {
  const [r, g, b] = hexToRgb(hex);
  const m = (v: number) => Math.round(v + (255 - v) * amt);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
};

const mixCss = (hex: string, amount: number, base: string) =>
  `color-mix(in srgb, ${hex} ${amount}%, ${base})`;

export function accentVars(a: Accent, theme: 'dark' | 'light' = 'dark'): Record<string, string> {
  const base =
    theme === 'dark'
      ? {
          // Surfaces are tinted with the PRIMARY color only, so the whole app
          // reads as shades of the chosen color. c2 is reserved for accent pops.
          '--bg': mixCss(a.c1, 7, '#080b0b'),
          '--bg-deep': mixCss(a.c1, 5, '#040606'),
          '--panel': mixCss(a.c1, 9, 'rgba(14,16,18,0.68)'),
          '--panel-solid': mixCss(a.c1, 9, '#15181b'),
          '--panel-2': mixCss(a.c1, 11, 'rgba(18,20,23,0.74)'),
          '--elevated': mixCss(a.c1, 13, '#1a1d22'),
          '--line': mixCss(a.c1, 15, 'transparent'),
          '--ghost': mixCss(a.c1, 9, 'transparent'),
          '--topbar-bg': `linear-gradient(180deg, ${mixCss(a.c1, 14, 'rgba(8,10,12,0.88)')}, ${mixCss(a.c1, 9, 'rgba(8,10,12,0.58)')})`,
          '--scrim': mixCss(a.c1, 10, 'rgba(0,0,0,0.82)'),
          '--skeleton-a': mixCss(a.c1, 10, 'transparent'),
          '--skeleton-b': mixCss(a.c1, 24, 'transparent'),
          '--glow': `0 0 0 1px ${rgba(a.c1, 0.18)}, 0 18px 50px ${rgba(a.c1, 0.16)}`,
          '--shadow': `0 2px 4px rgba(0,0,0,0.22), 0 14px 32px ${rgba(a.c1, 0.12)}, 0 30px 70px rgba(0,0,0,0.34)`,
        }
      : {
          '--bg': mixCss(a.c1, 6, '#ffffff'),
          '--bg-deep': mixCss(a.c1, 9, '#f7fafb'),
          '--panel': mixCss(a.c1, 6, 'rgba(255,255,255,0.84)'),
          '--panel-solid': mixCss(a.c1, 4, '#ffffff'),
          '--panel-2': mixCss(a.c1, 5, 'rgba(255,255,255,0.92)'),
          '--elevated': mixCss(a.c1, 4, '#ffffff'),
          '--line': mixCss(a.c1, 22, 'transparent'),
          '--ghost': mixCss(a.c1, 9, 'transparent'),
          '--topbar-bg': `linear-gradient(180deg, ${mixCss(a.c1, 10, 'rgba(255,255,255,0.9)')}, ${mixCss(a.c1, 7, 'rgba(255,255,255,0.56)')})`,
          '--scrim': mixCss(a.c1, 13, 'rgba(255,255,255,0.80)'),
          '--skeleton-a': mixCss(a.c1, 9, 'transparent'),
          '--skeleton-b': mixCss(a.c1, 18, 'transparent'),
          '--glow': `0 0 0 1px ${rgba(a.c1, 0.16)}, 0 18px 50px ${rgba(a.c1, 0.14)}`,
          '--shadow': `0 2px 4px rgba(25,30,35,0.06), 0 18px 44px ${rgba(a.c1, 0.14)}`,
        };

  return {
    ...base,
    '--pink': a.c1,
    '--pink-soft': lighten(a.c1, 0.28),
    '--violet': a.c2,
    '--magenta': a.c1,
    '--cyan': a.c2,
    '--mint': a.c1,
    '--accent': `linear-gradient(135deg, ${a.c1} 0%, ${a.c2} 100%)`,
    '--accent-soft': `linear-gradient(135deg, ${rgba(a.c1, 0.16)}, ${rgba(a.c2, 0.16)})`,
    '--line-strong': rgba(a.c1, 0.42),
    '--glow-accent': `0 8px 34px ${rgba(a.c1, 0.45)}, 0 0 60px ${rgba(a.c2, 0.22)}`,
  };
}
