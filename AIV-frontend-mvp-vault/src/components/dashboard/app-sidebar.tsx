"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { useSidebar } from "@/hooks/use-sidebar";
import { useStoredUser } from "@/hooks/use-stored-user";
import { assistantApi } from "@/lib/api/assistant";
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

interface AppSidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function AppSidebar({ className, onNavigate }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useStoredUser();
  const {
    twins,
    activeTwin,
    setActiveTwin,
    isLoadingTwins,
    sessions,
    activeSessionId,
    setActiveSessionId,
    addSession,
    isLoadingSessions,
  } = useSidebar();

  const [trainingOpen, setTrainingOpen] = useState(
    pathname.startsWith("/twin/training-area")
  );

  const orgName =
    (user as Record<string, unknown>)?.org_name as string ||
    "My Organization";

  const trainingActive = pathname.startsWith("/twin/training-area");

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

  // Group sessions by date
  function groupSessions() {
    const grouped: Record<string, typeof sessions> = {};
    const now = new Date();
    const today = now.toDateString();
    const yesterday = new Date(now.getTime() - 86400000).toDateString();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);

    sessions.slice(0, 15).forEach((s) => {
      const d = new Date(s.started_at);
      const label =
        d.toDateString() === today
          ? "Today"
          : d.toDateString() === yesterday
          ? "Yesterday"
          : d > weekAgo
          ? "This Week"
          : "Earlier";
      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(s);
    });

    return grouped;
  }

  function getSessionTitle(s: typeof sessions[0]): string {
    const mode = humanizeEnum(s.current_mode || "ASSISTANT");
    return `${mode} session`;
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen w-60 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col z-40",
        className
      )}
    >
      {/* Header: Org + Twin Switcher */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-sidebar-border">
        {/* Org name */}
        <p className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-3 truncate">
          {orgName}
        </p>

        {/* Twin Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium hover:bg-sidebar-accent/50 transition-colors">
              {isLoadingTwins ? (
                <div className="h-4 w-32 rounded bg-sidebar-accent/30 animate-shimmer" />
              ) : activeTwin ? (
                <>
                  <Fingerprint className="h-4 w-4 shrink-0 text-sidebar-primary" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="truncate flex-1 text-left">
                        {activeTwin.display_name || activeTwin.name || "Unnamed"}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {activeTwin.display_name || activeTwin.name}
                    </TooltipContent>
                  </Tooltip>
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
                  tw.id === activeTwin?.id && "bg-accent"
                )}
              >
                <Fingerprint className="mr-2 h-4 w-4" />
                <span className="truncate">
                  {tw.display_name || tw.name || "Unnamed"}
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
                {/* Training area link */}
                <Link
                  href="/twin/training-area"
                  onClick={handleNavClick}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                    pathname === "/twin/training-area" && !activeSessionId
                      ? "text-sidebar-primary"
                      : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
                  )}
                >
                  <Brain className="h-3 w-3 shrink-0" />
                  {t("nav.training")}
                </Link>

                {/* Session list */}
                {isLoadingSessions ? (
                  <div className="space-y-2 px-2 py-1">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-4 rounded bg-sidebar-accent/20 animate-shimmer"
                      />
                    ))}
                  </div>
                ) : sessions.length > 0 ? (
                  <>
                    {Object.entries(groupSessions()).map(
                      ([label, groupSessions]) => (
                        <div key={label}>
                          <p className="text-xs text-sidebar-foreground/30 uppercase tracking-wider px-2 pt-2 pb-1">
                            {label}
                          </p>
                          {groupSessions.map((s) => (
                            <Link
                              key={s.id}
                              href={`/twin/training-area?session=${s.id}`}
                              onClick={() => {
                                setActiveSessionId(s.id);
                                handleNavClick();
                              }}
                              className={cn(
                                "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors group",
                                s.id === activeSessionId
                                  ? "bg-sidebar-accent/60 text-sidebar-accent-foreground"
                                  : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
                              )}
                            >
                              <MessageSquare className="h-3 w-3 shrink-0" />
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="truncate flex-1">
                                    {getSessionTitle(s)}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                  {getSessionTitle(s)}
                                </TooltipContent>
                              </Tooltip>
                              <Badge
                                variant="outline"
                                className="text-xs px-1 py-0 shrink-0 opacity-60 group-hover:opacity-100"
                              >
                                {humanizeEnum(s.current_mode || "ASSISTANT")}
                              </Badge>
                            </Link>
                          ))}
                        </div>
                      )
                    )}
                  </>
                ) : (
                  <p className="px-2 py-2 text-xs text-sidebar-foreground/40">
                    {t("nav.noSessions")}
                  </p>
                )}

                {/* New session button */}
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
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="shrink-0 border-t border-sidebar-border px-4 py-3">
        <Link
          href="/dashboard"
          onClick={handleNavClick}
          className="flex items-center gap-2"
        >
          <ShieldCheck className="h-4 w-4 text-sidebar-primary" />
          <span className="text-xs font-semibold text-sidebar-foreground/70">AIV</span>
        </Link>
      </div>
    </aside>
  );
}
