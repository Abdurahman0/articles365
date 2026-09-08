"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const RENDER_W = 1500; // render resolution; CSS scales to the column width

// Render every PDF page to a canvas and stack them vertically (edge-to-edge),
// so the whole issue reads as one continuous scroll of page images. The PDF is
// unchanged — each page is drawn exactly as-is.
export function IssuePages({ pdfUrl }: { pdfUrl: string }) {
  const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(0);
  const canvases = useRef<Map<number, HTMLCanvasElement>>(new Map());

  useEffect(() => {
    let cancelled = false;
    let doc: { numPages: number; getPage: (n: number) => Promise<unknown>; destroy: () => Promise<void> } | null = null;
    (async () => {
      try {
        const buf = await (await fetch(pdfUrl)).arrayBuffer();
        if (cancelled) return;
        const params = { data: new Uint8Array(buf), isEvalSupported: false };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        doc = await pdfjsLib.getDocument(params as any).promise as any;
        if (cancelled || !doc) return;
        setCount(doc.numPages);
        setPhase("ready");
        // wait a tick for the canvases to mount, then render each page in order
        for (let p = 1; p <= doc.numPages; p++) {
          if (cancelled) return;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const page = (await doc.getPage(p)) as any;
          const base = page.getViewport({ scale: 1 });
          const vp = page.getViewport({ scale: RENDER_W / base.width });
          // ensure the canvas exists (retry briefly if React hasn't committed yet)
          let canvas = canvases.current.get(p);
          for (let t = 0; !canvas && t < 20; t++) { await new Promise((r) => setTimeout(r, 50)); canvas = canvases.current.get(p); }
          if (!canvas) continue;
          canvas.width = Math.floor(vp.width);
          canvas.height = Math.floor(vp.height);
          const ctx = canvas.getContext("2d");
          if (ctx) await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise;
          page.cleanup?.();
          if (!cancelled) setDone((d) => Math.max(d, p));
        }
      } catch { if (!cancelled) setPhase("error"); }
    })();
    return () => { cancelled = true; doc?.destroy?.().catch(() => {}); };
  }, [pdfUrl]);

  if (phase === "error") {
    return <div className="grid min-h-[50vh] place-items-center text-sm text-muted-foreground">Couldn&apos;t open this issue.</div>;
  }

  return (
    <div className="relative">
      {phase === "loading" && (
        <div className="grid min-h-[50vh] place-items-center">
          <Loader2 className="size-7 animate-spin text-primary" />
        </div>
      )}

      {/* pages stacked edge-to-edge */}
      <div className="mx-auto w-full max-w-[860px] overflow-hidden rounded-2xl border border-border bg-white shadow-[var(--shadow-soft)]">
        {Array.from({ length: count }, (_, i) => i + 1).map((p) => (
          <canvas
            key={p}
            ref={(el) => { if (el) canvases.current.set(p, el); else canvases.current.delete(p); }}
            className="block w-full"
            style={{ height: "auto" }}
          />
        ))}
      </div>

      {phase === "ready" && done < count && (
        <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Rendering pages… {done}/{count}
        </p>
      )}
    </div>
  );
}
