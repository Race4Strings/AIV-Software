"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Home,
  Fingerprint,
  Brain,
  Briefcase,
  ShieldCheck,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { notificationsApi, type Notification } from "@/lib/api/notifications";
import { useStoredUser } from "@/hooks/use-stored-user";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { title: "Home", href: "/dashboard", icon: Home },
  { title: "Identity", href: "/twin", icon: Fingerprint },
  { title: "Training", href: "/twin/training-area", icon: Brain },
  { title: "Deals", href: "/deals", icon: Briefcase },
  { title: "Protection", href: "/protection", icon: ShieldCheck },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/twin") return pathname === "/twin" || pathname.startsWith("/twin/certification") || pathname.startsWith("/twin/training/");
  if (href === "/twin/training-area") return pathname === "/twin/training-area";
  if (href === "/deals") return pathname.startsWith("/deals");
  if (href === "/protection") return pathname.startsWith("/protection");
  return false;
}

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useStoredUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    notificationsApi.list().then(setNotifications).catch(() => {});
    let eventSource: EventSource | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    try {
      eventSource = new EventSource("/api/backend/notifications/stream");
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "notification") setNotifications((prev) => [data.notification, ...prev]);
        } catch {}
      };
      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;
        pollInterval = setInterval(() => {
          notificationsApi.list().then(setNotifications).catch(() => {});
        }, 30000);
      };
    } catch {
      pollInterval = setInterval(() => {
        notificationsApi.list().then(setNotifications).catch(() => {});
      }, 30000);
    }
    return () => { eventSource?.close(); if (pollInterval) clearInterval(pollInterval); };
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mobileOpen]);

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead().catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/backend/auth/logout", { method: "POST", credentials: "include" });
    } catch { /* ignore */ }
    localStorage.removeItem("user");
    window.location.href = "/auth/signin";
  };

  const initials = user?.name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  const orgName = (user as Record<string, unknown>)?.org_name as string || "My Organization";

  return (
    <>
      <header className="sticky top-0 z-50 flex h-14 items-center border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
        {/* Left: Logo + Org */}
        <div className="flex items-center gap-3 mr-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" aria-hidden="true" />
            <span className="font-semibold text-sm hidden sm:inline">AIV</span>
          </Link>
          <span className="text-xs text-muted-foreground hidden md:inline truncate max-w-[140px]">
            {orgName}
          </span>
        </div>

        {/* Center: Nav Items (desktop) */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.title}
              </Link>
            );
          })}
        </nav>

        {/* Right: Notifications + User */}
        <div className="ml-auto flex items-center gap-1">
          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 relative" aria-label="Notifications">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <h4 className="font-semibold text-sm">Notifications</h4>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-xs text-primary hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              {notifications.length > 0 ? (
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((n) => (
                    <Link
                      key={n.id}
                      href={n.action_url || "#"}
                      className={`block px-4 py-3 border-b border-border/30 hover:bg-muted/50 transition-colors ${!n.read ? "bg-primary/5" : ""}`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                        <div className={!n.read ? "" : "ml-4"}>
                          <p className="text-sm font-medium">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">No notifications</p>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user?.avatar || ""} alt={user?.name || ""} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-b border-border/50 bg-background px-4 py-3 animate-slide-in-bottom">
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
