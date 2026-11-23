import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "./Avatar";
import { profilePhoto } from "@/lib/media";
import { sfx } from "@/lib/device";
import { cn } from "@/lib/utils";
import type { Member } from "@/lib/types";

/** Opens the camera or photo library and hands back a small square photo. */
function usePhotoPicker(onPhoto: (photo: string) => void) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      onPhoto(await profilePhoto(file));
      sfx.pop();
    } catch {
      toast.error("That photo didn't work. Try another one.");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  const input = (
    <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
  );
  return { open: () => ref.current?.click(), busy, input };
}

/** A person's big picture with a camera badge: tap it to use a photo. */
export function PhotoAvatarButton({ member, size, onPhoto }: { member: Member; size: number; onPhoto: (photo: string) => void }) {
  const { open, busy, input } = usePhotoPicker(onPhoto);
  return (
    <span className="relative inline-flex shrink-0">
      <button type="button" onClick={open} aria-label={`Use a photo for ${member.name || "this person"}`} className="tap rounded-full">
        <Avatar member={member} size={size} />
        <span
          className="absolute -bottom-0.5 -right-0.5 grid place-items-center rounded-full bg-ink text-white ring-[0.2rem] ring-white"
          style={{ width: `${size * 0.42}rem`, height: `${size * 0.42}rem` }}
        >
          {busy ? <Loader2 className="size-[55%] animate-spin" /> : <Camera className="size-[55%]" strokeWidth={2.4} />}
        </span>
      </button>
      {input}
    </span>
  );
}

/** "Use a photo" as one more choice next to the characters. */
export function PhotoTile({ member, size, onPhoto }: { member: Member; size: number; onPhoto: (photo: string) => void }) {
  const { open, busy, input } = usePhotoPicker(onPhoto);
  return (
    <>
      <button
        type="button"
        onClick={open}
        title={member.photo ? "Choose a different photo" : "Use a photo"}
        aria-label={member.photo ? "Choose a different photo" : "Use a photo"}
        className={cn("tap rounded-full p-0.5", member.photo && "ring-[0.25rem] ring-ink")}
      >
        {member.photo ? (
          <Avatar member={member} size={size} />
        ) : (
          <span
            className="grid place-items-center rounded-full border-[0.15rem] border-dashed border-ink/30 bg-white text-ink-2"
            style={{ width: `${size}rem`, height: `${size}rem` }}
          >
            {busy ? <Loader2 className="size-[45%] animate-spin" /> : <Camera className="size-[45%]" strokeWidth={2.2} />}
          </span>
        )}
      </button>
      {input}
    </>
  );
}
