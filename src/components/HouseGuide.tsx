/**
 * The house guide on the guest screen, styled after the One Eleven digital
 * guidebook (carlsonproperties.co.nz/guest-info): Japandi ivory and
 * charcoal, Fraunces headings, a chapter rail with progress, a photo beside
 * each chapter, sub-tabs for how-tos and places, and picture cards.
 *
 * Built for a touch screen on a wall rather than a phone: big targets, swipe
 * or arrow keys to turn the page, read-aloud, a tickable check-out list, and
 * links shown as QR codes so guests open them on their own phone.
 * Content lives in src/content/guides.ts.
 */
import "@fontsource-variable/fraunces/full.css";
import "@fontsource-variable/figtree/index.css";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import QRCode from "qrcode";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Phone, Volume2, X } from "lucide-react";
import type { Guide, GuideBlock, GuideCard, GuideSection, GuideTab } from "@/content/guides";
import { speak } from "@/lib/device";
import { cn } from "@/lib/utils";

/* One Eleven's Japandi palette. */
const C = {
  ivory: "#F3F0E9",
  chalk: "#E2DED5",
  charcoal: "#292D2D",
  deep: "#1C1D1F",
  bronze: "#AA9474",
  bronzeDeep: "#6E5E49",
  oak: "#C9C3B8",
  border: "#D5CFC4",
  slate: "#5b6166",
};
const SERIF: CSSProperties = {
  fontFamily: "'Fraunces Variable', Georgia, serif",
  fontVariationSettings: '"SOFT" 100, "WONK" 0',
  letterSpacing: "-0.02em",
};
const SANS: CSSProperties = { fontFamily: "'Figtree Variable', 'Nunito Sans Variable', system-ui, sans-serif" };

