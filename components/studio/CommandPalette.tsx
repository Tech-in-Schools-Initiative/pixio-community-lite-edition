import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft, ArrowUp, ArrowDown, Command } from 'lucide-react';

export interface CommandAction {
  id: string;
  label: string;
  hint?: string;
  group?: string;
  keywords?: string;
  icon?: React.ReactNode;
  perform: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  actions: CommandAction[];
}

const UNGROUPED = 'Actions';

export default function CommandPalette({ open, onClose, actions }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Reset query + highlight whenever the palette (re)opens, and focus the input.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setHighlight(0);
    const id = window.setTimeout(function () {
      if (inputRef.current) inputRef.current.focus();
    }, 0);
    return function () {
      window.clearTimeout(id);
    };
  }, [open]);

  // Case-insensitive substring filter over label + keywords + group.
  const filtered = useMemo(
    function () {
      const q = query.trim().toLowerCase();
      if (!q) return actions;
      return actions.filter(function (a) {
        const hay = (
          a.label +
          ' ' +
          (a.keywords || '') +
          ' ' +
          (a.group || '')
        ).toLowerCase();
        return hay.indexOf(q) !== -1;
      });
    },
    [query, actions]
  );

  // Build a flat, ordered list (matching grouped render order) so keyboard nav
  // and the rendered rows share a single source of truth for indices.
  const groups = useMemo(
    function () {
      const order: string[] = [];
      const map: { [key: string]: CommandAction[] } = {};
      filtered.forEach(function (a) {
        const g = a.group || UNGROUPED;
        if (!map[g]) {
          map[g] = [];
          order.push(g);
        }
        map[g].push(a);
      });
      return order.map(function (name) {
        return { name: name, items: map[name] };
      });
    },
    [filtered]
  );

  const flat = useMemo(
    function () {
      const out: CommandAction[] = [];
      groups.forEach(function (grp) {
        grp.items.forEach(function (it) {
          out.push(it);
        });
      });
      return out;
    },
    [groups]
  );

  // Keep highlight in range when the filtered set changes.
  useEffect(
    function () {
      setHighlight(function (h) {
        if (flat.length === 0) return 0;
        if (h > flat.length - 1) return flat.length - 1;
        if (h < 0) return 0;
        return h;
      });
    },
    [flat.length]
  );

  // Scroll the highlighted row into view.
  useEffect(
    function () {
      const el = rowRefs.current[highlight];
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    },
    [highlight]
  );

  if (!open) return null;

  const run = function (action: CommandAction) {
    action.perform();
    onClose();
  };

  const onKeyDown = function (e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flat.length === 0) return;
      setHighlight(function (h) {
        return (h + 1) % flat.length;
      });
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flat.length === 0) return;
      setHighlight(function (h) {
        return (h - 1 + flat.length) % flat.length;
      });
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const action = flat[highlight];
      if (action) run(action);
      return;
    }
  };

  // index counter shared across grouped render to map rows -> flat index
  let runningIndex = -1;
  rowRefs.current = [];

  return (
    <div
      className="modal-scrim"
      onMouseDown={function (e) {
        // Close only when the backdrop itself (not the panel) is pressed.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-label="Command palette"
        onKeyDown={onKeyDown}
        style={{
          width: 600,
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: 'min(70vh, 560px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--panel)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--line-strong)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)',
          animation: 'pop 0.18s var(--ease) both',
        }}
      >
        {/* Search header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '16px 18px',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <Search size={18} style={{ color: 'var(--pink-soft)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            className="input"
            value={query}
            onChange={function (e) {
              setQuery(e.target.value);
              setHighlight(0);
            }}
            placeholder="Search commands…"
            aria-label="Search commands"
            style={{
              border: 'none',
              background: 'transparent',
              padding: 0,
              fontSize: 15,
            }}
          />
          <span
            className="badge"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}
          >
            <Command size={11} /> K
          </span>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 8px 10px',
            minHeight: 0,
          }}
        >
          {flat.length === 0 ? (
            <div
              style={{
                padding: '40px 18px',
                textAlign: 'center',
                color: 'var(--faint)',
                fontSize: 13.5,
              }}
            >
              No commands match <strong style={{ color: 'var(--muted)' }}>“{query}”</strong>
            </div>
          ) : (
            groups.map(function (grp) {
              return (
                <div key={grp.name} style={{ marginBottom: 4 }}>
                  <div
                    style={{
                      fontSize: 10.5,
                      fontWeight: 750,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--faint)',
                      padding: '12px 12px 6px',
                    }}
                  >
                    {grp.name}
                  </div>
                  {grp.items.map(function (action) {
                    runningIndex += 1;
                    const idx = runningIndex;
                    const isActive = idx === highlight;
                    return (
                      <button
                        key={action.id}
                        ref={function (el) {
                          rowRefs.current[idx] = el;
                        }}
                        type="button"
                        onMouseDown={function (e) {
                          e.preventDefault();
                        }}
                        onMouseMove={function () {
                          if (highlight !== idx) setHighlight(idx);
                        }}
                        onClick={function () {
                          run(action);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid transparent',
                          borderLeft: isActive
                            ? '2px solid var(--pink)'
                            : '2px solid transparent',
                          background: isActive ? 'var(--accent-soft)' : 'transparent',
                          color: isActive ? 'var(--text)' : 'var(--muted)',
                          transition: 'background 0.12s var(--ease), color 0.12s var(--ease)',
                        }}
                      >
                        {action.icon ? (
                          <span
                            style={{
                              display: 'grid',
                              placeItems: 'center',
                              width: 20,
                              height: 20,
                              flexShrink: 0,
                              color: isActive ? 'var(--pink-soft)' : 'var(--faint)',
                            }}
                          >
                            {action.icon}
                          </span>
                        ) : (
                          <span style={{ width: 20, flexShrink: 0 }} />
                        )}
                        <span
                          style={{
                            flex: 1,
                            minWidth: 0,
                            fontSize: 13.5,
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {action.label}
                        </span>
                        {action.hint ? (
                          <span
                            style={{
                              flexShrink: 0,
                              fontSize: 11.5,
                              fontWeight: 600,
                              color: 'var(--faint)',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {action.hint}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '10px 18px',
            borderTop: '1px solid var(--line)',
            background: 'var(--panel-2)',
            fontSize: 11.5,
            color: 'var(--faint)',
            flexShrink: 0,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <kbd style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 6px' }}>
              <ArrowUp size={11} />
            </kbd>
            <kbd style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 6px' }}>
              <ArrowDown size={11} />
            </kbd>
            navigate
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <kbd style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 6px' }}>
              <CornerDownLeft size={11} />
            </kbd>
            run
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <kbd style={{ padding: '2px 6px' }}>esc</kbd>
            close
          </span>
          <span style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>
            {flat.length} {flat.length === 1 ? 'result' : 'results'}
          </span>
        </div>
      </div>
    </div>
  );
}
