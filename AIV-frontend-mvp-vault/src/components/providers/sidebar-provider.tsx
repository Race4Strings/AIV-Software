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

const ACTIVE_ORG_KEY = "aiv_active_org";

export interface SidebarContextValue {
  /* Organizations */
  orgs: Organization[];
  activeOrg: Organization | null;
  setActiveOrg: (org: Organization) => void;
  addOrg: (org: Organization) => void;
  isLoadingOrgs: boolean;

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
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrgState] = useState<Organization | null>(null);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);

  const [twins, setTwins] = useState<Twin[]>([]);
  const [activeTwin, setActiveTwin] = useState<Twin | null>(null);
  const [isLoadingTwins, setIsLoadingTwins] = useState(true);

  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  // Fetch all orgs on mount
  useEffect(() => {
    organizationsApi.listMyOrgs()
      .then((list) => {
        setOrgs(list);
        // Restore active org from localStorage or pick first
        const savedId = localStorage.getItem(ACTIVE_ORG_KEY);
        const saved = savedId ? list.find((o) => o.id === savedId) : null;
        setActiveOrgState(saved || list[0] || null);
      })
      .catch(() => {
        // Fallback: try getMyOrg or build from localStorage
        organizationsApi.getMyOrg()
          .then((org) => {
            setOrgs([org]);
            setActiveOrgState(org);
          })
          .catch(() => {
            try {
              const stored = localStorage.getItem("user");
              if (stored) {
                const u = JSON.parse(stored);
                const name = u.org_name || u.name || "Organization";
                const fallback: Organization = {
                  id: "", name: name.includes("Organization") ? name : `${name}'s Organization`,
                  type: "TALENT_TEAM",
                };
                setOrgs([fallback]);
                setActiveOrgState(fallback);
              }
            } catch { /* ignore */ }
          });
      })
      .finally(() => setIsLoadingOrgs(false));
  }, []);

  function setActiveOrg(org: Organization) {
    setActiveOrgState(org);
    localStorage.setItem(ACTIVE_ORG_KEY, org.id);
  }

  function addOrg(org: Organization) {
    setOrgs((prev) => [...prev, org]);
    setActiveOrg(org);
  }

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
        orgs,
        activeOrg,
        setActiveOrg,
        addOrg,
        isLoadingOrgs,
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
