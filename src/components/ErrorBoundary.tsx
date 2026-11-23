import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Catches a screen that fails to load or crashes, so the hub never goes blank.
 *
 * The common case is a new version going live while a screen is open: the
 * service worker swaps in the new files, and the old page can no longer
 * load a screen it hasn't opened yet (e.g. Parent). That reloads once, by
 * itself, onto the new version. Anything else shows a kind message with a
 * reload button and the error text for whoever's fixing it.
 */
const RELOADED = "homehub-chunk-reload";

function isLoadError(e: unknown): boolean {
  const msg = e instanceof Error ? `${e.name} ${e.message}` : String(e);
  return /dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk|error loading dynamically/i.test(msg);
}

interface State {
  error?: Error;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Home Hub screen crashed", error, info.componentStack);
    if (isLoadError(error)) {
      let already = false;
      try {
        already = sessionStorage.getItem(RELOADED) === "1";
        sessionStorage.setItem(RELOADED, "1");
      } catch {
        /* private mode */
      }
      if (!already) window.location.reload();
    }
  }

  componentDidMount() {
    // A clean load means any earlier auto-reload worked; allow another next time.
    window.setTimeout(() => {
      try {
        if (!this.state.error) sessionStorage.removeItem(RELOADED);
      } catch {
        /* private mode */
      }
    }, 10_000);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const update = isLoadError(error);
    return (
      <div className="paper-bg flex h-[100dvh] flex-col items-center justify-center gap-5 p-[2.4rem] text-center">
        <p className="text-[5rem] leading-none">{update ? "✨" : "🙈"}</p>
        <h1 className="font-display text-[3.6rem] font-black leading-none">{update ? "Home Hub has updated" : "Oops, that screen tripped over"}</h1>
        <p className="max-w-[40rem] text-[1.5rem] font-bold text-ink-2">
          {update ? "Tap below to load the new version." : "Your family's things are safe. Reloading usually sorts it."}
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={() => window.location.reload()} className="tap h-[5rem] rounded-full bg-coral px-8 text-[1.6rem] font-black text-white">
            Reload
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
            className="tap h-[5rem] rounded-full bg-white px-8 text-[1.6rem] font-black text-ink ring-1 ring-black/5"
          >
            Go home
          </button>
        </div>
        {!update && <p className="max-w-[50rem] break-words font-mono text-[1rem] text-ink-3">{error.message}</p>}
      </div>
    );
  }
}
