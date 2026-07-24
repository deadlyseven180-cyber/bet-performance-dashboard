/**
 * Turn a DOM element into a shareable PNG. html2canvas is heavy (~200KB) and
 * already bundled for PDF export, so it's imported on demand here too.
 */
export async function captureToBlob(el: HTMLElement, background: string): Promise<Blob> {
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(el, {
    backgroundColor: background,
    scale: Math.min(2, window.devicePixelRatio || 1) * 1.5,
    useCORS: true,
    logging: false,
    windowWidth: el.scrollWidth,
  });
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create image'))), 'image/png'),
  );
}

export type ShareResult = 'shared' | 'downloaded' | 'copied';

/**
 * Prefer the native share sheet (so it can go straight to a WhatsApp/Telegram
 * group on a phone). Falls back to copying to the clipboard, then to a plain
 * download on desktops without file-share support.
 */
export async function shareImage(blob: Blob, filename: string, text?: string): Promise<ShareResult> {
  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as Navigator & {
    canShare?: (d: unknown) => boolean;
    share?: (d: unknown) => Promise<void>;
  };

  if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title: filename, text });
      return 'shared';
    } catch (err) {
      // User cancelled the share sheet — treat as handled, don't also download.
      if (err instanceof DOMException && err.name === 'AbortError') return 'shared';
    }
  }

  // Try the clipboard (nice on desktop — paste straight into a chat).
  try {
    const ClipItem = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
    if (ClipItem && navigator.clipboard && 'write' in navigator.clipboard) {
      await navigator.clipboard.write([new ClipItem({ 'image/png': blob })]);
      return 'copied';
    }
  } catch { /* fall through to download */ }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return 'downloaded';
}
