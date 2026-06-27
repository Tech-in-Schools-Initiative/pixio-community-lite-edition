import { useState } from 'react';
import { KeyRound, Sparkles, X } from 'lucide-react';
import { useStudio } from '../../lib/studio/store';

export default function ApiKeyModal({ onClose }: { onClose: () => void }) {
  const apiKey = useStudio((s) => s.apiKey);
  const setApiKey = useStudio((s) => s.setApiKey);
  const [val, setVal] = useState(apiKey);

  const save = () => {
    setApiKey(val.trim());
    onClose();
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="brand-mark" style={{ width: 42, height: 42 }}><Sparkles size={20} /></div>
            <div>
              <div className="brand-title"><span className="brand-grad">Pixio Studio</span></div>
              <div className="brand-sub">Open Source</div>
            </div>
          </div>
          <button className="btn icon ghost" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        <h2>Connect your Prodia key</h2>
        <p>Pixio runs entirely on your own Prodia API key — stored only in this browser, never sent anywhere but Prodia.</p>

        <a className="link-row" href="https://app.prodia.com" target="_blank" rel="noreferrer">
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--pink-soft)' }}>Get a free API key</div>
            <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 2 }}>app.prodia.com → Sign up → API Keys</div>
          </div>
          <span style={{ color: 'var(--pink-soft)', fontSize: 16 }}>↗</span>
        </a>

        <div className="field" style={{ marginBottom: 16 }}>
          <input
            className="input"
            type="password"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && val.trim() && save()}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
            style={{ fontFamily: 'monospace' }}
            autoFocus
          />
        </div>

        <button className="btn primary" style={{ width: '100%', padding: 14 }} onClick={save} disabled={!val.trim()}>
          <KeyRound size={15} /> Save & start creating
        </button>
      </div>
    </div>
  );
}
