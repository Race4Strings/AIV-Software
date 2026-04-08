"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Home,
  Fingerprint,
  Brain,
  Briefcase,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Plus,
  MessageSquare,
  Check,
  Pencil,
  Users,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSidebar } from "@/hooks/use-sidebar";
import { assistantApi } from "@/lib/api/assistant";
import { organizationsApi } from "@/lib/api/organizations";
import { humanizeEnum } from "@/lib/humanize";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

const NAV_ITEMS = [
  { title: t("nav.home"), href: "/dashboard", icon: Home },
  { title: t("nav.identity"), href: "/twin", icon: Fingerprint },
  { title: t("nav.deals"), href: "/deals", icon: Briefcase },
  { title: t("nav.protection"), href: "/protection", icon: ShieldCheck },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/twin")
    return (
      pathname === "/twin" ||
      pathname.startsWith("/twin/certification") ||
      pathname.startsWith("/twin/training/")
    );
  if (href === "/twin/training-area") return pathname.startsWith("/twin/training-area");
  if (href === "/deals") return pathname.startsWith("/deals");
  if (href === "/protection") return pathname.startsWith("/protection");
  return false;
}

/** Status dot color for twin health */
function twinStatusColor(status?: string): string {
  switch (status?.toUpperCase()) {
    case "ACTIVE": return "bg-success";
    case "BUILDING": case "INITIALIZING": return "bg-warning";
    case "LOCKED": case "PROTECTED_HOLD": return "bg-destructive";
    case "ARCHIVED": return "bg-muted-foreground/30";
    default: return "bg-muted-foreground/30";
  }
}

