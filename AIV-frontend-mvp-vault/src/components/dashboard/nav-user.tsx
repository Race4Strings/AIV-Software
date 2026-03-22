"use client";

import * as React from "react";
import { LogOut, User } from "lucide-react";

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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { EntityIndicator } from "@/components/ui/entity-indicator";

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}) {
  const [userData, setUserData] = React.useState(user);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const u = parsed.data || parsed;
        if (!u.avatar) u.avatar = "";
        setUserData(u);
      } catch { /* ignore */ }
    }
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/backend/auth/logout", { method: "POST", credentials: "include" });
    } catch { /* ignore */ }
    localStorage.removeItem("user");
    window.location.href = "/auth/signin";
  };

  const avatarSrc = userData.avatar;
  const initials = userData.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  return (
    <SidebarMenu>
      <SidebarMenuItem className="p-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground w-8 h-8 p-0 aspect-square justify-center"
            >
              <Avatar className="h-8 w-8 rounded-full">
                <AvatarImage src={avatarSrc} alt={userData.name} className="object-cover" />
                <AvatarFallback className="rounded-full">{initials}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 z-10">
                <EntityIndicator type="human" size="sm" isAvailable={true} />
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side="bottom"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <div className="relative">
                  <Avatar className="h-8 w-8 rounded-full">
                    <AvatarImage src={avatarSrc} alt={userData.name} />
                    <AvatarFallback className="rounded-full">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 z-10">
                    <EntityIndicator type="human" size="sm" isAvailable={true} />
                  </div>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {mounted ? userData.name : ""}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {mounted ? userData.email : ""}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => window.location.href = "/settings"}>
                <User className="mr-2 h-4 w-4" />
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
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
