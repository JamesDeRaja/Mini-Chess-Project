import { useMemo, useState } from 'react';
import { Copy, Share2, Shuffle, X } from 'lucide-react';
import { buildShareMessage, getRandomShareTaunt, type ShareMessageStyle, type TauntContext } from '../game/shareTaunts.js';
import { ResultShareCard } from './ResultShareCard.js';

type Props = {
  open: boolean;
  onClose: () => void;
  result: string;
  playerName: string;
  score: number;
  moves: number;
  seedSlug: string;
  backRankCode: string;
  challengeUrl: string;
  comparisonText?: string;
  context?: TauntContext;
  style?: ShareMessageStyle;
  initialTaunt?: string;
  onUseShareText?: (shareText: string, taunt: string) => string | void | Promise<string | void>;
};

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const area = document.createElement('textarea');
  area.value = text;
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  area.remove();
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function removeTrailingUrlFromShareText(text: string, url: string) {
  return text.replace(new RegExp(`\\s*${escapeRegExp(url)}\\s*$`), '').trim();
}

export function ShareChallengeModal({ open, onClose, result, playerName, score, moves, seedSlug, backRankCode, challengeUrl, comparisonText, context = 'generic', style = 'trashTalk', initialTaunt, onUseShareText }: Props) {
  const [taunt, setTaunt] = useState(() => initialTaunt || getRandomShareTaunt(context));
  const [copyStatus, setCopyStatus] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const shareText = useMemo(() => buildShareMessage({ style, taunt, playerName, score, moves, seedSlug, backRankCode, challengeUrl, comparisonText }), [backRankCode, challengeUrl, comparisonText, moves, playerName, score, seedSlug, style, taunt]);
  if (!open) return null;
  async function resolveShareContent() {
    const resolvedUrl = await onUseShareText?.(shareText, taunt);
    const finalUrl = typeof resolvedUrl === 'string' ? resolvedUrl : challengeUrl;
    const finalShareText = finalUrl === challengeUrl
      ? shareText
      : buildShareMessage({ style, taunt, playerName, score, moves, seedSlug, backRankCode, challengeUrl: finalUrl, comparisonText });
    return { finalUrl, finalShareText };
  }
  async function copyShareText() { const { finalShareText } = await resolveShareContent(); await copyText(finalShareText); setCopyStatus('Result copied.'); }
  async function copyLink() { const { finalUrl } = await resolveShareContent(); await copyText(finalUrl); setCopyStatus('Challenge link copied.'); }
  async function nativeShare() {
    const { finalUrl, finalShareText } = await resolveShareContent();
    await copyText(finalUrl);
    setCopyStatus('Challenge link copied.');
    setShareCopied(true);
    window.setTimeout(() => setShareCopied(false), 1600);
    if (navigator.share) await navigator.share({ title: 'Pocket Shuffle Chess Challenge', text: removeTrailingUrlFromShareText(finalShareText, finalUrl), url: finalUrl });
  }
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="confirm-card share-challenge-modal" role="dialog" aria-modal="true" aria-labelledby="share-challenge-title" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close share modal"><X size={18} /></button>
        <p className="eyebrow">Challenge a Friend</p>
        <h2 id="share-challenge-title">Same seed. New roast.</h2>
        <ResultShareCard result={result} playerName={playerName} score={score} moves={moves} seedSlug={seedSlug} backRankCode={backRankCode} taunt={taunt} comparisonText={comparisonText} />
        <label className="share-preview-label"><span>Share text preview</span><textarea readOnly value={shareText} /></label>
        <p className="panel-note">Different roast, same challenge.</p>
        <div className="panel-actions centered-actions">
          <button type="button" className="secondary-action" onClick={() => setTaunt(getRandomShareTaunt(context, taunt))}><Shuffle size={17} /> Shuffle Taunt</button>
          {'share' in navigator && <button type="button" onClick={() => { void nativeShare(); }}>{shareCopied ? <Copy size={17} /> : <Share2 size={17} />} {shareCopied ? 'Copied' : 'Share Challenge'}</button>}
          <button type="button" onClick={() => { void copyShareText(); }}><Copy size={17} /> Copy Text</button>
          <button type="button" className="secondary-action" onClick={() => { void copyLink(); }}>Copy Link</button>
        </div>
        {copyStatus && <p className="panel-note" aria-live="polite">{copyStatus}</p>}
      </div>
    </div>
  );
}
