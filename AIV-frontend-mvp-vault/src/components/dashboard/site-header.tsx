"use client";

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

export function SiteHeader({
  user,
}: {
  user: { name: string; email: string; avatar: string };
}) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border/50 px-4 transition-[width,height] ease-linear">
      <SidebarTrigger className="h-7 w-7 md:hidden" />
      <Separator orientation="vertical" className="h-4 md:hidden" />
      <div className="ml-auto flex items-center gap-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 relative">
              <Bell className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="p-4 border-b border-border/50">
              <h4 className="font-semibold text-sm">Notifications</h4>
            </div>
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">Coming Soon</p>
              <p className="text-xs mt-1 text-muted-foreground/70">
                Notifications will keep you updated on certification status, deal activity, and identity alerts.
              </p>
            </div>
          </PopoverContent>
        </Popover>
        <NavUser user={user} />
      </div>
    </header>
  );
}
