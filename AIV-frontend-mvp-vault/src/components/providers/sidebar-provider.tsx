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
import { organizationsApi, type Organization } from "@/lib/api/organizations";

export interface SidebarContextValue {
  /* Organization */
  org: Organization | null;
  setOrg: (org: Organization) => void;
  isLoadingOrg: boolean;

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
  const [org, setOrg] = useState<Organization | null>(null);
  const [isLoadingOrg, setIsLoadingOrg] = useState(true);

  const [twins, setTwins] = useState<Twin[]>([]);
  const [activeTwin, setActiveTwin] = useState<Twin | null>(null);
  const [isLoadingTwins, setIsLoadingTwins] = useState(true);

  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  // Fetch org — fallback to synthetic org from localStorage if API fails
  useEffect(() => {
    organizationsApi.getMyOrg()
      .then((data) => {
        setOrg(data);
      })
      .catch(() => {
        // API failed — build org name from localStorage user data
        try {
          const stored = localStorage.getItem("user");
          if (stored) {
            const u = JSON.parse(stored);
            const name = u.org_name || u.name || "Organization";
            setOrg({ id: "", name: name.includes("Organization") ? name : `${name}'s Organization`, type: "TALENT_TEAM" });
          }
        } catch { /* ignore */ }
      })
      .finally(() => setIsLoadingOrg(false));
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
        org,
        setOrg,
        isLoadingOrg,
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
