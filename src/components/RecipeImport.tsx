/**
 * Import a recipe from a web link into SIGNAL "My recipes", like SIGNAL's own
 * Add recipe → Import from URL: paste a link, check what came back (the
 * method is written SIGNAL-style, with the amounts in each step), choose the
 * website's photo or upload your own, then save.
 */
import { useRef, useState } from "react";
import { ImagePlus, Link2, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { hubFetch } from "@/lib/integrations/hub-api";
import { saveMyRecipe, useSignal } from "@/lib/integrations/signal";
import { sfx } from "@/lib/device";
import type { Recipe } from "@/lib/types";
import { BigButton, Sheet } from "@/components/ui";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Dinner", "Lunch", "Breakfast", "Snack", "Baking", "Other"] as const;

interface Imported {
  title: string;
  category: string;
  estimated_time: number | null;
  serves: number | null;
  ingredients: string[];
  instructions: string[];
  image_url: string | null;
  source_url: string;
}

/** Shrink a photo to a JPEG data URL (max 1000px) so it can live on the recipe row. */
async function shrinkPhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("That file isn't a photo we can read."));
      i.src = url;
    });
    const scale = Math.min(1, 1000 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const input = "w-full rounded-[1.2rem] border-2 border-line bg-white px-4 text-[1.3rem] font-bold outline-none focus:border-sky";

export function ImportRecipeSheet({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: (r: Recipe) => void }) {
  const signedIn = useSignal((s) => !!s.userId);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Imported | null>(null);
  const [siteImage, setSiteImage] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState("");
  const [method, setMethod] = useState("");
  const file = useRef<HTMLInputElement>(null);

  const reset = () => {
    setDraft(null);
    setLink("");
    setSiteImage(null);
  };

  const read = async () => {
    if (!link.trim()) return;
    setBusy(true);
    try {
      const { recipe } = await hubFetch<{ recipe: Imported }>("/api/recipe-import", { method: "POST", body: JSON.stringify({ url: link.trim() }) });
      const category = CATEGORIES.find((c) => c === recipe.category) ?? "Dinner";
      setDraft({ ...recipe, category });
      setSiteImage(recipe.image_url);
      setIngredients(recipe.ingredients.join("\n"));
      setMethod(recipe.instructions.join("\n"));
      sfx.success();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't read that page");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!draft) return;
    const ing = ingredients.split("\n").map((s) => s.trim()).filter(Boolean);
    if (!draft.title.trim() || !ing.length) return toast.error("It needs a name and at least one ingredient.");
    setBusy(true);
    try {
      const recipe = await saveMyRecipe({
        title: draft.title.trim(),
        category: draft.category,
        ingredients: ing,
        instructions: method.split("\n").map((s) => s.trim()).filter(Boolean),
        estimated_time: draft.estimated_time,
        image_url: draft.image_url,
        source_url: draft.source_url,
      });
      sfx.success();
      toast.success(`${recipe.name} is in SIGNAL's My recipes`);
      reset();
      onSaved(recipe);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save it to SIGNAL");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? onOpenChange(o) : (reset(), onOpenChange(false)))} title="Import a recipe" wide>
      {!signedIn ? (
        <p className="text-[1.35rem] font-bold text-ink-2">Sign in to SIGNAL in Parent → Connections first. Imported recipes are saved to SIGNAL's My recipes.</p>
      ) : !draft ? (
        <div className="flex flex-col gap-3">
          <p className="text-[1.3rem] font-bold text-ink-2">Paste a link to a recipe page. We'll read it and write the method out SIGNAL-style, with the amounts in each step.</p>
          <div className="flex gap-3">
            <div className="relative min-w-0 flex-1">
              <Link2 className="absolute left-4 top-1/2 size-6 -translate-y-1/2 text-ink-3" />
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void read()}
                type="url"
                inputMode="url"
                autoCapitalize="none"
                placeholder="https://…/one-pot-mexican-beans-and-rice/"
                className={cn(input, "h-[4.6rem] pl-14")}
              />
            </div>
            <BigButton size="md" disabled={busy || !link.trim()} onClick={() => void read()}>
              {busy ? <Loader2 className="size-6 animate-spin" /> : "Read it"}
            </BigButton>
          </div>
          {busy && <p className="text-[1.2rem] font-bold text-ink-3">Reading the page and writing it up… this takes about 20 seconds.</p>}
        </div>
      ) : (
        <div className="grid max-h-[70vh] gap-5 overflow-y-auto pr-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="flex flex-col gap-3">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.6rem] bg-peach-tint">
              {draft.image_url ? (
                <img src={draft.image_url} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="grid size-full place-items-center text-[5rem]">🍲</div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <BigButton size="md" tone="white" icon={<ImagePlus className="size-6" />} onClick={() => file.current?.click()}>
                Upload a photo
              </BigButton>
              {siteImage && draft.image_url !== siteImage && (
                <BigButton size="md" tone="white" icon={<RotateCcw className="size-6" />} onClick={() => setDraft({ ...draft, image_url: siteImage })}>
                  Website photo
                </BigButton>
              )}
            </div>
            <input
              ref={file}
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                try {
                  setDraft({ ...draft, image_url: await shrinkPhoto(f) });
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Couldn't use that photo");
                }
              }}
            />
            <label className="block">
              <span className="mb-1 block text-[1.15rem] font-black text-ink-2">Name</span>
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={cn(input, "h-[4.2rem]")} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-[1.15rem] font-black text-ink-2">Meal</span>
                <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className={cn(input, "h-[4.2rem]")}>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[1.15rem] font-black text-ink-2">Minutes</span>
                <input
                  inputMode="numeric"
                  value={draft.estimated_time ?? ""}
                  onChange={(e) => setDraft({ ...draft, estimated_time: Number(e.target.value.replace(/\D/g, "")) || null })}
                  className={cn(input, "h-[4.2rem]")}
                />
              </label>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <label className="block">
              <span className="mb-1 block text-[1.15rem] font-black text-ink-2">Ingredients (one per line)</span>
              <textarea value={ingredients} onChange={(e) => setIngredients(e.target.value)} rows={8} className={cn(input, "py-3 leading-snug")} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[1.15rem] font-black text-ink-2">Method (one step per line)</span>
              <textarea value={method} onChange={(e) => setMethod(e.target.value)} rows={9} className={cn(input, "py-3 leading-snug")} />
            </label>
            <div className="flex flex-wrap gap-3">
              <BigButton size="md" disabled={busy} onClick={() => void save()}>
                {busy ? "Saving…" : "Save to SIGNAL"}
              </BigButton>
              <BigButton size="md" tone="white" disabled={busy} onClick={reset}>
                Try another link
              </BigButton>
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}
