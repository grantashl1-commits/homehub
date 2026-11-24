/**
 * Live speech-to-text with the browser's own speech recognition (Chrome on the
 * Chromebook and wall PC, Safari on the iPad and iPhone). Used to capture the
 * dinnertime chat; the transcript is then tidied up by /api/reflect-summary.
 *
 * Browsers stop listening after a pause or a minute or so, so while the
 * family is recording it quietly starts again until they press Stop.
 */
import { useCallback, useEffect, useRef, useState } from "react";

interface Result {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<Result>;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function recognitionClass(): (new () => Recognition) | undefined {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export const canTranscribe = typeof window !== "undefined" && !!recognitionClass();

const ERRORS: Record<string, string> = {
  "not-allowed": "The microphone is blocked. Allow it for this site in the browser settings.",
  "service-not-allowed": "Speech recognition isn't allowed on this device.",
  "audio-capture": "No microphone found.",
  network: "Speech recognition needs the internet.",
};

export function useTranscriber(lang = "en-NZ") {
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string>();
  const rec = useRef<Recognition | null>(null);
  const wanted = useRef(false);

  const start = useCallback(() => {
    const Cls = recognitionClass();
    if (!Cls) {
      setError("This browser can't turn speech into text. Try Chrome or Safari.");
      return;
    }
    setError(undefined);
    wanted.current = true;
    const r = new Cls();
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const text = res[0].transcript.trim();
        if (!text) continue;
        if (res.isFinal) setFinalText((t) => (t ? `${t} ${text}` : text));
        else live += `${text} `;
      }
      setInterim(live.trim());
    };
    r.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      setError(ERRORS[e.error] ?? `Speech recognition stopped (${e.error}).`);
      if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture") wanted.current = false;
    };
    r.onend = () => {
      setInterim("");
      if (wanted.current) {
        try {
          r.start();
          return;
        } catch {
          /* fall through: stopped */
        }
      }
      setListening(false);
    };
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setError("Couldn't start the microphone.");
    }
  }, [lang]);

  const stop = useCallback(() => {
    wanted.current = false;
    rec.current?.stop();
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    setFinalText("");
    setInterim("");
    setError(undefined);
  }, []);

  useEffect(
    () => () => {
      wanted.current = false;
      rec.current?.abort();
    },
    [],
  );

  return { listening, transcript: finalText, interim, error, start, stop, reset, supported: canTranscribe };
}
