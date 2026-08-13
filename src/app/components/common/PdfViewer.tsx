import { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
// Static, and it has to be. Vite resolves `?url` at build time by static analysis;
// written as `await import('…?url')` inside the loader below it was never analysed,
// so the worker was never emitted or requested and pdf.js waited for a worker that
// could not arrive — a hang with no error, which is the worst shape of failure.
// This import costs nothing at runtime: it is a string, and the 1.4MB worker it
// points at is fetched only when a document is actually opened.
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

/**
 * A PDF rendered to canvas by pdf.js, rather than handed to the browser's viewer.
 *
 * `<object>` and `<iframe>` delegate to a plugin, and that plugin is not always
 * there: no mobile browser ships one, and even on desktop the embed is subject to
 * `X-Frame-Options` and `object-src` on the file's own response, because Chrome
 * renders an embedded PDF inside an internal frame. Both routes were tried here and
 * both fell through to a "your browser cannot display this" placeholder, which is a
 * poor thing to show on the page whose whole job is proving the product's output.
 *
 * Drawing the pages ourselves removes the dependency entirely: no plugin, no
 * framing, no header exceptions, and the same result on a phone as on a desktop.
 *
 * Pages render lazily as they approach the viewport. A sixteen-page report
 * rasterised all at once is a long freeze on a mid-range phone, and a visitor who
 * reads two pages should not pay for the other fourteen.
 */

interface PdfViewerProps {
  src: string;
  /** Accessible description of the document. */
  label: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfDoc = any;

/** Loaded once and shared: the module is ~300KB and never changes between mounts. */
let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null;

function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import('pdfjs-dist');
      // A hashed same-origin asset, which `script-src 'self'` already allows — no
      // CSP exception needed for the worker.
      pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

function PdfPage({ doc, pageNumber, width }: { doc: PdfDoc; pageNumber: number; width: number }) {
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // The opening pages draw immediately rather than waiting to be observed. They are
  // on screen the moment the document opens, so deferring them only delays the one
  // thing the visitor came for — and an IntersectionObserver does not fire at all
  // while a page is hidden or in a background tab, which would otherwise leave a
  // column of blank rectangles with nothing to trigger them.
  const [visible, setVisible] = useState(pageNumber <= 2);
  const [drawn, setDrawn] = useState(false);
  // A4 portrait until the real page reports its own ratio. Reserving the height up
  // front stops the scroll position jumping as pages resolve.
  const [aspect, setAspect] = useState(1.414);

  useEffect(() => {
    let cancelled = false;
    doc.getPage(pageNumber)
      .then((page: PdfDoc) => {
        if (cancelled) return;
        const v = page.getViewport({ scale: 1 });
        setAspect(v.height / v.width);
      })
      // Swallowed rather than surfaced: the only way this rejects is a document
      // torn down mid-flight, which the placeholder already covers. Unhandled, it
      // became the console noise that hid the real fault.
      .catch(() => { /* keep the reserved A4 box */ });
    return () => { cancelled = true; };
  }, [doc, pageNumber]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || visible) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      // Start a screenful early so a page is usually ready by the time it arrives.
      { rootMargin: '800px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || !width) return;
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let task: any = null;

    doc.getPage(pageNumber).then((page: PdfDoc) => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      // Capped at 2: beyond that the text is no crisper on any real display and the
      // canvas memory grows with the square of the ratio, which is what kills phones.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: (width / base.width) * dpr });

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      task = page.render({ canvasContext: ctx, viewport });
      return task.promise.then(() => { if (!cancelled) setDrawn(true); });
    }).catch(() => { /* a page that will not draw leaves its placeholder */ });

    return () => {
      cancelled = true;
      try { task?.cancel(); } catch { /* already settled */ }
    };
  }, [visible, width, doc, pageNumber]);

  return (
    <Box
      ref={wrapRef}
      sx={{
        position: 'relative',
        width: '100%',
        aspectRatio: `1 / ${aspect}`,
        bgcolor: '#fff',
        borderRadius: 1,
        overflow: 'hidden',
        boxShadow: mode === 'dark' ? '0 2px 18px rgba(0,0,0,.5)' : '0 2px 12px rgba(0,0,0,.14)',
      }}
    >
      <canvas
        ref={canvasRef}
        aria-label={`Page ${pageNumber}`}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      {!drawn && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <Typography sx={{ color: t.textFaint, fontSize: 13 }}>Page {pageNumber}</Typography>
        </Box>
      )}
    </Box>
  );
}

export function PdfViewer({ src, label }: PdfViewerProps) {
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const docRef = useRef<PdfDoc>(null);
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [pages, setPages] = useState(0);
  const [failed, setFailed] = useState(false);
  const [width, setWidth] = useState(0);

  // Measured, not guessed: the canvas is rasterised at a fixed pixel size, so it
  // needs the real column width to come out sharp rather than upscaled.
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadPdfjs()
      .then((pdfjs) => pdfjs.getDocument(src).promise)
      .then((d: PdfDoc) => {
        // Only a document nobody is using gets torn down here. Destroying one that
        // has already reached state is what broke this: React 18 runs effects twice
        // in development, and when the load resolved before the simulated unmount
        // the cleanup destroyed the very document the page components were holding.
        // Every getPage() then threw "reading 'getPage' of null" and the canvases
        // stayed blank — sized correctly, painted with nothing.
        if (cancelled) { try { d.destroy(); } catch { /* nothing opened */ } return; }
        docRef.current = d;
        setDoc(d);
        setPages(d.numPages);
      })
      .catch(() => { if (!cancelled) setFailed(true); });

    return () => { cancelled = true; };
  }, [src]);

  // Teardown belongs to the component's life, not the load's. Releases the worker
  // when the visitor actually leaves the page.
  useEffect(() => () => {
    try { docRef.current?.destroy(); } catch { /* already gone */ }
    docRef.current = null;
  }, []);

  if (failed) {
    return (
      <Box sx={{ p: { xs: 3, md: 5 }, textAlign: 'center', border: `1px solid ${t.border}`, borderRadius: 2 }}>
        <Typography sx={{ color: t.textSecondary, mb: 2.5 }}>
          The report could not be displayed here.
        </Typography>
        <Button component="a" href={src} target="_blank" rel="noopener" variant="contained">
          Open it in a new tab
        </Button>
      </Box>
    );
  }

  return (
    <Box ref={hostRef} aria-label={label} sx={{ width: '100%' }}>
      {!doc && (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 10, gap: 2 }}>
          <CircularProgress size={28} />
          <Typography sx={{ color: t.textFaint, fontSize: 14 }}>Loading the report…</Typography>
        </Box>
      )}

      {doc && width > 0 && (
        <Box sx={{ display: 'grid', gap: { xs: 1.5, md: 2.5 } }}>
          {Array.from({ length: pages }, (_, i) => (
            <PdfPage key={i + 1} doc={doc} pageNumber={i + 1} width={width} />
          ))}
        </Box>
      )}
    </Box>
  );
}
