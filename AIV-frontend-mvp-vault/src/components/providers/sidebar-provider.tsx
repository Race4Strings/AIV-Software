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
import { licensingApi } from "@/lib/api/licensing";

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
  refreshTwins: () => Promise<void>;
  isLoadingTwins: boolean;

  /* Sessions */
  sessions: AgentSession[];
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  addSession: (session: AgentSession) => void;
  refreshSessions: () => Promise<void>;
  isLoadingSessions: boolean;

  /* Deals */
  pendingDealCount: number;
}

export const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrgState] = useState<Organization | null>(null);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [orgReady, setOrgReady] = useState(false);

  const [twins, setTwins] = useState<Twin[]>([]);
  const [activeTwin, setActiveTwinState] = useState<Twin | null>(null);
  const [isLoadingTwins, setIsLoadingTwins] = useState(true);

  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [pendingDealCount, setPendingDealCount] = useState(0);

  // Fetch all orgs on mount
  useEffect(() => {
    organizationsApi.listMyOrgs()
      .then((list) => {
        setOrgs(list);
        const savedId = localStorage.getItem(ACTIVE_ORG_KEY);
        const saved = savedId ? list.find((o) => o.id === savedId) : null;
        setActiveOrgState(saved || list[0] || null);
      })
      .catch(() => {
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
      .finally(() => {
        setIsLoadingOrgs(false);
        setOrgReady(true);
      });
  }, []);

  function setActiveOrg(org: Organization) {
    setActiveOrgState(org);
    localStorage.setItem(ACTIVE_ORG_KEY, org.id);
  }

  function addOrg(org: Organization) {
    setOrgs((prev) => [...prev, org]);
    setActiveOrg(org);
  }

  // Fetch twins — runs on mount and when active org changes
  const refreshTwins = useCallback(async () => {
    setIsLoadingTwins(true);
    try {
      const list = await fetchTwins();
      setTwins(list);
      setActiveTwinState(list.length > 0 ? list[0] : null);
    } catch {
      setTwins([]);
      setActiveTwinState(null);
    } finally {
      setIsLoadingTwins(false);
    }
  }, []);

  useEffect(() => {
    if (orgReady) refreshTwins();
  }, [orgReady, activeOrg, refreshTwins]);

  // Fetch sessions — runs on mount and when active org changes
  const refreshSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const list = await assistantApi.listSessions();
      setSessions(list);
    } catch {
      setSessions([]);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    if (orgReady) refreshSessions();
  }, [orgReady, activeOrg, refreshSessions]);

  // Fetch pending deal count
  useEffect(() => {
    if (!orgReady) return;
    licensingApi.getDeals(undefined, "SUBMITTED")
      .then((deals) => setPendingDealCount(deals.length))
      .catch(() => setPendingDealCount(0));
  }, [orgReady, activeOrg]);

  function setActiveTwin(twin: Twin) {
    setActiveTwinState(twin);
  }

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
        refreshTwins,
        isLoadingTwins,
        sessions,
        activeSessionId,
        setActiveSessionId,
        addSession,
        refreshSessions,
        isLoadingSessions,
        pendingDealCount,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}
