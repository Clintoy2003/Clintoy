"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityMenu } from "@/components/accessibility-menu";
import { ClintoyMark, Wordmark } from "@/components/logo";
import { Markdown } from "@/components/markdown";
import type { ConversationSummary, MessageView } from "@/lib/chat-data";
import { MODES, type ModeId } from "@/lib/ai/modes";
import { DEFAULT_FREE_OPENROUTER_MODEL, FREE_OPENROUTER_MODELS, type FreeOpenRouterModelId } from "@/lib/ai/models";
import { useSpeechRecognition } from "@/lib/use-speech-recognition";

type MessageItem = MessageView & { pending?: boolean };

const STARTERS = [
  "Summarise this: [paste a long thread or article]",
  "Plan four weeks to learn the basics of statistics",
  "Write a warm but firm email declining a request",
  "Explain compound interest to a beginner",
];

const MODE_HELP: Record<ModeId, string> = {
  balanced: "Considered answers, structure and next steps.",
  concise: "The shortest useful answer, nothing else.",
  creative: "Warm, lateral writing and original angles.",
  code: "Working snippets, edge cases and checks.",
  image: "Generate an original picture from a description.",
};

function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function Clock() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.8V8l2.2 1.4" strokeLinecap="round" />
    </svg>
  );
}