export function HouseGuide({ guide, onClose }: { guide: Guide; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [card, setCard] = useState<GuideCard | null>(null);
  const [photo, setPhoto] = useState<{ src: string; caption: string } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const section = guide.sections[index];
  const total = guide.sections.length;

  const go = useCallback(
    (next: number) => {
      if (next < 0 || next >= total || next === index) return;
      setDir(next > index ? 1 : -1);
      setIndex(next);
      scroller.current?.scrollTo({ top: 0 });
    },
    [index, total],
  );
  const goTo = (id: string) => go(guide.sections.findIndex((s) => s.id === id));

  // A guide reads like a book: arrow keys turn the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (card || photo) {
        if (e.key === "Escape") {
          setCard(null);
          setPhoto(null);
        }
        return;
      }
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, card, photo, onClose]);

  // …and a sideways swipe on the page does the same.
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => (swipe.current = { x: e.clientX, y: e.clientY });
  const onPointerUp = (e: React.PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 90 && Math.abs(dx) > Math.abs(dy) * 1.6) go(index + (dx < 0 ? 1 : -1));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden" style={{ ...SANS, background: C.ivory, color: C.charcoal }}>
      {/* Title bar */}
      <header className="flex shrink-0 items-center gap-[1.4rem] px-[2rem] pb-[1rem] pt-[1.4rem]">
        <RoundButton label="Back to the welcome screen" onClick={onClose}>
          <ArrowLeft className="size-7" strokeWidth={2.2} />
        </RoundButton>
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="h-px w-10" style={{ background: C.charcoal }} />
            <span className="text-[1rem] font-black uppercase tracking-[0.45em]">{guide.name}</span>
          </div>
          <p className="mt-0.5 whitespace-nowrap text-[2.6rem] leading-none" style={SERIF}>
            Guest <span className="italic">Guide.</span>
          </p>
        </div>
        <div className="ml-[1rem] flex min-w-0 gap-2 overflow-hidden">
          {guide.essentials.map((e) => (
            <button
              key={e.label}
              type="button"
              onClick={() => goTo(e.section)}
              className="tap flex h-[3.8rem] shrink-0 items-center gap-2 whitespace-nowrap rounded-[1.2rem] border bg-white px-3.5 text-[1.1rem] font-extrabold shadow-sm"
              style={{ borderColor: `${C.charcoal}26` }}
            >
              <span className="text-[1.3rem] leading-none">{e.emoji}</span>
              {e.label}
            </button>
          ))}
        </div>
        <RoundButton className="ml-auto" label={`Read ${section.title} aloud`} onClick={() => speak(sectionText(section))}>
          <Volume2 className="size-7" />
        </RoundButton>
      </header>

      <div className="flex min-h-0 flex-1 gap-[1.6rem] px-[2rem] pb-[1.6rem]">
        {/* Chapter rail */}
        <aside className="flex w-[25rem] shrink-0 flex-col">
          <div className="px-2 pb-3">
            <p className="text-[0.95rem] font-black uppercase tracking-[0.4em]" style={{ color: C.slate }}>
              Guide chapters
            </p>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-[0.35rem] flex-1 overflow-hidden rounded-full" style={{ background: C.chalk }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: C.charcoal }}
                  animate={{ width: `${((index + 1) / total) * 100}%` }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <span className="font-mono text-[1rem] tabular-nums" style={{ color: C.slate }}>
                {index + 1}/{total}
              </span>
            </div>
          </div>
          <nav aria-label="Guide chapters" className="no-scrollbar flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pb-2">
            {guide.sections.map((s, i) => {
              const on = i === index;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => go(i)}
                  aria-current={on ? "true" : undefined}
                  ref={on ? (el) => el?.scrollIntoView({ block: "nearest", behavior: "smooth" }) : undefined}
                  className={cn(
                    "tap flex min-h-[3.7rem] shrink-0 items-center gap-3 rounded-[1.1rem] px-4 text-left transition-colors",
                    on ? "text-white shadow-lg" : "bg-white/60",
                  )}
                  style={on ? { background: C.charcoal } : undefined}
                >
                  <span className="w-[2.2rem] text-[1rem] tabular-nums opacity-60" style={SERIF}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[1.35rem] leading-none">{s.emoji}</span>
                  <span className="min-w-0 flex-1 truncate text-[1.25rem] font-bold tracking-wide">{s.title}</span>
                  {on && <ChevronRight className="size-5 shrink-0" />}
                </button>
              );
            })}
          </nav>
          <div className="mt-2 shrink-0 rounded-[1.4rem] px-[1.3rem] py-[1rem] text-white" style={{ background: C.deep }}>
            <div className="flex items-center gap-3">
              <Phone className="size-6 shrink-0" style={{ color: C.bronze }} />
              <p className="text-[1.6rem] leading-none" style={SERIF}>
                Need help?
              </p>
            </div>
            <p className="mt-1 text-[1.05rem] leading-snug text-white/70">{guide.host.names} are a call or text away.</p>
            <p className="mt-1 text-[1.6rem] font-black tracking-wide" style={{ color: C.oak }}>
              {guide.host.phone}
            </p>
          </div>
        </aside>

        {/* The page */}
        <main
          ref={scroller}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          className="no-scrollbar min-h-0 flex-1 overflow-y-auto rounded-[1.8rem] bg-white shadow-[0_20px_60px_-30px_rgba(41,45,45,0.35)]"
        >
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={section.id}
              custom={dir}
              initial={{ opacity: 0, x: 40 * dir }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 * dir }}
              transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
              className="p-[2.4rem]"
            >
              <div className="flex items-center gap-3" style={{ color: C.bronzeDeep }}>
                <span className="text-[1.3rem] leading-none">{section.emoji}</span>
                <span className="text-[1rem] font-black uppercase tracking-[0.4em]">{guide.eyebrow}</span>
              </div>
              <h2 className="mb-[1.6rem] mt-2 text-[3.8rem] leading-[1.02]" style={SERIF}>
                {section.heading ?? section.title}
              </h2>

              {section.image ? (
                <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] items-start gap-[2rem]">
                  <Blocks blocks={section.blocks} onCard={setCard} onPhoto={setPhoto} />
                  <div className="sticky top-0">
                    <Photo src={section.image} alt={section.title} emoji={section.emoji} className="aspect-[4/5] w-full rounded-[1.6rem] shadow-2xl" />
                  </div>
                </div>
              ) : (
                <Blocks blocks={section.blocks} onCard={setCard} onPhoto={setPhoto} />
              )}

              {/* Turn the page */}
              <div className="mt-[2.4rem] flex items-center gap-3 border-t pt-[1.6rem]" style={{ borderColor: C.chalk }}>
                {index > 0 && (
                  <PageButton onClick={() => go(index - 1)}>
                    <ArrowLeft className="size-6" /> {guide.sections[index - 1].title}
                  </PageButton>
                )}
                {index < total - 1 && (
                  <PageButton dark className="ml-auto" onClick={() => go(index + 1)}>
                    {guide.sections[index + 1].title} <ArrowRight className="size-6" />
                  </PageButton>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {card && <CardSheet card={card} onClose={() => setCard(null)} />}
        {photo && <Lightbox photo={photo} onClose={() => setPhoto(null)} />}
      </AnimatePresence>
    </div>
  );
}

