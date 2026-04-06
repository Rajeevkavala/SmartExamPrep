import { create } from "zustand";

export type StudyChatRole = "user" | "assistant" | "system";

export type StudyChatMessage = {
  id: string;
  role: StudyChatRole;
  message_text: string;
  grounding_snapshot_json?: Record<string, unknown> | null;
  created_at: string;
};

export type StudyChatSessionSummary = {
  session_id: string;
  title: string;
  context_type: string;
  last_used_at: string;
  created_at: string;
  updated_at?: string | null;
  last_message_preview?: string | null;
  message_count: number;
};

type ChatStoreState = {
  sessions: StudyChatSessionSummary[];
  activeSessionId: string | null;
  messagesBySession: Record<string, StudyChatMessage[]>;
  setSessions: (sessions: StudyChatSessionSummary[]) => void;
  upsertSession: (session: StudyChatSessionSummary) => void;
  setActiveSessionId: (sessionId: string | null) => void;
  setSessionMessages: (sessionId: string, messages: StudyChatMessage[]) => void;
  appendSessionMessages: (sessionId: string, messages: StudyChatMessage[]) => void;
  clearChatState: () => void;
};

const sortSessions = (sessions: StudyChatSessionSummary[]) =>
  [...sessions].sort(
    (first, second) =>
      new Date(second.last_used_at).getTime() -
      new Date(first.last_used_at).getTime()
  );

export const useChatStore = create<ChatStoreState>((set) => ({
  sessions: [],
  activeSessionId: null,
  messagesBySession: {},
  setSessions: (sessions) =>
    set((state) => {
      const sorted = sortSessions(sessions);
      const nextActive =
        state.activeSessionId && sorted.some((item) => item.session_id === state.activeSessionId)
          ? state.activeSessionId
          : sorted[0]?.session_id ?? null;

      return {
        sessions: sorted,
        activeSessionId: nextActive,
      };
    }),
  upsertSession: (session) =>
    set((state) => {
      const existing = state.sessions.find((item) => item.session_id === session.session_id);
      const nextSessions = existing
        ? state.sessions.map((item) =>
            item.session_id === session.session_id ? session : item
          )
        : [session, ...state.sessions];

      return {
        sessions: sortSessions(nextSessions),
        activeSessionId: state.activeSessionId ?? session.session_id,
      };
    }),
  setActiveSessionId: (sessionId) => set({ activeSessionId: sessionId }),
  setSessionMessages: (sessionId, messages) =>
    set((state) => ({
      messagesBySession: {
        ...state.messagesBySession,
        [sessionId]: messages,
      },
    })),
  appendSessionMessages: (sessionId, messages) =>
    set((state) => ({
      messagesBySession: {
        ...state.messagesBySession,
        [sessionId]: [...(state.messagesBySession[sessionId] ?? []), ...messages],
      },
    })),
  clearChatState: () =>
    set({
      sessions: [],
      activeSessionId: null,
      messagesBySession: {},
    }),
}));
