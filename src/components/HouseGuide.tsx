/**
 * The house guide, shown on the bench screen for guests: a rail of sections on
 * the left, one section at a time on the right. Big touch targets, read-aloud,
 * and no PDF pinching. Content lives in src/content/guides.ts.
 */
import { useState } from "react";
import { ArrowLeft, ExternalLink, Volume2 } from "lucide-react";
import type { Guide, GuideBlock, GuideSection } from "@/content/guides";
import { speak } from "@/lib/device";
import { cn } from "@/lib/utils";

const GREEN = "#5f7a64";

export function HouseGuide({ guide, onClose }: { guide: Guide; onClose: () => void }) {
  const [activeId, setActiveId] = useState(guide.sections[0].id);
  const section = guide.sections.find((s) => s.id === activeId) ?? guide.sections[0];

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[linear-gradient(160deg,#f6f1e8_0%,#ece6da_100%)] text-ink">
      <header className="flex shrink-0 items-center gap-4 px-[1.6rem] pb-2 pt-[1.4rem]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back to the guest screen"
          className="tap grid size-[3.4rem] shrink-0 place-items-center rounded-full bg-white shadow-[var(--shadow-soft)] ring-1 ring-black/5"
          style={{ color: GREEN }}
        >
          <ArrowLeft className="size-6" strokeWidth={2.6} />
        </button>
        <div className="min-w-0">
          <p className="font-display text-[2.2rem] font-black leading-none">{guide.name}</p>
          <p className="text-[1.15rem] font-bold uppercase tracking-[0.14em] text-ink-3">{guide.subtitle} · House guide</p>
        </div>
        <button
          type="button"
          onClick={() => speak(sectionText(section))}
          aria-label={`Read ${section.title} aloud`}
          className="tap ml-auto grid size-[3.4rem] place-items-center rounded-full bg-white shadow-[var(--shadow-soft)] ring-1 ring-black/5"
          style={{ color: GREEN }}
        >
          <Volume2 className="size-6" />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 gap-[1.2rem] px-[1.6rem] pb-[1.4rem]">
        <nav aria-label="Guide sections" className="no-scrollbar flex w-[23rem] shrink-0 flex-col gap-1.5 overflow-y-auto">
          {guide.sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveId(s.id)}
              aria-current={s.id === section.id ? "true" : undefined}
              className={cn(
                "tap flex min-h-[3.6rem] shrink-0 items-center gap-3 rounded-[1.2rem] px-4 text-left text-[1.25rem] font-black",
                s.id === section.id ? "text-white shadow-[var(--shadow-soft)]" : "bg-white/70 text-ink-2 ring-1 ring-black/5",
              )}
              style={s.id === section.id ? { background: GREEN } : undefined}
            >
              <span className="text-[1.4rem] leading-none">{s.emoji}</span>
              <span className="min-w-0 truncate">{s.title}</span>
            </button>
          ))}
        </nav>

        <section className="no-scrollbar min-h-0 flex-1 overflow-y-auto rounded-[1.8rem] bg-white p-[1.8rem] shadow-[var(--shadow-soft)]">
          <h2 className="mb-4 font-display text-[3rem] font-black leading-none">{section.title}</h2>
          <div className="flex flex-col gap-4">
            {section.blocks.map((b, i) => (
              <Block key={i} block={b} />
            ))}
          </div>
          <p className="mt-6 text-[1.1rem] font-bold text-ink-3">
            {guide.host.names} · {guide.host.phone} · {guide.host.email}
          </p>
        </section>
      </div>
    </div>
  );
}

