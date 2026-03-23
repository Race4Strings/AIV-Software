"use client";

import { useEffect, useState } from "react";
import { NavUser } from "./nav-user";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { notificationsApi, type Notification } from "@/lib/api/notifications";

export function SiteHeader({
  user,
}: {
  user: { name: string; email: string; avatar: string };
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    notificationsApi.list().then(setNotifications).catch(() => {});
  }, []);

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead().catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border/50 px-4 transition-[width,height] ease-linear">
      <SidebarTrigger className="h-7 w-7 md:hidden" />
      <Separator orientation="vertical" className="h-4 md:hidden" />
      <div className="ml-auto flex items-center gap-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 relative" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <h4 className="font-semibold text-sm">Notifications</h4>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-primary hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            {notifications.length > 0 ? (
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((n) => (
                  <a
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
                  </a>
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
        <NavUser user={user} />
      </div>
    </header>
  );
}
