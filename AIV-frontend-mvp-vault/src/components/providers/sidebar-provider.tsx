"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { fetchTwins, type Twin } from "@/lib/api/twins";
import { assistantApi, type AgentSession } from "@/lib/api/assistant";
import { authApi } from "@/lib/api/auth";
import { authStorage } from "@/lib/auth-storage";

export interface SidebarContextValue {
  /* Twins */
  twins: Twin[];
  activeTwin: Twin | null;
  setActiveTwin: (twin: Twin) => void;
  isLoadingTwins: boolean;

  /* Sessions */
  sessions: AgentSession[];
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  addSession: (session: AgentSession) => void;
  refreshSessions: () => Promise<void>;
  isLoadingSessions: boolean;
}

export const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [twins, setTwins] = useState<Twin[]>([]);
  const [activeTwin, setActiveTwin] = useState<Twin | null>(null);
  const [isLoadingTwins, setIsLoadingTwins] = useState(true);

  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  // Backfill org data from /auth/me if localStorage is missing it
  useEffect(() => {
    const stored = authStorage.getUser();
    if (stored && !stored.org_id) {
      authApi.getMe().then((me) => {
        const orgId = (me as Record<string, unknown>).org_id as string | undefined;
        const orgName = (me as Record<string, unknown>).org_name as string | undefined;
        const role = (me as Record<string, unknown>).role as string | undefined;
        if (orgId || orgName || role) {
          authStorage.saveUser({
            ...stored,
            org_id: orgId || stored.org_id,
            org_name: orgName || stored.org_name,
            role: role || stored.role,
          });
          // Trigger re-render for components reading from storage
          window.dispatchEvent(new StorageEvent("storage", { key: "user" }));
        }
      }).catch(() => {});
    }
  }, []);

  // Fetch twins on mount
  useEffect(() => {
    fetchTwins()
      .then((list) => {
        setTwins(list);
        if (list.length > 0) setActiveTwin(list[0]);
      })
      .catch(() => {})
      .finally(() => setIsLoadingTwins(false));
  }, []);

  // Fetch sessions on mount
  const refreshSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const list = await assistantApi.listSessions();
      setSessions(list);
    } catch {
      /* silent */
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  const addSession = useCallback((session: AgentSession) => {
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        twins,
        activeTwin,
        setActiveTwin,
        isLoadingTwins,
        sessions,
        activeSessionId,
        setActiveSessionId,
        addSession,
        refreshSessions,
        isLoadingSessions,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}