function Block({ block }: { block: GuideBlock }) {
  switch (block.kind) {
    case "text":
      return <p className="text-[1.35rem] font-semibold leading-relaxed text-ink-2">{block.text}</p>;

    case "facts":
      return (
        <div className="grid grid-cols-2 gap-3">
          {block.facts.map((f) => (
            <div key={f.label} className="min-w-0 rounded-[1.3rem] bg-paper p-4">
              <p className="text-[1.05rem] font-black uppercase tracking-[0.12em]" style={{ color: GREEN }}>
                {f.label}
              </p>
              <p
                className="font-display font-black leading-tight [overflow-wrap:anywhere]"
                style={{ fontSize: f.value.length > 16 ? "1.55rem" : "2.1rem" }}
              >
                {f.value}
              </p>
              {f.note && <p className="mt-1 text-[1.15rem] font-semibold leading-snug text-ink-2">{f.note}</p>}
            </div>
          ))}
        </div>
      );

    case "steps":
      return (
        <div>
          {block.title && <p className="mb-2 font-display text-[1.9rem] font-black leading-none">{block.title}</p>}
          <ol className="flex flex-col gap-2.5">
            {block.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 grid size-[2.1rem] shrink-0 place-items-center rounded-full text-[1.1rem] font-black text-white" style={{ background: GREEN }}>
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-[1.3rem] font-black leading-tight">{s.title}</span>
                  {s.text && <span className="block text-[1.2rem] font-semibold leading-snug text-ink-2">{s.text}</span>}
                </span>
              </li>
            ))}
          </ol>
        </div>
      );

    case "bullets":
      return (
        <div>
          {block.title && <p className="mb-2 font-display text-[1.9rem] font-black leading-none">{block.title}</p>}
          <ul className="flex flex-col gap-1.5">
            {block.items.map((t, i) => (
              <li key={i} className="flex gap-2.5 text-[1.25rem] font-semibold leading-snug text-ink-2">
                <span className="mt-[0.55rem] size-2 shrink-0 rounded-full" style={{ background: GREEN }} />
                <span className="min-w-0">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      );

    case "cards":
      return (
        <div>
          {block.title && <p className="mb-2 font-display text-[1.9rem] font-black leading-none">{block.title}</p>}
          <div className="grid grid-cols-2 gap-2.5">
            {block.cards.map((c) => (
              <div key={c.title} className="rounded-[1.2rem] bg-paper p-3.5">
                <p className="text-[1.2rem] font-black leading-tight">{c.title}</p>
                <p className="mt-0.5 text-[1.1rem] font-semibold leading-snug text-ink-2">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case "checklist":
      return (
        <ul className="flex flex-col">
          {block.items.map((t, i) => (
            <li key={i} className="flex items-center gap-3 border-b border-line py-2.5 text-[1.3rem] font-bold last:border-0">
              <span className="grid size-[1.7rem] shrink-0 place-items-center rounded-[0.5rem] border-2" style={{ borderColor: GREEN }} />
              <span className="min-w-0">{t}</span>
            </li>
          ))}
        </ul>
      );

    case "callout":
      return (
        <div className="rounded-[1.3rem] border-l-[0.4rem] bg-[#efe9dd] p-4" style={{ borderColor: GREEN }}>
          {block.title && <p className="text-[1.5rem] font-black leading-tight">{block.title}</p>}
          <p className="mt-1 text-[1.2rem] font-semibold leading-relaxed text-ink-2">{block.text}</p>
        </div>
      );

    case "links":
      return (
        <div className="flex flex-wrap gap-2">
          {block.links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="tap flex min-h-[3.4rem] items-center gap-2 rounded-full px-5 text-[1.2rem] font-black text-white"
              style={{ background: GREEN }}
            >
              {l.label}
              <ExternalLink className="size-4" />
            </a>
          ))}
        </div>
      );

    default:
      return null;
  }
}

/** Everything in a section as one string, for read-aloud. */
function sectionText(section: GuideSection): string {
  const out: string[] = [section.title];
  for (const b of section.blocks) {
    switch (b.kind) {
      case "text":
        out.push(b.text);
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
      case "links":
        break;
    }
  }
  return out.join(". ");
}
