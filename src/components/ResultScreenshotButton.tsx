import { useMemo, useRef, useState } from 'react';
import { toBlob } from 'html-to-image';
import { Camera, Copy, Download, Share2 } from 'lucide-react';

type Props = { title: string; summary: string; score: number; moves: number; seed: string; setup?: string | null };

async function writeImageToClipboard(blob: Blob) {
  const ClipboardItemCtor = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
  if (!navigator.clipboard || !ClipboardItemCtor) throw new Error('Image clipboard unavailable');
  await navigator.clipboard.write([new ClipboardItemCtor({ [blob.type]: blob })]);
}

function shouldIncludeInScreenshot(node: HTMLElement) {
  return !node.classList?.contains('result-screenshot-dropdown') && !node.classList?.contains('result-screenshot-status');
}

export function ResultScreenshotButton({ title, summary, seed }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('');
  const menuRef = useRef<HTMLDivElement | null>(null);
  const fileName = useMemo(() => `pocket-shuffle-${seed || 'result'}.png`.replace(/[^a-z0-9.-]+/gi, '-').toLowerCase(), [seed]);

  function getScreenshotTarget() {
    return menuRef.current?.closest('.winner-card') as HTMLElement | null;
  }

  async function getBlob() {
    const target = getScreenshotTarget();
    if (!target) throw new Error('Result card unavailable');
    const blob = await toBlob(target, {
      cacheBust: true,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      filter: (node) => node instanceof HTMLElement ? shouldIncludeInScreenshot(node) : true,
    });
    if (!blob) throw new Error('Screenshot unavailable');
    return blob;
  }

  async function copyImage() {
    await writeImageToClipboard(await getBlob());
    setStatus('Screenshot copied. Use Ctrl+V to paste it.');
  }

  async function downloadImage() {
    const url = URL.createObjectURL(await getBlob());
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
    setStatus('Screenshot downloaded.');
  }

  async function shareImage() {
    const blob = await getBlob();
    const file = new File([blob], fileName, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] }) && navigator.share) await navigator.share({ title, text: summary, files: [file] });
    else await downloadImage();
  }

  return (
    <div className="result-screenshot-menu" ref={menuRef}>
      <button type="button" className="secondary-action" onClick={() => setOpen((value) => !value)} aria-expanded={open}><Camera size={17} /> Screenshot</button>
      {open && (
        <div className="result-screenshot-dropdown">
          {'share' in navigator && <button type="button" onClick={() => { void shareImage().catch(() => setStatus('Image share is not supported here.')); }}><Share2 size={16} /> Share image</button>}
          <button type="button" onClick={() => { void copyImage().catch(() => { setStatus('Clipboard image copy is not supported here.'); }); }}><Copy size={16} /> Copy image</button>
          <button type="button" onClick={() => { void downloadImage().catch(() => setStatus('Screenshot download is not supported here.')); }}><Download size={16} /> Download</button>
        </div>
      )}
      <span className="result-screenshot-status" aria-live="polite">{status}</span>
    </div>
  );
}
