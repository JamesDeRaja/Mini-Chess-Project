import { useMemo, useState } from 'react';
import { Camera, Copy, Download, Share2 } from 'lucide-react';

type Props = { title: string; summary: string; score: number; moves: number; seed: string; setup?: string | null };

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, payload] = dataUrl.split(',');
  const mime = meta.match(/:(.*?);/)?.[1] ?? 'image/png';
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime });
}

async function writeImageToClipboard(blob: Blob) {
  const ClipboardItemCtor = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
  if (!navigator.clipboard || !ClipboardItemCtor) throw new Error('Image clipboard unavailable');
  await navigator.clipboard.write([new ClipboardItemCtor({ [blob.type]: blob })]);
}

export function ResultScreenshotButton({ title, summary, score, moves, seed, setup }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('');
  const fileName = useMemo(() => `pocket-shuffle-${seed || 'result'}.png`.replace(/[^a-z0-9.-]+/gi, '-').toLowerCase(), [seed]);

  function renderPng() {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 675;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    const gradient = ctx.createLinearGradient(0, 0, 1200, 675);
    gradient.addColorStop(0, '#fff8e9');
    gradient.addColorStop(1, '#cfe8de');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 675);
    ctx.fillStyle = 'rgba(45,43,40,.08)';
    ctx.fillRect(70, 70, 1060, 535);
    ctx.fillStyle = '#fffdf5';
    ctx.fillRect(58, 58, 1060, 535);
    ctx.fillStyle = '#2d2f33';
    ctx.font = '900 76px system-ui, sans-serif';
    ctx.fillText(title, 110, 170);
    ctx.fillStyle = '#4f735f';
    ctx.font = '900 150px system-ui, sans-serif';
    ctx.fillText(String(score), 110, 350);
    ctx.fillStyle = '#647067';
    ctx.font = '800 38px system-ui, sans-serif';
    ctx.fillText(`Score · ${moves} moves`, 110, 410);
    ctx.fillText(`Seed: ${seed}`, 110, 475);
    ctx.fillText(`Setup: ${setup ?? '—'}`, 110, 530);
    ctx.fillStyle = '#2d2b28';
    ctx.font = '800 30px system-ui, sans-serif';
    const trimmed = summary.length > 82 ? `${summary.slice(0, 79)}…` : summary;
    ctx.fillText(trimmed, 110, 575);
    ctx.fillStyle = '#b89529';
    ctx.font = '900 32px system-ui, sans-serif';
    ctx.fillText('Pocket Shuffle Chess', 750, 530);
    return canvas.toDataURL('image/png');
  }

  async function getBlob() { return dataUrlToBlob(renderPng()); }
  async function copyImage() { await writeImageToClipboard(await getBlob()); setStatus('Screenshot copied. Use Ctrl+V to paste it.'); }
  async function downloadImage() {
    const link = document.createElement('a');
    link.href = renderPng();
    link.download = fileName;
    link.click();
    setStatus('Screenshot downloaded.');
  }
  async function shareImage() {
    const blob = await getBlob();
    const file = new File([blob], fileName, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] }) && navigator.share) await navigator.share({ title: 'Pocket Shuffle Chess Result', text: summary, files: [file] });
    else await downloadImage();
  }

  return (
    <div className="result-screenshot-menu">
      <button type="button" className="secondary-action" onClick={() => setOpen((value) => !value)} aria-expanded={open}><Camera size={17} /> Screenshot</button>
      {open && (
        <div className="result-screenshot-dropdown">
          {'share' in navigator && <button type="button" onClick={() => { void shareImage(); }}><Share2 size={16} /> Share image</button>}
          <button type="button" onClick={() => { void copyImage().catch(() => { setStatus('Clipboard image copy is not supported here.'); }); }}><Copy size={16} /> Copy image</button>
          <button type="button" onClick={() => { void downloadImage(); }}><Download size={16} /> Download</button>
        </div>
      )}
      {status && <p className="panel-note" aria-live="polite">{status}</p>}
    </div>
  );
}