/* ── Blocks ─────────────────────────────────────────────────────────── */

type Open = { onCard: (c: GuideCard) => void; onPhoto: (p: { src: string; caption: string }) => void };

function Blocks({ blocks, ...open }: { blocks: GuideBlock[] } & Open) {
  return (
    <div className="flex min-w-0 flex-col gap-[1.6rem]">
      {blocks.map((b, i) => (
        <Block key={i} block={b} {...open} />
      ))}
    </div>
  );
}

function Title({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-[2rem] leading-none" style={SERIF}>
      {children}
    </p>
  );
}

function Block({ block, onCard, onPhoto }: { block: GuideBlock } & Open) {
  switch (block.kind) {
    case "text":
      return <p className="text-[1.4rem] leading-relaxed" style={{ color: C.slate }}>{block.text}</p>;

    case "quote":
      return (
        <figure>
          <blockquote className="text-[1.75rem] italic leading-[1.45]" style={{ ...SERIF, color: C.slate, fontWeight: 300 }}>
            “{block.text}”
          </blockquote>
          {block.signature && (
            <figcaption className="mt-5 border-t pt-5 text-[2.4rem]" style={{ ...SERIF, borderColor: C.chalk }}>
              {block.signature}
            </figcaption>
          )}
        </figure>
      );

    case "facts":
      return (
        <div className={cn("grid gap-3", block.facts.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
          {block.facts.map((f) => (
            <div key={f.label} className="min-w-0 rounded-[1.3rem] border p-[1.3rem]" style={{ borderColor: C.chalk, background: `${C.ivory}99` }}>
              <p className="text-[0.95rem] font-black uppercase tracking-[0.3em]" style={{ color: C.bronzeDeep }}>
                {f.label}
              </p>
              <p className="mt-1 leading-tight [overflow-wrap:anywhere]" style={{ ...SERIF, fontSize: f.value.length > 18 ? "1.6rem" : "2.6rem" }}>
                {f.value}
              </p>
              {f.note && <p className="mt-1.5 text-[1.2rem] leading-snug" style={{ color: C.slate }}>{f.note}</p>}
            </div>
          ))}
        </div>
      );

    case "steps":
      return (
        <div>
          {block.title && <Title>{block.title}</Title>}
          <ol className="flex flex-col gap-3">
            {block.steps.map((s, i) => (
              <li key={i} className="flex gap-4">
                <span className="grid size-[2.8rem] shrink-0 place-items-center rounded-full text-[1.3rem] text-white" style={{ ...SERIF, background: C.charcoal }}>
                  {i + 1}
                </span>
                <span className="min-w-0 pt-0.5">
                  <span className="block text-[1.4rem] font-extrabold leading-tight">{s.title}</span>
                  {s.text && <span className="block text-[1.25rem] leading-snug" style={{ color: C.slate }}>{s.text}</span>}
                </span>
              </li>
            ))}
          </ol>
        </div>
      );

    case "bullets":
      return (
        <div>
          {block.title && <Title>{block.title}</Title>}
          <ul className="flex flex-col gap-2">
            {block.items.map((t, i) => (
              <li key={i} className="flex gap-3 text-[1.3rem] leading-snug" style={{ color: C.slate }}>
                <span className="mt-[0.6rem] h-px w-4 shrink-0" style={{ background: C.bronze }} />
                <span className="min-w-0">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      );

    case "cards": {
      const pictured = block.cards.some((c) => c.image);
      return (
        <div>
          {block.title && <Title>{block.title}</Title>}
          {pictured ? (
            <div className="grid grid-cols-3 gap-[1.2rem]">
              {block.cards.map((c) => (
                <PlaceCard key={c.title} card={c} onOpen={() => onCard(c)} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {block.cards.map((c) => {
                const Tag = c.href ? "button" : "div";
                return (
                  <Tag
                    key={c.title}
                    {...(c.href ? { type: "button" as const, onClick: () => onCard(c) } : {})}
                    className={cn("rounded-[1.2rem] border p-[1.2rem] text-left", c.href && "tap")}
                    style={{ borderColor: C.chalk, background: `${C.ivory}99` }}
                  >
                    <p className="text-[1.3rem] font-extrabold leading-tight">{c.title}</p>
                    <p className="mt-1 text-[1.15rem] leading-snug" style={{ color: C.slate }}>{c.text}</p>
                  </Tag>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    case "checklist":
      return <Checklist items={block.items} />;

    case "callout":
      return (
        <div className="rounded-[1.3rem] border-l-[0.35rem] p-[1.3rem]" style={{ borderColor: C.bronze, background: C.ivory }}>
          {block.title && <p className="text-[1.5rem] font-extrabold leading-tight">{block.title}</p>}
          <p className={cn("text-[1.25rem] leading-relaxed", block.title && "mt-1")} style={{ color: C.slate }}>{block.text}</p>
        </div>
      );

    case "call":
      return (
        <div className="flex items-center gap-[2rem] rounded-[1.6rem] p-[2rem] text-white" style={{ background: C.deep }}>
          <div>
            <p className="text-[1rem] font-black uppercase tracking-[0.4em]" style={{ color: C.bronze }}>
              {block.label}
            </p>
            <p className="whitespace-nowrap text-[5rem] leading-none" style={SERIF}>
              Call {block.number}
            </p>
          </div>
          {block.note && <p className="max-w-[24rem] text-[1.3rem] leading-snug text-white/75">{block.note}</p>}
        </div>
      );

    case "gallery":
      return (
        <div className="grid grid-cols-3 gap-[1rem]">
          {block.photos.map((p) => (
            <button key={p.src} type="button" onClick={() => onPhoto(p)} className="tap group text-left">
              <Photo src={p.src} alt={p.caption} emoji="🏡" className="aspect-[4/3] w-full rounded-[1.1rem]" />
              <p className="mt-1.5 text-[1.1rem] font-bold" style={{ color: C.slate }}>{p.caption}</p>
            </button>
          ))}
        </div>
      );

    case "tabs":
      return <Tabs tabs={block.tabs} onCard={onCard} onPhoto={onPhoto} />;

    case "links":
      return (
        <div className="flex flex-wrap gap-3">
          {block.links.map((l) => (
            <button
              key={l.href}
              type="button"
              onClick={() => onCard({ title: l.label, text: l.note ?? "Scan to open it on your phone.", href: l.href })}
              className="tap flex h-[4rem] items-center gap-2 rounded-full px-6 text-[1.2rem] font-extrabold uppercase tracking-[0.12em] text-white"
              style={{ background: C.charcoal }}
            >
              {l.label} <ArrowRight className="size-5" />
            </button>
          ))}
        </div>
      );

    default:
      return null;
  }
}

function Tabs({ tabs, ...open }: { tabs: GuideTab[] } & Open) {
  const [active, setActive] = useState(0);
  const tab = tabs[active] ?? tabs[0];
  return (
    <div>
      <div className="mb-[1.4rem] flex flex-wrap gap-2">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            type="button"
            onClick={() => setActive(i)}
            aria-pressed={i === active}
            className="tap flex h-[4rem] items-center gap-2 rounded-[1.1rem] border-2 px-5 text-[1.15rem] font-black uppercase tracking-[0.14em]"
            style={i === active ? { background: C.charcoal, borderColor: C.charcoal, color: "white" } : { borderColor: C.chalk, color: C.slate, background: "white" }}
          >
            {t.emoji && <span className="text-[1.3rem] leading-none">{t.emoji}</span>}
            {t.label}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
          {tab.image ? (
            <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] items-start gap-[1.8rem]">
              <Blocks blocks={tab.blocks} {...open} />
              <Photo src={tab.image} alt={tab.label} emoji={tab.emoji ?? "🏡"} className="sticky top-0 aspect-[4/5] w-full rounded-[1.5rem] shadow-xl" />
            </div>
          ) : (
            <Blocks blocks={tab.blocks} {...open} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Checklist({ items }: { items: string[] }) {
  const [done, setDone] = useState<Set<number>>(() => new Set());
  const toggle = (i: number) =>
    setDone((d) => {
      const n = new Set(d);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  return (
    <div>
      <ul className="flex flex-col">
        {items.map((t, i) => {
          const on = done.has(i);
          return (
            <li key={i}>
              <button type="button" onClick={() => toggle(i)} aria-pressed={on} className="tap flex min-h-[4rem] w-full items-center gap-4 border-b py-2 text-left" style={{ borderColor: C.chalk }}>
                <span
                  className="grid size-[2.4rem] shrink-0 place-items-center rounded-[0.7rem] border-2 transition-colors"
                  style={on ? { background: C.charcoal, borderColor: C.charcoal, color: "white" } : { borderColor: C.oak }}
                >
                  {on && <Check className="size-5" strokeWidth={3} />}
                </span>
                <span className={cn("min-w-0 text-[1.35rem] font-semibold leading-snug", on && "line-through opacity-50")}>{t}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[1.15rem] font-bold" style={{ color: C.bronzeDeep }}>
        {done.size === items.length ? "All done. Safe travels, and thank you!" : `${done.size} of ${items.length} done`}
      </p>
    </div>
  );
}

function PlaceCard({ card, onOpen }: { card: GuideCard; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="tap group flex flex-col overflow-hidden rounded-[1.3rem] border bg-white text-left shadow-sm" style={{ borderColor: C.chalk }}>
      <Photo src={card.image} alt={card.title} emoji="📍" className="aspect-[4/3] w-full" />
      <div className="flex flex-1 flex-col p-[1.1rem]">
        <p className="text-[1.6rem] leading-tight" style={SERIF}>
          {card.title}
        </p>
        <p className="mt-1 line-clamp-3 text-[1.1rem] leading-snug" style={{ color: C.slate }}>{card.text}</p>
        {card.href && (
          <p className="mt-auto whitespace-nowrap pt-2 text-[0.95rem] font-black uppercase tracking-[0.16em]" style={{ color: C.bronzeDeep }}>
            Open link →
          </p>
        )}
      </div>
    </button>
  );
}

/* ── Overlays ───────────────────────────────────────────────────────── */

function useQr(href?: string) {
  const [qr, setQr] = useState<string>();
  useEffect(() => {
    if (!href) return;
    let live = true;
    void QRCode.toDataURL(href, { margin: 1, width: 420, color: { dark: C.charcoal, light: "#ffffff" } }).then((u) => live && setQr(u));
    return () => {
      live = false;
    };
  }, [href]);
  return qr;
}

function Overlay({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <motion.div
      className="fixed inset-0 z-[60] grid place-items-center p-[2.4rem]"
      style={{ background: "rgba(28,29,31,0.72)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="relative">
        {children}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="tap absolute -right-4 -top-4 grid size-[4.4rem] place-items-center rounded-full bg-white shadow-xl"
          style={{ color: C.charcoal }}
        >
          <X className="size-7" />
        </button>
      </div>
    </motion.div>
  );
}

function CardSheet({ card, onClose }: { card: GuideCard; onClose: () => void }) {
  const qr = useQr(card.href);
  const host = useMemo(() => {
    try {
      return card.href ? new URL(card.href).hostname.replace(/^www\./, "") : "";
    } catch {
      return "";
    }
  }, [card.href]);
  return (
    <Overlay onClose={onClose}>
      <motion.div
        initial={{ y: 30, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className="flex w-[min(64rem,90vw)] overflow-hidden rounded-[1.8rem] bg-white"
        style={SANS}
      >
        {card.image && <Photo src={card.image} alt={card.title} emoji="📍" className="w-[45%] shrink-0" />}
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-[2rem]">
          <p className="text-[3rem] leading-none" style={{ ...SERIF, color: C.charcoal }}>
            {card.title}
          </p>
          <p className="text-[1.35rem] leading-relaxed" style={{ color: C.slate }}>{card.text}</p>
          {card.href && (
            <div className="mt-auto flex items-center gap-[1.4rem] rounded-[1.3rem] p-[1.2rem]" style={{ background: C.ivory }}>
              {qr ? <img src={qr} alt={`QR code for ${host}`} className="size-[11rem] rounded-[0.8rem]" /> : <div className="size-[11rem]" />}
              <div>
                <p className="text-[1.6rem] leading-tight" style={{ ...SERIF, color: C.charcoal }}>
                  Scan with your phone
                </p>
                <p className="mt-1 text-[1.15rem] leading-snug" style={{ color: C.slate }}>Point your camera at the code to open {host || "the link"}.</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </Overlay>
  );
}

function Lightbox({ photo, onClose }: { photo: { src: string; caption: string }; onClose: () => void }) {
  return (
    <Overlay onClose={onClose}>
      <motion.figure initial={{ scale: 0.97 }} animate={{ scale: 1 }} exit={{ opacity: 0 }} className="max-w-[88vw]">
        <Photo src={photo.src} alt={photo.caption} emoji="🏡" className="max-h-[78vh] w-[min(90rem,88vw)] rounded-[1.6rem]" fit="contain" />
        <figcaption className="mt-3 text-center text-[2rem] text-white" style={SERIF}>
          {photo.caption}
        </figcaption>
      </motion.figure>
    </Overlay>
  );
}

/* ── Bits ───────────────────────────────────────────────────────────── */

/** A photo that quietly becomes a soft panel if it can't load (offline, moved). */
function Photo({ src, alt, emoji, className, fit = "cover" }: { src?: string; alt: string; emoji: string; className?: string; fit?: "cover" | "contain" }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={cn("grid place-items-center", className)} style={{ background: `linear-gradient(150deg, ${C.chalk}, ${C.oak})` }} aria-label={alt} role="img">
        <span className="text-[3.6rem] opacity-70">{emoji}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn(fit === "cover" ? "object-cover" : "object-contain", className)}
      style={{ background: C.chalk }}
    />
  );
}

function RoundButton({ label, onClick, className, children }: { label: string; onClick: () => void; className?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn("tap grid size-[4.6rem] shrink-0 place-items-center rounded-full border bg-white shadow-sm", className)}
      style={{ borderColor: `${C.charcoal}1f`, color: C.charcoal }}
    >
      {children}
    </button>
  );
}

function PageButton({ dark, className, onClick, children }: { dark?: boolean; className?: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("tap flex h-[4.4rem] items-center gap-3 rounded-full px-6 text-[1.15rem] font-black uppercase tracking-[0.14em]", className)}
      style={dark ? { background: C.charcoal, color: "white" } : { background: C.ivory, color: C.charcoal }}
    >
      {children}
    </button>
  );
}

/** Everything in a section as one string, for read-aloud. */
export function sectionText(section: GuideSection): string {
  const out: string[] = [section.heading ?? section.title];
  const walk = (blocks: GuideBlock[]) => {
    for (const b of blocks) {
      switch (b.kind) {
        case "text":
          out.push(b.text);
          break;
        case "quote":
          out.push(b.text);
          if (b.signature) out.push(b.signature);
          break;
        case "facts":
          for (const f of b.facts) out.push(`${f.label}: ${f.value}.${f.note ? ` ${f.note}` : ""}`);
          break;
        case "steps":
          if (b.title) out.push(b.title);
          b.steps.forEach((s, i) => out.push(`${i + 1}. ${s.title}.${s.text ? ` ${s.text}` : ""}`));
          break;
        case "bullets":
          if (b.title) out.push(b.title);
          out.push(...b.items);
          break;
        case "cards":
          if (b.title) out.push(b.title);
          for (const c of b.cards) out.push(`${c.title}. ${c.text}`);
          break;
        case "checklist":
          out.push(...b.items);
          break;
        case "callout":
          if (b.title) out.push(b.title);
          out.push(b.text);
          break;
        case "call":
          out.push(`${b.label}: call ${b.number}.${b.note ? ` ${b.note}` : ""}`);
          break;
        case "tabs":
          for (const t of b.tabs) {
            out.push(t.label);
            walk(t.blocks);
          }
          break;
        case "gallery":
        case "links":
          break;
      }
    }
  };
  walk(section.blocks);
  return out.join(". ");
}
