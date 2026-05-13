import { useState } from 'react';
import { getDefaultDisplayName, saveDisplayName } from '../game/localPlayer.js';

type Props = { open: boolean; onComplete: (name: string) => void };

export function NameGateModal({ open, onComplete }: Props) {
  const [name, setName] = useState<string>(() => getDefaultDisplayName());
  if (!open) return null;
  function submit() {
    const saved = saveDisplayName(name);
    onComplete(saved);
  }
  return (
    <div className="modal-backdrop name-gate-backdrop" role="presentation">
      <section className="confirm-card name-gate-card" role="dialog" aria-modal="true" aria-labelledby="name-gate-title">
        <p className="eyebrow">Before your first match</p>
        <h2 id="name-gate-title">What should we call you?</h2>
        <p>We use this name for automatic score submits, streaks, and challenge shares. You can edit it later on result screens.</p>
        <label className="name-capture-form">
          <span>Your name</span>
          <input value={name} maxLength={20} autoFocus onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submit(); }} />
        </label>
        <div className="panel-actions centered-actions">
          <button type="button" onClick={submit}>Save and play</button>
        </div>
      </section>
    </div>
  );
}