function downloadImage(dataUrl: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

export function ChatApp({
  initialConversations,
  displayName,
  userEmail,
  avatarUrl,
  initialPrompt,
  initialMode,
  initialConversationId,
  engineLabel,
}: {
  initialConversations: ConversationSummary[];
  displayName: string;
  userEmail: string;
  avatarUrl: string | null;
  initialPrompt: string;
  initialMode: ModeId;
  initialConversationId: string | null;
  engineLabel: string;
}) {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationSummary[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(initialConversationId);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [mode, setMode] = useState<ModeId>(initialMode);
  const [selectedModel, setSelectedModel] = useState<FreeOpenRouterModelId>(DEFAULT_FREE_OPENROUTER_MODEL);
  const [input, setInput] = useState(initialPrompt);
  const [voiceNotice, setVoiceNotice] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(Boolean(initialConversationId));
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [name, setName] = useState(displayName);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(displayName);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const appendTranscript = useCallback((text: string) => {
    setInput((current) => {
      if (!current.trim()) return text;
      const needsSpace = !/\s$/.test(current);
      return `${current}${needsSpace ? " " : ""}${text}`;
    });
  }, []);

  const speech = useSpeechRecognition(appendTranscript);

  useEffect(() => {
    if (speech.status === "denied") {
      setVoiceNotice("Microphone access was blocked. Allow it in your browser's site settings to dictate.");
    } else if (speech.status === "unsupported") {
      setVoiceNotice("Voice input isn't supported in this browser yet â€” try Chrome, Edge or Safari.");
    } else if (speech.status === "error") {
      setVoiceNotice("Didn't catch that. Try again, a little closer to the mic.");
    } else if (speech.status === "listening") {
      setVoiceNotice("");
    }
  }, [speech.status]);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeId) ?? null,
    [conversations, activeId],
  );

  const firstName = name.split(" ")[0] || name;

  useEffect(() => {
    if (!initialConversationId) return;
    let cancelled = false;
    setLoadingMessages(true);
    fetch(`/api/conversations/${initialConversationId}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { conversation?: ConversationSummary; messages?: MessageView[] } | null) => {
        if (cancelled || !data?.messages) return;
        setMessages(data.messages);
        if (data.conversation && isModeIdValue(data.conversation.mode)) setMode(data.conversation.mode);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoadingMessages(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialConversationId, initialMode]);

  useEffect(() => {
    if (initialPrompt) inputRef.current?.focus();
  }, [initialPrompt]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const openConversation = useCallback(async (id: string) => {
    setActiveId(id);
    setSidebarOpen(false);
    setSuggestions([]);
    setError("");
    setLoadingMessages(true);
    try {
      const response = await fetch(`/api/conversations/${id}`);
      const data = (await response.json()) as { conversation?: ConversationSummary; messages?: MessageItem[]; error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not open that conversation.");
        return;
      }
      setMessages(data.messages ?? []);
      if (data.conversation && isModeIdValue(data.conversation.mode)) setMode(data.conversation.mode);
    } catch {
      setError("Network problem while opening that thread.");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const startNew = useCallback(() => {
    setActiveId(null);
    setMessages([]);
    setSuggestions([]);
    setError("");
    setSidebarOpen(false);
    setRenamingId(null);
    setConfirmDeleteId(null);
    setTimeout(() => inputRef.current?.focus(), 40);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        startNew();
      }
      if (event.key === "Escape" && sidebarOpen) setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen, startNew]);

  const submitMessage = useCallback(
    async (rawInput?: string) => {
      const text = (rawInput ?? input).trim();
      if (!text || thinking) return;
      if (text.length > 4000) {
        setError("That's a little long â€” keep it under 4,000 characters and I'll take it from there.");
        return;
      }
      speech.stop();

      const tempId = `pending-${Date.now()}`;
      setError("");
      setSuggestions([]);
      setMessages((current) => [
        ...current,
        { id: tempId, role: "user", content: text, engine: null, imageUrl: null, createdAt: new Date().toISOString() },
      ]);
      setInput("");
      setThinking(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, conversationId: activeId, mode, model: selectedModel }),
        });

        if (response.status === 401) {
          router.push("/login?next=/chat");
          return;
        }

        const data = (await response.json()) as {
          conversationId?: string;
          conversation?: ConversationSummary;
          userMessage?: MessageView;
          assistantMessage?: MessageView;
          suggestions?: string[];
          error?: string;
        };

        if (!response.ok || !data.assistantMessage || !data.userMessage || !data.conversationId) {
          setMessages((current) => current.filter((message) => message.id !== tempId));
          setInput(text);
          setError(data.error ?? "Clintoy couldn't finish that thought. Try again?");
          return;
        }

        setMessages((current) => [
          ...current.filter((message) => message.id !== tempId),
          data.userMessage!,
          data.assistantMessage!,
        ]);
        setSuggestions(data.suggestions ?? []);
        if (!activeId) {
          setActiveId(data.conversationId);
        }
        setConversations((current) => {
          const next = current.filter((conversation) => conversation.id !== data.conversation!.id);
          return [data.conversation!, ...next];
        });
      } catch {
        setMessages((current) => current.filter((message) => message.id !== tempId));
        setInput(text);
        setError("Network hiccup â€” your message is safe in the box. Try sending again.");
      } finally {
        setThinking(false);
      }
    },
    [activeId, input, mode, selectedModel, router, speech, thinking],
  );

  const regenerate = useCallback(async () => {
    if (!activeId || thinking) return;
    setThinking(true);
    setError("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeId, mode, model: selectedModel, regenerate: true }),
      });
      if (response.status === 401) {
        router.push("/login?next=/chat");
        return;
      }
      const data = (await response.json()) as {
        assistantMessage?: MessageView;
        suggestions?: string[];
        error?: string;
      };
      if (!response.ok || !data.assistantMessage) {
        setError(data.error ?? "Couldn't regenerate that answer.");
        return;
      }
      setMessages((current) => {
        const withoutLastAssistant = [...current];
        while (
          withoutLastAssistant.length > 0 &&
          withoutLastAssistant[withoutLastAssistant.length - 1].role === "assistant"
        ) {
          withoutLastAssistant.pop();
        }
        return [...withoutLastAssistant, data.assistantMessage!];
      });
      setSuggestions(data.suggestions ?? []);
    } catch {
      setError("Network hiccup while regenerating.");
    } finally {
      setThinking(false);
    }
  }, [activeId, mode, selectedModel, router, thinking]);

  const renameConversation = useCallback(async (id: string, title: string) => {
    const clean = title.trim();
    if (!clean) {
      setRenamingId(null);
      return;
    }
    setConversations((current) =>
      current.map((conversation) => (conversation.id === id ? { ...conversation, title: clean } : conversation)),
    );
    setRenamingId(null);
    try {
      await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: clean }),
      });
    } catch {
      // keep optimistic title
    }
  }, []);

  const togglePin = useCallback(async (conversation: ConversationSummary) => {
    const nextPinned = !conversation.pinned;
    setConversations((current) =>
      [...current.map((item) => (item.id === conversation.id ? { ...item, pinned: nextPinned } : item))].sort(
        (a, b) => Number(b.pinned) - Number(a.pinned) || +new Date(b.updatedAt) - +new Date(a.updatedAt),
      ),
    );
    try {
      await fetch(`/api/conversations/${conversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: nextPinned }),
      });
    } catch {
      // keep optimistic state
    }
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      setConfirmDeleteId(null);
      setConversations((current) => current.filter((conversation) => conversation.id !== id));
      if (activeId === id) startNew();
      setStatus("Conversation deleted.");
      try {
        await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      } catch {
        // list already updated optimistically
      }
    },
    [activeId, startNew],
  );

  const saveName = useCallback(async () => {
    const clean = nameDraft.trim();
    if (clean.length < 2) {
      setEditingName(false);
      return;
    }
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: clean }),
      });
      const data = (await response.json()) as { displayName?: string; error?: string };
      if (!response.ok) {
        setStatus(data.error ?? "Could not save your name yet.");
        return;
      }
      if (data.displayName) setName(data.displayName);
      setEditingName(false);
      setStatus("Saved. Clintoy will use your name from here.");
    } catch {
      setStatus("Network problem while saving your name.");
    }
  }, [nameDraft]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    router.push("/");
    router.refresh();
  }, [router]);

  const exportTranscript = useCallback(() => {
    if (messages.length === 0) {
      setStatus("There's nothing to export yet.");
      return;
    }
    const title = activeConversation?.title ?? "clintoy-conversation";
    const header = `# ${title}\n\n_Clintoy Â· mode: ${mode} Â· exported ${new Date().toLocaleString("en-GB")}_\n\n`;
    const body = messages
      .map((message) => {
        const who = message.role === "assistant" ? "Clintoy" : firstName || "You";
        const imageLine = message.imageUrl ? `\n\n![generated image](${message.imageUrl})` : "";
        return `## ${who}\n\n${message.content}${imageLine}`;
      })
      .join("\n\n---\n\n");
    const blob = new Blob([header + body], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "clintoy"}.md`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setStatus("Transcript downloaded as Markdown.");
  }, [activeConversation, firstName, messages, mode]);

  const lastAssistantId = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].role === "assistant") return messages[index].id;
    }
    return null;
  }, [messages]);

  const charCount = input.length;
  const initial = name.trim().slice(0, 1).toUpperCase() || "C";

  return (
    <div className="flex h-dvh flex-col bg-paper">
      <header className="z-30 flex shrink-0 items-center justify-between gap-3 border-b border-line bg-paper/90 px-3 py-2.5 backdrop-blur sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setSidebarOpen((value) => !value)}
            aria-expanded={sidebarOpen}
            aria-controls="chat-sidebar"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card text-ink md:hidden"
          >
            <span className="sr-only">Toggle conversations</span>
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M3 6h14M3 10h14M3 14h14" strokeLinecap="round" />
            </svg>
          </button>
          <Link href="/" aria-label="Clintoy home" className="hidden sm:block">
            <Wordmark />
          </Link>
          <Link href="/" className="sm:hidden" aria-label="Clintoy home">
            <ClintoyMark className="h-8 w-8" />
          </Link>
          <span className="ml-1 hidden items-center gap-1.5 rounded-full border border-line bg-card px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted lg:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
            {engineLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <fieldset className="hidden items-center gap-1 rounded-full border border-line bg-card p-0.5 sm:flex">
            <legend className="sr-only">Thinking mode</legend>
            {MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={mode === item.id}
                title={`${item.name} â€” ${item.blurb}`}
                onClick={() => setMode(item.id)}
                className={`rounded-full px-2.5 py-1 text-[0.72rem] font-medium transition ${
                  mode === item.id ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
                }`}
              >
                {item.name}
              </button>
            ))}
          </fieldset>
          <label className="flex items-center gap-1.5 rounded-full border border-line bg-card px-2 py-1 text-xs text-ink-soft">
            <span className="hidden md:inline">AI Model</span>
            <select
              aria-label="Free AI model"
              value={selectedModel}
              onChange={(event) => setSelectedModel(event.target.value as FreeOpenRouterModelId)}
              className="max-w-[135px] bg-transparent text-xs text-ink outline-none"
            >
              {FREE_OPENROUTER_MODELS.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={exportTranscript}
            className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-card px-2.5 text-xs font-medium text-ink-soft transition hover:border-ink hover:text-ink"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 2.5v7M5 7l3 3 3-3M3 12.5h10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="hidden sm:inline">Export</span>
          </button>
          <AccessibilityMenu />
          <button
            type="button"
            onClick={startNew}
            className="flex h-9 items-center gap-1.5 rounded-full bg-ink px-3 text-xs font-semibold text-paper transition hover:bg-accent"
          >
            New
            <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3v10M3 8h10" strokeLinecap="round" />
            </svg>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setAccountOpen((value) => !value)}
              aria-expanded={accountOpen}
              aria-label="Account menu"
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-line bg-card text-sm font-semibold text-ink"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                initial
              )}
            </button>
            {accountOpen ? (
              <div
                role="menu"
                className="absolute right-0 z-40 mt-2 w-60 rounded-xl border border-line bg-card p-3 shadow-lg"
              >
                <p className="truncate text-sm font-semibold text-ink">{name}</p>
                <p className="truncate text-xs text-muted">{userEmail}</p>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                  <Link href="/accessibility" className="text-xs text-ink-soft underline-link">
                    Accessibility
                  </Link>
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-ink transition hover:border-ink"
                  >
                    Log out
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {sidebarOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/30 md:hidden"
            aria-label="Close conversations"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}

        <aside
          id="chat-sidebar"
          aria-label="Your conversations"
          className={`${
            sidebarOpen ? "fixed inset-y-0 left-0 z-40 flex w-[84%] max-w-xs" : "hidden"
          } shrink-0 flex-col border-r border-line bg-paper-soft md:static md:z-0 md:flex md:w-[17.5rem] md:max-w-none`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5">
            <p className="text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-muted">Your chats</p>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="rounded-full border border-line p-1 text-muted md:hidden"
              aria-label="Close conversations"
            >
              <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar px-2 py-2">
            <button
              type="button"
              onClick={startNew}
              className="mb-2 flex w-full items-center justify-between gap-2 rounded-xl border border-dashed border-line bg-card px-3 py-2.5 text-left text-sm font-medium text-ink transition hover:border-ink"
            >
              Start a new thought
              <span className="text-muted" aria-hidden="true">+</span>
            </button>

            {conversations.length === 0 ? (
              <p className="px-2 py-3 text-xs leading-relaxed text-muted">
                No saved threads yet. Your first question will appear here â€” and stay here, even after a refresh.
              </p>
            ) : (
              <ul className="space-y-1">
                {conversations.map((conversation) => {
                  const active = conversation.id === activeId;
                  return (
                    <li key={conversation.id}>
                      {renamingId === conversation.id ? (
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            void renameConversation(conversation.id, renameDraft);
                          }}
                          className="rounded-lg border border-ink bg-card p-2"
                        >
                          <label className="sr-only" htmlFor={`rename-${conversation.id}`}>
                            Rename conversation
                          </label>
                          <input
                            id={`rename-${conversation.id}`}
                            value={renameDraft}
                            autoFocus
                            onChange={(event) => setRenameDraft(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Escape") setRenamingId(null);
                            }}
                            className="w-full rounded border border-line bg-paper px-2 py-1 text-xs text-ink focus:outline-none"
                          />
                          <div className="mt-1.5 flex gap-1">
                            <button type="submit" className="rounded bg-ink px-2 py-1 text-[0.65rem] font-semibold text-paper">
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setRenamingId(null)}
                              className="rounded border border-line px-2 py-1 text-[0.65rem] text-muted"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div
                          className={`group rounded-lg border px-2 py-1.5 transition ${
                            active ? "border-ink/30 bg-card" : "border-transparent hover:bg-card"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => void openConversation(conversation.id)}
                            aria-current={active ? "true" : undefined}
                            className="block w-full text-left"
                          >
                            <span className="flex items-start gap-1.5">
                              {conversation.pinned ? (
                                <span className="mt-0.5 text-accent" aria-label="Pinned">
                                  <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden="true">
                                    <path d="M9.5 1.5 14.5 6.5l-2 .5-3 3-.5 3.5-6-6L6.5 7l3-3 .5-2Z" />
                                  </svg>
                                </span>
                              ) : null}
                              <span className="line-clamp-2 text-[0.8rem] font-medium leading-snug text-ink">
                                {conversation.title}
                              </span>
                            </span>
                            <span className="mt-0.5 flex items-center gap-1 text-[0.62rem] text-muted">
                              <Clock />
                              {timeAgo(conversation.updatedAt)} Â· {conversation.mode}
                            </span>
                          </button>

                          <div className="mt-1 flex items-center gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                            <button
                              type="button"
                              onClick={() => void togglePin(conversation)}
                              className="rounded px-1 py-0.5 text-[0.62rem] text-muted hover:text-ink"
                            >
                              {conversation.pinned ? "Unpin" : "Pin"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRenamingId(conversation.id);
                                setRenameDraft(conversation.title);
                                setConfirmDeleteId(null);
                              }}
                              className="rounded px-1 py-0.5 text-[0.62rem] text-muted hover:text-ink"
                            >
                              Rename
                            </button>
                            {confirmDeleteId === conversation.id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void deleteConversation(conversation.id)}
                                  className="rounded bg-ink px-1.5 py-0.5 text-[0.62rem] font-semibold text-white"
                                >
                                  Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="rounded px-1 py-0.5 text-[0.62rem] text-muted hover:text-ink"
                                >
                                  Keep
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(conversation.id)}
                                className="rounded px-1 py-0.5 text-[0.62rem] text-muted hover:text-accent"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-line px-3 py-3">
            <div className="rounded-xl border border-line bg-card p-3">
              {editingName ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveName();
                  }}
                >
                  <label htmlFor="display-name" className="text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-muted">
                    What should Clintoy call you?
                  </label>
                  <input
                    id="display-name"
                    value={nameDraft}
                    autoFocus
                    maxLength={40}
                    onChange={(event) => setNameDraft(event.target.value)}
                    placeholder="Your first name"
                    className="mt-1.5 w-full rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm text-ink focus:border-ink focus:outline-none"
                  />
                  <div className="mt-2 flex gap-1.5">
                    <button type="submit" className="rounded-full bg-ink px-2.5 py-1 text-[0.68rem] font-semibold text-paper">
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingName(false)}
                      className="rounded-full border border-line px-2.5 py-1 text-[0.68rem] text-muted"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{name}</p>
                    <p className="truncate text-[0.65rem] leading-relaxed text-muted">{userEmail}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNameDraft(name);
                      setEditingName(true);
                    }}
                    className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[0.62rem] font-medium text-ink-soft hover:border-ink hover:text-ink"
                  >
                    Edit
                  </button>
                </div>
              )}
              <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2.5">
                <Link href="/library" className="text-[0.68rem] font-medium text-ink underline-link">
                  Prompt library
                </Link>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="text-[0.68rem] text-muted underline-link"
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div
            ref={scrollRef}
            role="log"
            aria-live="polite"
            aria-label="Conversation"
            className="flex-1 overflow-y-auto no-scrollbar px-4 py-5 sm:px-6"
          >
            <div className="mx-auto w-full max-w-3xl">
              {loadingMessages ? (
                <div className="space-y-3" aria-label="Loading conversation">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="h-20 animate-pulse rounded-2xl border border-line bg-card/60" />
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="rise pt-6">
                  <p className="sticker">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                    {mode} Â· {MODE_HELP[mode]}
                  </p>
                  <h1 className="mt-4 text-[clamp(1.9rem,4.4vw,2.8rem)] font-semibold leading-[1.1] text-ink">
                    {firstName ? `What are we thinking about, ${firstName}?` : "What can I help with?"}
                  </h1>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
                    {mode === "image"
                      ? "Describe a scene, mood or subject and Clintoy will generate an original picture â€” no stock photos."
                      : "Bring the real material: the messy thread, the blank page, the bug that only happens in production. Clintoy works best when you ask for a specific artefact â€” a plan, an email, a snippet, a decision."}
                  </p>

                  <fieldset className="mt-6 flex flex-wrap gap-1.5 sm:hidden">
                    <legend className="mb-1.5 text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-muted">
                      Thinking mode
                    </legend>
                    {MODES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={mode === item.id}
                        onClick={() => setMode(item.id)}
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                          mode === item.id ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink-soft"
                        }`}
                      >
                        {item.name}
                      </button>
                    ))}
                  </fieldset>

                  {mode === "image" ? (
                    <div className="mt-7 grid gap-2 sm:grid-cols-2">
                      {["A cosy cabin in a snowy forest at dusk", "A neon skyline over a rainy city street", "A watercolour garden full of wildflowers", "An abstract pattern in warm sunset colours"].map(
                        (starter) => (
                          <button
                            key={starter}
                            type="button"
                            onClick={() => {
                              setInput(starter);
                              inputRef.current?.focus();
                            }}
                            className="group flex items-start justify-between gap-3 rounded-xl border border-line bg-card px-3.5 py-3 text-left text-[0.82rem] leading-snug text-ink-soft transition hover:border-ink hover:text-ink"
                          >
                            {starter}
                            <svg viewBox="0 0 16 16" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted transition group-hover:text-accent" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M3 8h9M9 4.5L12.5 8 9 11.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        ),
                      )}
                    </div>
                  ) : (
                    <>
                      <h2 className="mt-7 text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-muted">
                        Try one of these
                      </h2>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {STARTERS.map((starter) => (
                          <button
                            key={starter}
                            type="button"
                            onClick={() => {
                              setInput(starter);
                              inputRef.current?.focus();
                            }}
                            className="group flex items-start justify-between gap-3 rounded-xl border border-line bg-card px-3.5 py-3 text-left text-[0.82rem] leading-snug text-ink-soft transition hover:border-ink hover:text-ink"
                          >
                            {starter}
                            <svg viewBox="0 0 16 16" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted transition group-hover:text-accent" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M3 8h9M9 4.5L12.5 8 9 11.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  <p className="mt-5 text-[0.7rem] text-muted">
                    Tip: press <kbd className="rounded border border-line bg-card px-1 font-mono text-[0.65rem]">âŒ˜K</kbd> or{" "}
                    <kbd className="rounded border border-line bg-card px-1 font-mono text-[0.65rem]">Ctrl K</kbd> for a
                    fresh thought. Everything is saved to your account.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {messages.map((message) => {
                    const isAssistant = message.role === "assistant";
                    return (
                      <article
                        key={message.id}
                        aria-label={isAssistant ? "Clintoy's reply" : "Your message"}
                        className={isAssistant ? "rise" : ""}
                      >
                        {isAssistant ? (
                          <div>
                            <div className="mb-1.5 flex items-center gap-2">
                              <ClintoyMark className="h-6 w-6" />
                              <span className="text-xs font-semibold text-ink">Clintoy</span>
                              <span className="rounded-full border border-line px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.1em] text-muted">
                                {message.engine === "cloud" ? "cloud model" : "clintoy engine Â· local"}
                              </span>
                            </div>
                            <div className="rounded-2xl rounded-tl-md border border-line bg-card px-4 py-3">
                              <Markdown content={message.content} />
                              {message.imageUrl ? (
                                <div className="mt-3 overflow-hidden rounded-xl border border-line">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={message.imageUrl} alt={message.content} className="block w-full max-w-md" />
                                </div>
                              ) : null}
                            </div>
                            <div className="mt-1.5 flex items-center gap-3 pl-1">
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(message.content);
                                    setStatus("Reply copied to clipboard.");
                                  } catch {
                                    setStatus("Could not copy on this browser.");
                                  }
                                }}
                                className="text-[0.68rem] text-muted transition hover:text-ink"
                              >
                                Copy
                              </button>
                              {message.imageUrl ? (
                                <button
                                  type="button"
                                  onClick={() => downloadImage(message.imageUrl!, `clintoy-${message.id}.png`)}
                                  className="text-[0.68rem] text-muted transition hover:text-ink"
                                >
                                  Download image
                                </button>
                              ) : null}
                              {message.id === lastAssistantId && !thinking ? (
                                <button
                                  type="button"
                                  onClick={() => void regenerate()}
                                  className="text-[0.68rem] text-muted transition hover:text-ink"
                                >
                                  Regenerate
                                </button>
                              ) : null}
                              <span className="text-[0.62rem] text-muted/80">{mode}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-end">
                            <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-[0.88rem] leading-relaxed text-paper">
                              {message.content}
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}

                  {thinking ? (
                    <div className="flex items-center gap-2 pl-1" aria-live="polite">
                      <ClintoyMark className="h-6 w-6" />
                      <div className="flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-2">
                        {[0, 1, 2].map((dot) => (
                          <span
                            key={dot}
                            className="thinking-dot h-1.5 w-1.5 rounded-full bg-accent"
                            style={{ animationDelay: `${dot * 0.15}s` }}
                          />
                        ))}
                        <span className="ml-1 text-[0.7rem] text-muted">
                          {mode === "image" ? "painting your pictureâ€¦" : `thinking in ${mode} modeâ€¦`}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {suggestions.length > 0 && !thinking ? (
                    <div className="flex flex-wrap gap-1.5 pl-1">
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => void submitMessage(suggestion)}
                          className="rounded-full border border-dashed border-line bg-card px-3 py-1.5 text-[0.72rem] text-ink-soft transition hover:border-accent hover:text-accent"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-line bg-paper/95 px-3 pb-3 pt-2.5 backdrop-blur sm:px-6">
            <div className="mx-auto w-full max-w-3xl">
              {error ? (
                <div
                  ref={errorRef}
                  tabIndex={-1}
                  role="alert"
                  className="mb-2 flex items-start justify-between gap-3 rounded-xl border border-line-strong bg-paper-soft px-3 py-2 text-xs text-ink"
                >
                  <span>{error}</span>
                  <button type="button" onClick={() => setError("")} className="font-semibold text-accent">
                    Dismiss
                  </button>
                </div>
              ) : null}

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitMessage();
                }}
                className="rounded-2xl border border-line bg-card p-2 shadow-sm focus-within:border-ink"
              >
                <label htmlFor="composer" className="sr-only">
                  Message Clintoy
                </label>
                <textarea
                  id="composer"
                  ref={inputRef}
                  value={input}
                  rows={1}
                  maxLength={4000}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      void submitMessage();
                    }
                  }}
                  placeholder={
                    speech.status === "listening"
                      ? "Listeningâ€¦ speak now"
                      : mode === "image"
                        ? "Describe the picture you want â€” subject, mood, colours, styleâ€¦"
                        : activeConversation
                          ? `Reply to Clintoy â€” mode: ${mode}`
                          : "Ask anything. Paste anything. Enter to send, Shift+Enter for a new line."
                  }
                  className="max-h-44 min-h-[2.75rem] w-full resize-none bg-transparent px-2 pt-1.5 text-[0.92rem] leading-relaxed text-ink placeholder:text-muted focus:outline-none"
                />

                {speech.status === "listening" && speech.interimText ? (
                  <p className="px-2 pb-1 text-[0.78rem] italic text-muted" aria-hidden="true">
                    {speech.interimText}â€¦
                  </p>
                ) : null}

                <div className="flex items-center justify-between gap-2 px-1 pt-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex items-center gap-0.5 sm:hidden">
                      {MODES.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          aria-pressed={mode === item.id}
                          onClick={() => setMode(item.id)}
                          className={`rounded-full px-1.5 py-0.5 text-[0.62rem] font-medium ${
                            mode === item.id ? "bg-ink text-paper" : "text-muted"
                          }`}
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>
                    <p className="hidden truncate text-[0.65rem] text-muted sm:block">
                      {thinking
                        ? mode === "image"
                          ? "Clintoy is paintingâ€¦"
                          : "Clintoy is composingâ€¦"
                        : speech.status === "listening"
                          ? "Listening â€” tap the mic again to stop"
                          : `${mode} mode Â· ${engineLabel}`}
                      {charCount > 3600 ? ` Â· ${charCount}/4000` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="hidden text-[0.62rem] text-muted lg:inline">Shift + Enter for a new line</span>
                    {mode !== "image" && speech.supported ? (
                      <button
                        type="button"
                        onClick={() => {
                          setVoiceNotice("");
                          speech.toggle();
                        }}
                        aria-pressed={speech.status === "listening"}
                        aria-label={speech.status === "listening" ? "Stop voice input" : "Start voice input"}
                        title={speech.status === "listening" ? "Stop voice input" : "Dictate with your microphone"}
                        className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition ${
                          speech.status === "listening"
                            ? "pulse-ring border-accent bg-accent text-white"
                            : "border-line bg-paper text-ink-soft hover:border-ink hover:text-ink"
                        }`}
                      >
                        <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <rect x="5.5" y="1.5" width="5" height="8" rx="2.5" />
                          <path d="M3 7.5a5 5 0 0 0 10 0M8 12.5v2M5.5 14.5h5" strokeLinecap="round" />
                        </svg>
                      </button>
                    ) : null}
                    <button
                      type="submit"
                      disabled={thinking || input.trim().length === 0}
                      className="flex h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-xs font-semibold text-paper transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {thinking ? (mode === "image" ? "Paintingâ€¦" : "Thinkingâ€¦") : mode === "image" ? "Generate" : "Send"}
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M2.5 8h10M9 4.5l3.5 3.5L9 11.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              </form>

              {voiceNotice ? (
                <p role="alert" className="mt-1.5 text-center text-[0.68rem] text-accent">
                  {voiceNotice}
                </p>
              ) : null}

              <p className="mt-1.5 text-center text-[0.62rem] leading-relaxed text-muted">
                Clintoy can be confidently wrong. Verify decisions that matter.{" "}
                <Link href="/accessibility#privacy" className="underline-link">
                  How your data is handled
                </Link>
                .
              </p>
              <p role="status" aria-live="polite" className="sr-only">
                {status}
              </p>
              <p role="status" aria-live="polite" className="sr-only">
                {speech.status === "listening" ? "Listening for your voice." : ""}
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function isModeIdValue(value: string): value is ModeId {
  return MODES.some((item) => item.id === value);
}
