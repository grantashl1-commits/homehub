import { useEffect, useRef, useState } from "react";
import { Eraser, Trash2, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { mediaUrl, saveMedia } from "@/lib/media";

const INKS = ["#23263b", "#ee7b5b", "#f2b62f", "#4fa86a", "#3d8bd0", "#9b72d8"];

/** A finger-drawing pad for little ones. Saves a PNG to the device. */
export function DoodlePad({ onSaved, paper = "#fff8c8" }: { onSaved: (mediaId: string) => void; paper?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ink, setInk] = useState(INKS[1]);
  const [eraser, setEraser] = useState(false);
  const strokes = useRef<ImageData[]>([]);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const c = canvas.current!;
    const ratio = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * ratio;
    c.height = rect.height * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, [paper]);

  const pos = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const down = (e: React.PointerEvent) => {
    const c = canvas.current!;
    c.setPointerCapture(e.pointerId);
    const ctx = c.getContext("2d")!;
    strokes.current.push(ctx.getImageData(0, 0, c.width, c.height));
    if (strokes.current.length > 20) strokes.current.shift();
    drawing.current = true;
    last.current = pos(e);
    dot(last.current);
  };

  const dot = (p: { x: number; y: number }) => {
    const ctx = canvas.current!.getContext("2d")!;
    ctx.fillStyle = eraser ? paper : ink;
    ctx.beginPath();
    ctx.arc(p.x, p.y, eraser ? 14 : 5, 0, Math.PI * 2);
    ctx.fill();
    setHasInk(true);
  };

  const move = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current) return;
    const p = pos(e);
    const ctx = canvas.current!.getContext("2d")!;
    ctx.strokeStyle = eraser ? paper : ink;
    ctx.lineWidth = eraser ? 28 : 10;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };

  const up = () => {
    drawing.current = false;
    last.current = null;
  };

  const undo = () => {
    const prev = strokes.current.pop();
    if (prev) canvas.current!.getContext("2d")!.putImageData(prev, 0, 0);
  };

  const clear = () => {
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    const rect = c.getBoundingClientRect();
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, rect.width, rect.height);
    strokes.current = [];
    setHasInk(false);
  };

  const save = () => {
    canvas.current!.toBlob(async (b) => {
      if (b) onSaved(await saveMedia(b));
    }, "image/png");
  };

  return (
    <div className="flex flex-col gap-4">
      <canvas
        ref={canvas}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className="h-[24rem] w-full touch-none rounded-[1.5rem] shadow-inner ring-2 ring-black/5"
        style={{ background: paper }}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {INKS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label="Choose colour"
              onClick={() => {
                setInk(c);
                setEraser(false);
              }}
              className={cn("tap size-[3.6rem] rounded-full ring-[0.25rem] ring-transparent", !eraser && ink === c && "ring-ink/70")}
              style={{ background: c }}
            />
          ))}
          <button
            type="button"
            aria-label="Rubber"
            onClick={() => setEraser((v) => !v)}
            className={cn("tap grid size-[3.6rem] place-items-center rounded-full bg-white ring-[0.25rem] ring-transparent", eraser && "ring-ink/70")}
          >
            <Eraser className="size-6" />
          </button>
        </div>
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={undo} aria-label="Undo" className="tap grid size-[3.6rem] place-items-center rounded-full bg-white">
            <Undo2 className="size-6" />
          </button>
          <button type="button" onClick={clear} aria-label="Start again" className="tap grid size-[3.6rem] place-items-center rounded-full bg-white">
            <Trash2 className="size-6" />
          </button>
          <button
            type="button"
            disabled={!hasInk}
            onClick={save}
            className="tap min-h-[4rem] rounded-full bg-sage px-8 text-[1.4rem] font-extrabold text-white disabled:opacity-40"
          >
            Use my drawing ✓
          </button>
        </div>
      </div>
    </div>
  );
}

export function DoodleImage({ mediaId, className }: { mediaId: string; className?: string }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let alive = true;
    void mediaUrl(mediaId).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [mediaId]);
  if (!url) return <div className={cn("skeleton rounded-xl", className)} />;
  return <img src={url} alt="A drawing" className={cn("rounded-xl object-contain", className)} draggable={false} />;
}
