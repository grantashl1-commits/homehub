import { useEffect, useState } from "react";

const QUERY = "(max-width: 767px)";

/** True on phone-width screens, for sizes set in code (avatars, jars). Layout uses Tailwind's max-md: instead. */
export function useIsPhone(): boolean {
  const [phone, setPhone] = useState(() => typeof window !== "undefined" && window.matchMedia(QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const on = () => setPhone(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return phone;
}
