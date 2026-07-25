/**
 * Turn a DOM element into a shareable PNG. html2canvas is heavy (~200KB) and
 * already bundled for PDF export, so it's imported on demand here too.
 */
export async function captureToBlob(el: HTMLElement, background: string): Promise<Blob> {
  // Wait for the web fonts to load, otherwise html2canvas measures with the
  // fallback font and the (mono, tightly-tracked) numbers clip to garbage.
  try { await (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts?.ready; } catch { /* ignore */ }

  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(el, {
    backgroundColor: background,
    scale: Math.min(2, window.devicePixelRatio || 1) * 1.5,
    useCORS: true,
    logging: false,
    // Negative letter-spacing on tabular figures confuses html2canvas' glyph
    // placement; neutralise it (and prevent wrapping) only in the capture.
    onclone: (doc) => {
      const style = doc.createElement('style');
      style.textContent = '.tabular-nums{letter-spacing:normal !important;white-space:nowrap !important;}';
      doc.head.appendChild(style);
    },
  });
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create image'))), 'image/png'),
  );
}

export type ShareResult = 'shared' | 'downloaded' | 'copied';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Touch-primary device (phone/tablet) — where the native share sheet is useful. */
function isTouchDevice(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(pointer: coarse)').matches &&
    (navigator.maxTouchPoints ?? 0) > 0
  );
}

/**
 * Get the image to the user reliably.
 *  - Phone/tablet: native share sheet → straight to a WhatsApp/Telegram group.
 *  - Desktop: copy to the clipboard (paste into WhatsApp Web / Telegram), and
 *    if that isn't available, download the PNG. We deliberately DON'T use
 *    navigator.share on desktop — it opens an empty Windows "share" panel that
 *    looks broken, and cancelling it leaves nothing behind.
 */
export async function shareImage(blob: Blob, filename: string, text?: string): Promise<ShareResult> {
  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as Navigator & {
    canShare?: (d: unknown) => boolean;
    share?: (d: unknown) => Promise<void>;
  };

  if (isTouchDevice() && nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title: filename, text });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'shared';
      // otherwise fall through to a download so something still happens
    }
  }

  // Desktop: clipboard first (nicest for pasting into a chat), else download.
  try {
    const ClipItem = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
    if (ClipItem && navigator.clipboard && 'write' in navigator.clipboard) {
      await navigator.clipboard.write([new ClipItem({ 'image/png': blob })]);
      return 'copied';
    }
  } catch { /* clipboard blocked — fall through to a guaranteed download */ }

  downloadBlob(blob, filename);
  return 'downloaded';
}

/**
 * Share a plain-text report.
 *  - Phone/tablet: native share sheet → straight into a chat.
 *  - Desktop: copy to clipboard (paste into the chat), else download a .txt.
 * Text is far more robust to share than an image and pastes cleanly.
 */
export async function shareText(text: string, title: string): Promise<ShareResult> {
  const nav = navigator as Navigator & { share?: (d: unknown) => Promise<void> };

  if (isTouchDevice() && nav.share) {
    try {
      await nav.share({ text, title });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'shared';
    }
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return 'copied';
    }
  } catch { /* fall through to download */ }

  downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), `${title.replace(/[^\w-]+/g, '-')}.txt`);
  return 'downloaded';
}
