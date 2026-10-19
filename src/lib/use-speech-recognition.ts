"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Thin wrapper around the browser's SpeechRecognition API.
 * No API key, no server round-trip — speech-to-text happens on-device
 * (or via the browser vendor's own recognition service), entirely client-side.
 */

type RecognitionResultEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

type RecognitionErrorEvent = { error: string };

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export type SpeechStatus = "idle" | "listening" | "unsupported" | "denied" | "error";

export function useSpeechRecognition(onFinalTranscript: (text: string) => void) {
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const callbackRef = useRef(onFinalTranscript);
  callbackRef.current = onFinalTranscript;

  // Computed after mount so the server-rendered markup and the first client
  // render match exactly (the mic button only appears once we know it works).
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition));
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    if (typeof window === "undefined") return;
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) {
      setStatus("unsupported");
      return;
    }

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US";

    recognition.onstart = () => {
      setStatus("listening");
      setInterimText("");
    };

    recognition.onresult = (event) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) finalChunk += result[0].transcript;
        else interimChunk += result[0].transcript;
      }
      if (finalChunk.trim()) {
        callbackRef.current(finalChunk.trim());
        setInterimText("");
      } else {
        setInterimText(interimChunk);
      }
    };

    recognition.onerror = (event) => {
      setStatus(event.error === "not-allowed" || event.error === "service-not-allowed" ? "denied" : "error");
      setInterimText("");
    };

    recognition.onend = () => {
      setStatus((current) => (current === "listening" ? "idle" : current));
      setInterimText("");
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setStatus("error");
    }
  }, []);

  const toggle = useCallback(() => {
    if (status === "listening") stop();
    else start();
  }, [start, status, stop]);

  return { status, interimText, supported, start, stop, toggle };
}