/** Generate a consistent color from a string (for org avatars) */
function stringToColor(str: string): string {
  const colors = [
    "bg-primary", "bg-accent", "bg-success", "bg-warning",
    "bg-destructive", "bg-primary/80", "bg-accent/80",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

/** Smarter date grouping with day names */
function getDateLabel(d: Date, now: Date): string {
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();
  if (d.toDateString() === today) return "Today";
  if (d.toDateString() === yesterday) return "Yesterday";
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  if (d > weekAgo) {
    return d.toLocaleDateString(undefined, { weekday: "long" });
  }
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);
  if (d > twoWeeksAgo) return "Last Week";
  return "Earlier";
}

interface AppSidebarProps {
  className?: string;
  onNavigate?: () => void;
  forceExpanded?: boolean;
}

export function AppSidebar({ className, onNavigate, forceExpanded }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    collapsed,
    toggleCollapse,
    orgs,
    activeOrg,
    setActiveOrg,
    addOrg,
    twins,
    activeTwin,
    setActiveTwin,
    isLoadingTwins,
    sessions,
    activeSessionId,
    setActiveSessionId,
    addSession,
    isLoadingSessions,
    pendingDealCount,
  } = useSidebar();

  const isCollapsed = forceExpanded ? false : collapsed;
  const [trainingOpen, setTrainingOpen] = useState(
    pathname.startsWith("/twin/training-area")
  );
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [renameOrgOpen, setRenameOrgOpen] = useState(false);
  const [renameOrgDraft, setRenameOrgDraft] = useState("");

  const orgName = activeOrg?.name || "My Organization";
  const trainingActive = pathname.startsWith("/twin/training-area");

  async function handleCreateOrg() {
    const trimmed = newOrgName.trim();
    if (!trimmed) return;
    try {
      const newOrg = await organizationsApi.createOrg(trimmed);
      addOrg(newOrg);
      toast.success(`Created "${trimmed}"`);
    } catch {
      toast.error("Failed to create organization");
    } finally {
      setCreateOrgOpen(false);
      setNewOrgName("");
    }
  }

  async function handleRenameOrg() {
    const trimmed = renameOrgDraft.trim();
    if (!trimmed || trimmed === orgName || !activeOrg?.id) return;
    try {
      const updated = await organizationsApi.update(activeOrg.id, trimmed);
      setActiveOrg({ ...activeOrg, name: updated.name });
      toast.success("Organization renamed");
    } catch {
      toast.error("Failed to rename");
    } finally {
      setRenameOrgOpen(false);
    }
  }

  async function handleNewSession() {
    try {
      const twinId = activeTwin?.id;
      const session = await assistantApi.createSession(twinId);
      addSession(session);
      router.push(`/twin/training-area?session=${session.id}`);
      onNavigate?.();
    } catch {
      /* handled by toast in assistant interface */
    }
  }

  function handleNavClick() {
    onNavigate?.();
  }

  function groupSessions() {
    const grouped: Record<string, typeof sessions> = {};
    const now = new Date();
    sessions.slice(0, 15).forEach((s) => {
      const d = new Date(s.started_at);
      const label = getDateLabel(d, now);
      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(s);
    });
    return grouped;
  }

  function getSessionTitle(s: typeof sessions[0]): string {
    if (s.title) return s.title;
    const mode = humanizeEnum(s.current_mode || "ASSISTANT");
    return `${mode} session`;
  }

  // ─── Collapsed (icon-only) mode ─────────────────────────────────
  if (isCollapsed) {
    return (
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen w-12 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col items-center z-40 py-3 gap-1",
          className
        )}
      >
        {/* Logo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/dashboard" onClick={handleNavClick} className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-sidebar-accent/50 mb-2">
              <ShieldCheck className="h-4 w-4 text-sidebar-primary" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">AIV</TooltipContent>
        </Tooltip>

        {/* Org avatar */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={toggleCollapse} className={cn("flex items-center justify-center h-7 w-7 rounded-md text-xs font-bold text-white mb-1", stringToColor(orgName))}>
              {orgName.charAt(0).toUpperCase()}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{orgName}</TooltipContent>
        </Tooltip>

        {/* Twin */}
        {activeTwin && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative mb-2">
                <Fingerprint className="h-4 w-4 text-sidebar-primary" />
                <span className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-sidebar",
                  twinStatusColor(activeTwin.health_status || activeTwin.status)
                )} />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">{activeTwin.display_name || activeTwin.name}</TooltipContent>
          </Tooltip>
        )}

        <div className="h-px w-6 bg-sidebar-border my-1" />

        {/* Nav icons */}
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          const isDeals = item.href === "/deals";
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  onClick={handleNavClick}
                  className={cn(
                    "relative flex items-center justify-center h-8 w-8 rounded-md transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {isDeals && pendingDealCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground px-0.5">
                      {pendingDealCount}
                    </span>
                  )}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{item.title}</TooltipContent>
            </Tooltip>
          );
        })}

        {/* Training icon */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/twin/training-area"
              onClick={handleNavClick}
              className={cn(
                "flex items-center justify-center h-8 w-8 rounded-md transition-colors",
                trainingActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Brain className="h-4 w-4" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{t("nav.training")}</TooltipContent>
        </Tooltip>

        {/* Expand button at bottom */}
        <div className="mt-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={toggleCollapse} className="flex items-center justify-center h-8 w-8 rounded-md text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors">
                <PanelLeft className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        </div>
      </aside>
    );
  }

  // ─── Expanded (full) mode ───────────────────────────────────────
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen w-60 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col z-40",
        className
      )}
    >
      {/* Header: Logo + Org + Twin Switcher */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-sidebar-border">
        {/* AIV Logo */}
        <Link href="/dashboard" onClick={handleNavClick} className="flex items-center gap-2 mb-3">
          <ShieldCheck className="h-4 w-4 text-sidebar-primary" />
          <span className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider">AIV</span>
        </Link>

        {/* Organization selector with avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors mb-2">
              <span className={cn("flex h-5 w-5 items-center justify-center rounded text-xs font-bold text-white shrink-0", stringToColor(orgName))}>
                {orgName.charAt(0).toUpperCase()}
              </span>
              <span className="truncate flex-1 text-left">{orgName}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {orgs.map((o) => (
              <DropdownMenuItem
                key={o.id || o.name}
                onClick={() => {
                  if (o.id !== activeOrg?.id) {
                    setActiveOrg(o);
                    router.push("/dashboard");
                    onNavigate?.();
                  }
                }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn("flex h-5 w-5 items-center justify-center rounded text-xs font-bold text-white shrink-0", stringToColor(o.name))}>
                    {o.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="truncate">{o.name}</span>
                  {o.id === activeOrg?.id && <Check className="h-3.5 w-3.5 shrink-0 text-sidebar-primary" />}
                </div>
                {o.role && (
                  <span className="text-xs text-muted-foreground ml-2 shrink-0">
                    {o.role.charAt(0) + o.role.slice(1).toLowerCase()}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { setRenameOrgDraft(orgName); setRenameOrgOpen(true); }}>
              <Pencil className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { router.push("/settings/team"); onNavigate?.(); }}>
              <Users className="mr-2 h-4 w-4" />
              Manage Team
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { router.push("/settings"); onNavigate?.(); }}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setCreateOrgOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Organization
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Rename org dialog */}
        <Dialog open={renameOrgOpen} onOpenChange={setRenameOrgOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Rename Organization</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleRenameOrg(); }} className="flex flex-col gap-3">
              <Input
                value={renameOrgDraft}
                onChange={(e) => setRenameOrgDraft(e.target.value)}
                placeholder="Organization name"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" type="button" onClick={() => setRenameOrgOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={!renameOrgDraft.trim() || renameOrgDraft.trim() === orgName}>Save</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Create org dialog */}
        <Dialog open={createOrgOpen} onOpenChange={setCreateOrgOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>New Organization</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateOrg(); }} className="flex flex-col gap-3">
              <Input
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="Organization name"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" type="button" onClick={() => { setCreateOrgOpen(false); setNewOrgName(""); }}>Cancel</Button>
                <Button type="submit" disabled={!newOrgName.trim()}>Create</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Twin Switcher with status dots */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium hover:bg-sidebar-accent/50 transition-colors">
              {isLoadingTwins ? (
                <div className="h-4 w-32 rounded bg-sidebar-accent/30 animate-shimmer" />
              ) : activeTwin ? (
                <>
                  <div className="relative shrink-0">
                    <Fingerprint className="h-4 w-4 text-sidebar-primary" />
                    <span className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-sidebar",
                      twinStatusColor(activeTwin.health_status || activeTwin.status)
                    )} />
                  </div>
                  <span className="truncate flex-1 text-left">
                    {activeTwin.display_name || activeTwin.name || "Unnamed"}
                  </span>
                  {twins.length > 1 && (
                    <span className="text-xs text-sidebar-foreground/30 shrink-0">{twins.length}</span>
                  )}
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/50" />
                </>
              ) : (
                <>
                  <Fingerprint className="h-4 w-4 shrink-0 text-sidebar-foreground/40" />
                  <span className="text-sidebar-foreground/50 flex-1 text-left">
                    {t("nav.noIdentity")}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/50" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            {twins.map((tw) => (
              <DropdownMenuItem
                key={tw.id}
                onClick={() => setActiveTwin(tw)}
                className={cn(
                  "flex items-center gap-2",
                  tw.id === activeTwin?.id && "bg-accent"
                )}
              >
                <div className="relative shrink-0">
                  <Fingerprint className="h-4 w-4" />
                  <span className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-popover",
                    twinStatusColor(tw.health_status || tw.status)
                  )} />
                </div>
                <span className="truncate flex-1">{tw.display_name || tw.name || "Unnamed"}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {humanizeEnum(tw.status || "BUILDING")}
                </span>
              </DropdownMenuItem>
            ))}
            {twins.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={() => {
                router.push("/onboard");
                onNavigate?.();
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("nav.addIdentity")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-0.5 px-2">
          {/* Home & Identity */}
          {NAV_ITEMS.slice(0, 2).map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {item.title}
              </Link>
            );
          })}

          {/* Training (collapsible) */}
          <Collapsible open={trainingOpen} onOpenChange={setTrainingOpen}>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  trainingActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <Brain className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="flex-1 text-left">{t("nav.training")}</span>
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-transform",
                    trainingOpen && "rotate-90"
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-sidebar-border pl-3">
                {isLoadingSessions ? (
                  <div className="space-y-2 px-2 py-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-4 rounded bg-sidebar-accent/20 animate-shimmer" />
                    ))}
                  </div>
                ) : sessions.length > 0 ? (
                  <>
                    {Object.entries(groupSessions()).map(
                      ([label, sessionsInGroup]) => (
                        <div key={label}>
                          <p className="text-xs text-sidebar-foreground/30 uppercase tracking-wider px-2 pt-2 pb-1">
                            {label}
                          </p>
                          {sessionsInGroup.map((s) => (
                            <Link
                              key={s.id}
                              href={`/twin/training-area?session=${s.id}`}
                              onClick={() => {
                                setActiveSessionId(s.id);
                                handleNavClick();
                              }}
                              className={cn(
                                "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                                s.id === activeSessionId
                                  ? "bg-sidebar-accent/60 text-sidebar-accent-foreground"
                                  : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
                              )}
                            >
                              <MessageSquare className="h-3 w-3 shrink-0" />
                              <span className="truncate flex-1">
                                {getSessionTitle(s)}
                              </span>
                              <span className="text-xs text-sidebar-foreground/30 shrink-0">
                                {new Date(s.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </Link>
                          ))}
                        </div>
                      )
                    )}
                  </>
                ) : (
                  <Link
                    href="/twin/training-area"
                    onClick={handleNavClick}
                    className="px-2 py-2 text-xs text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors"
                  >
                    {t("nav.startTraining")}
                  </Link>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNewSession}
                  className="justify-start gap-2 px-2 h-7 text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground"
                >
                  <Plus className="h-3 w-3" />
                  {t("nav.newSession")}
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Deals & Protection */}
          {NAV_ITEMS.slice(2).map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            const isDeals = item.href === "/deals";
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="flex-1">{item.title}</span>
                {isDeals && pendingDealCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">
                    {pendingDealCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Collapse toggle */}
      <div className="shrink-0 px-2 py-2 border-t border-sidebar-border">
        <button
          onClick={toggleCollapse}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-xs text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          <PanelLeftClose className="h-4 w-4 shrink-0" />
          Collapse
        </button>
      </div>
    </aside>
  );
}
