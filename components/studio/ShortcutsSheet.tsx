import React, { useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';

interface ShortcutsSheetProps {
  open: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string[];
  desc: string;
}

interface ShortcutGroup {
  title: string;
  items: Shortcut[];
}

const GROUPS: ShortcutGroup[] = [
  {
    title: 'General',
    items: [
      { keys: ['⌘', 'K'], desc: 'Command palette' },
      { keys: ['?'], desc: 'This sheet' },
      { keys: ['Esc'], desc: 'Close overlays' },
      { keys: ['⌘', '\\'], desc: 'Toggle theme' },
    ],
  },
  {
    title: 'Generate',
    items: [
      { keys: ['⌘', '↵'], desc: 'Generate' },
      { keys: ['G'], desc: 'Studio' },
      { keys: ['C'], desc: 'Canvas' },
      { keys: ['N'], desc: 'Nodes' },
    ],
  },
  {
    title: 'Outputs',
    items: [
      { keys: ['V'], desc: 'Vary selected' },
      { keys: ['E'], desc: 'Edit on canvas' },
      { keys: ['U'], desc: 'Upscale' },
      { keys: ['Del'], desc: 'Delete' },
    ],
  },
];

export default function ShortcutsSheet({ open, onClose }: ShortcutsSheetProps) {
  // Close on Escape while the sheet is open.
  useEffect(
    function () {
      if (!open) return;
      const handler = function (e: KeyboardEvent) {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      };
      window.addEventListener('keydown', handler);
      return function () {
        window.removeEventListener('keydown', handler);
      };
    },
    [open, onClose]
  );

  if (!open) return null;

  return (
    <div
      className="modal-scrim"
      onMouseDown={function (e) {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-label="Keyboard shortcuts"
        style={{ width: 520 }}
        onMouseDown={function (e) {
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 22,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                color: 'var(--pink-soft)',
                background: 'var(--accent-soft)',
                border: '1px solid var(--line-strong)',
              }}
            >
              <Keyboard size={18} />
            </div>
            <h2 style={{ margin: 0 }}>Keyboard shortcuts</h2>
          </div>
          <button className="btn icon ghost" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Groups */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {GROUPS.map(function (group) {
            return (
              <div key={group.title}>
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 750,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--pink-soft)',
                    marginBottom: 10,
                  }}
                >
                  {group.title}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {group.items.map(function (item, i) {
                    return (
                      <div
                        key={group.title + '-' + i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 16,
                          padding: '9px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--ghost)',
                          border: '1px solid var(--line)',
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13.5,
                            fontWeight: 600,
                            color: 'var(--text)',
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.desc}
                        </span>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            flexShrink: 0,
                          }}
                        >
                          {item.keys.map(function (k, ki) {
                            return (
                              <kbd
                                key={ki}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  minWidth: 24,
                                  textAlign: 'center',
                                }}
                              >
                                {k}
                              </kbd>
                            );
                          })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        <div
          style={{
            marginTop: 22,
            paddingTop: 16,
            borderTop: '1px solid var(--line)',
            fontSize: 12,
            color: 'var(--faint)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          Press <kbd style={{ padding: '2px 7px' }}>?</kbd> anytime to open this sheet ·{' '}
          <kbd style={{ padding: '2px 7px' }}>esc</kbd> to close
        </div>
      </div>
    </div>
  );
}
