"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { api, isRequestCanceled } from "@/lib/api";

type SessionSummary = {
  session_id: string;
  title: string;
  last_message_preview?: string | null;
};

type GroundingSnapshot = {
  user_profile?: {
    daily_study_minutes?: number;
  };
  weak_topics?: Array<{
    topic_name?: string;
    subject_name?: string;
  }>;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  message_text: string;
  grounding_snapshot_json?: GroundingSnapshot | null;
  token_usage_json?: {
    source?: string;
    intent?: string;
  } | null;
};

type SessionResponse = {
  session: SessionSummary;
  messages: ChatMessage[];
};

type SendMessageResponse = {
  session: SessionSummary;
  user_message: ChatMessage;
  assistant_message: ChatMessage;
};

const starterPrompts = [
  "Help me understand my weakest topic using today's context.",
  "Generate 3 practice questions with answer keys",
  "What should I study today for maximum score gain?",
  "Summarize dynamic programming in bullet points",
  "Is recursion a critical topic for my exam?",
];

export default function StudyChatPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sessionLoadError, setSessionLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const sessionLoadAbortRef = useRef<AbortController | null>(null);
  const sendAbortRef = useRef<AbortController | null>(null);

  const activeSession = useMemo(
    () => sessions.find((session) => session.session_id === activeSessionId) ?? null,
    [activeSessionId, sessions]
  );

  useEffect(() => {
    let cancelled = false;
    const bootstrapController = new AbortController();

    const bootstrap = async () => {
      try {
        setLoadError(null);
        setSessionLoadError(null);
        const { data } = await api.get<{ sessions: SessionSummary[] }>("/study-chat/sessions", {
          signal: bootstrapController.signal,
        });
        const loadedSessions = data.sessions ?? [];

        if (cancelled) {
          return;
        }

        setSessions(loadedSessions);

        if (loadedSessions.length > 0) {
          const firstSessionId = loadedSessions[0].session_id;
          setActiveSessionId(firstSessionId);

          const sessionData = await api.get<SessionResponse>(
            `/study-chat/sessions/${firstSessionId}`,
            {
              signal: bootstrapController.signal,
            }
          );
          if (!cancelled) {
            setMessages(sessionData.data.messages ?? []);
          }
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (isRequestCanceled(error)) {
          return;
        }

        const message =
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          "Unable to load study chat right now.";
        setLoadError(message);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
      bootstrapController.abort();
      sessionLoadAbortRef.current?.abort();
      sendAbortRef.current?.abort();
    };
  }, []);

  const loadSession = async (sessionId: string) => {
    if (!sessionId) {
      return;
    }

    sessionLoadAbortRef.current?.abort();
    const controller = new AbortController();
    sessionLoadAbortRef.current = controller;

    setActiveSessionId(sessionId);
    setSessionLoadError(null);

    try {
      const { data } = await api.get<SessionResponse>(`/study-chat/sessions/${sessionId}`, {
        signal: controller.signal,
      });
      setMessages(data.messages ?? []);
    } catch (error) {
      if (isRequestCanceled(error)) {
        return;
      }

      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Unable to load this session right now.";
      setSessionLoadError(message);
    } finally {
      if (sessionLoadAbortRef.current === controller) {
        sessionLoadAbortRef.current = null;
      }
    }
  };

  const createSession = async (signal?: AbortSignal): Promise<string | null> => {
    try {
      const { data } = await api.post<SessionResponse>(
        "/study-chat/sessions",
        {
          title: null,
          context_type: "general",
        },
        {
          signal,
        }
      );

      const nextSession = data.session;
      setSessions((current) => [
        nextSession,
        ...current.filter((item) => item.session_id !== nextSession.session_id),
      ]);
      setActiveSessionId(nextSession.session_id);
      setMessages(data.messages ?? []);
      setSessionLoadError(null);
      return nextSession.session_id;
    } catch (error) {
      if (isRequestCanceled(error)) {
        return null;
      }
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Unable to create a new chat session right now.";
      setSessionLoadError(message);
      return null;
    }
  };

  const sendMessage = async (text: string) => {
    const cleanText = text.trim();
    if (!cleanText || isSending) {
      return;
    }

    setInput("");
    setIsSending(true);
    setSendError(null);

    sendAbortRef.current?.abort();
    const sendController = new AbortController();
    sendAbortRef.current = sendController;

    try {
      let sessionId = activeSessionId;
      if (!sessionId) {
        sessionId = await createSession(sendController.signal);
      }

      if (!sessionId) {
        return;
      }

      const { data } = await api.post<SendMessageResponse>(
        `/study-chat/sessions/${sessionId}/messages`,
        { message: cleanText },
        {
          signal: sendController.signal,
        }
      );

      setSessions((current) => [
        data.session,
        ...current.filter((session) => session.session_id !== data.session.session_id),
      ]);

      setMessages((current) => [...current, data.user_message, data.assistant_message]);
    } catch (error) {
      if (isRequestCanceled(error)) {
        return;
      }
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Unable to send message right now.";
      setSendError(message);
    } finally {
      if (sendAbortRef.current === sendController) {
        sendAbortRef.current = null;
      }
      setIsSending(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading AI assistant..." />;
  }

  if (loadError && sessions.length === 0) {
    return (
      <main>
        <EmptyState
          icon="!"
          title="AI assistant unavailable"
          description={loadError}
          ctaLabel="Retry"
          ctaHref="/chat"
        />
      </main>
    );
  }

  return (
    <main className="space-y-5">
      <section className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[3rem] font-semibold leading-none text-[var(--cream)] md:text-[3.8rem]">AI Study Chat</h1>
            <p className="mt-2 text-xl text-[rgba(194,186,176,0.72)]">AI Exam Assistant · Unlimited messages</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void createSession();
              }}
              className="h-11 border border-[rgba(240,232,218,0.08)] px-4 text-[var(--cream)]"
            >
              New Chat
            </button>
            <button type="button" className="h-11 border border-[rgba(240,232,218,0.08)] px-4 text-[rgba(194,186,176,0.72)]">
              Regenerate
            </button>
            <button
              type="button"
              onClick={() => {
                void loadSession(activeSession?.session_id ?? "");
              }}
              disabled={!activeSession}
              className="h-11 border border-[rgba(240,232,218,0.08)] px-4 text-[rgba(194,186,176,0.72)] disabled:opacity-50"
            >
              Settings
            </button>
          </div>
        </div>

        {sessions.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {sessions.map((session) => {
              const isActive = session.session_id === activeSessionId;
              return (
                <button
                  key={session.session_id}
                  type="button"
                  onClick={() => {
                    void loadSession(session.session_id);
                  }}
                  className={
                    isActive
                      ? "h-10 border border-[rgba(232,82,10,0.45)] bg-[rgba(232,82,10,0.12)] px-4 text-sm text-[var(--cream)]"
                      : "h-10 border border-[rgba(240,232,218,0.08)] px-4 text-sm text-[rgba(194,186,176,0.76)]"
                  }
                >
                  {session.title || "Untitled Session"}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="mt-4 border border-[rgba(240,232,218,0.08)] p-4">
          <div className="min-h-[360px] space-y-4 border border-[rgba(240,232,218,0.08)] bg-[rgba(0,0,0,0.2)] p-4">
            {sessionLoadError ? (
              <div className="flex items-center justify-between gap-3 border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.02)] p-3 text-sm text-[rgba(194,186,176,0.86)]">
                <p>{sessionLoadError}</p>
                <button
                  type="button"
                  onClick={() => {
                    if (activeSessionId) {
                      void loadSession(activeSessionId);
                    }
                  }}
                  disabled={!activeSessionId}
                  className="h-9 border border-[rgba(240,232,218,0.16)] px-3 text-[var(--cream)] disabled:opacity-50"
                >
                  Retry Session
                </button>
              </div>
            ) : null}

            {messages.length === 0 ? (
              <div className="space-y-3">
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-[rgba(194,186,176,0.52)]">AI</p>
                <div className="max-w-[92%] border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.02)] p-3 text-[var(--cream)]">
                  Welcome! I&apos;m your SmartExamPrep AI assistant. Ask for concept explanations, practice questions, study plans, or quick revision summaries.
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={
                      message.role === "user"
                        ? "max-w-[70%] border border-[rgba(232,82,10,0.45)] bg-[rgba(232,82,10,0.2)] p-3 text-[var(--cream)]"
                        : "max-w-[78%] border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.02)] p-3 text-[var(--cream)]"
                    }
                  >
                    <p className="mb-2 font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[rgba(194,186,176,0.56)]">
                      {message.role === "user"
                        ? "YOU"
                        : message.role === "assistant"
                          ? message.token_usage_json?.source === "fallback"
                            ? "FALLBACK"
                            : "AI"
                          : "SYSTEM"}
                    </p>
                    {message.message_text}

                    {message.role === "assistant" && message.token_usage_json?.source === "fallback" ? (
                      <p className="mt-3 border-t border-[rgba(240,232,218,0.08)] pt-3 text-xs text-[rgba(194,186,176,0.68)]">
                        Response served from grounded fallback guidance while live AI routing was unavailable.
                      </p>
                    ) : null}

                    {message.role === "assistant" && message.grounding_snapshot_json ? (
                      <div className="mt-3 space-y-2 border-t border-[rgba(240,232,218,0.08)] pt-3 text-sm text-[rgba(194,186,176,0.84)]">
                        {typeof message.grounding_snapshot_json.user_profile?.daily_study_minutes === "number" ? (
                          <p>
                            Daily target: {message.grounding_snapshot_json.user_profile.daily_study_minutes} minutes
                          </p>
                        ) : null}

                        {(message.grounding_snapshot_json.weak_topics ?? []).map((item, index) => {
                          if (!item.topic_name) {
                            return null;
                          }

                          const label = item.subject_name
                            ? `${item.topic_name} (${item.subject_name})`
                            : item.topic_name;

                          return (
                            <p key={`${label}-${index}`}>{label}</p>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            )}

            {isSending ? (
              <div className="max-w-[200px] border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.02)] p-3 text-[var(--ice)]">
                AI is thinking...
              </div>
            ) : null}
          </div>

          <form
            className="mt-4 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage(input);
            }}
          >
            <input
              id="study-chat-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask your question..."
              className="h-11 flex-1 border border-[rgba(240,232,218,0.08)] bg-transparent px-4 text-[var(--cream)]"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="h-11 bg-[var(--fire)] px-5 font-semibold text-white disabled:opacity-60"
            >
              Send
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {starterPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  void sendMessage(prompt);
                }}
                className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.02)] px-3 py-2 text-sm text-[rgba(194,186,176,0.78)] transition hover:border-[rgba(232,82,10,0.35)] hover:bg-[rgba(232,82,10,0.08)]"
              >
                {prompt}
              </button>
            ))}
          </div>

          {sendError ? <p className="mt-3 text-sm text-rose-300">{sendError}</p> : null}
        </div>
      </section>
    </main>
  );
}

