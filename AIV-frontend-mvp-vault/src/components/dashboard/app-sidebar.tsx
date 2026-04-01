"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Shield, Fingerprint, BadgeCheck, Briefcase, Plug,
  PanelLeft, Settings,
} from "lucide-react";

import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarRail, SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarGroup, SidebarGroupContent, useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { title: "Home", href: "/dashboard", icon: Shield },
  { title: "Identity", href: "/twin", icon: Fingerprint },
  { title: "Deals", href: "/deals", icon: Briefcase },
  { title: "Certification", href: "/twin/certification", icon: BadgeCheck },
  { title: "Integrations", href: "/twin/integrations", icon: Plug },
];

const secondaryItems = [
  { title: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [orgName, setOrgName] = React.useState("Loading...");

  React.useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      setOrgName(user.org_name || user.organization?.name || "My Organization");
    } catch { setOrgName("My Organization"); }
  }, []);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (pathname === href) return true;
    if (!pathname.startsWith(href + "/")) return false;
    const moreSpecific = navItems.some(
      (item) => item.href !== href && item.href.startsWith(href + "/") && (pathname === item.href || pathname.startsWith(item.href + "/"))
    );
    return !moreSpecific;
  };

  return (
    <Sidebar collapsible="icon" {...props} className="border-r border-sidebar-border overflow-hidden">
      <SidebarHeader className="p-0">
        <div className="flex h-12 items-center border-b border-sidebar-border/50 px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <button
            onClick={isCollapsed ? toggleSidebar : undefined}
            className={`group/logo relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${isCollapsed ? "cursor-pointer hover:bg-sidebar-accent" : "cursor-default"}`}
            aria-label={isCollapsed ? "Expand sidebar" : "AIV"}
          >
            {isCollapsed ? (
              <>
                <Image src="/aiv-icon.svg" alt="AIV" width={24} height={24} className="size-6 group-hover/logo:opacity-0 transition-opacity" />
                <PanelLeft className="size-5 text-sidebar-foreground/70 absolute opacity-0 group-hover/logo:opacity-100 transition-opacity" />
              </>
            ) : (
              <Link href="/dashboard">
                <Image src="/aiv.svg" alt="AIV" width={46} height={26} className="h-6 w-auto object-contain" />
              </Link>
            )}
          </button>
          {!isCollapsed && (
            <button
              onClick={toggleSidebar}
              className="ml-auto h-8 w-8 flex items-center justify-center rounded-md hover:bg-sidebar-accent transition-colors"
              aria-label="Collapse sidebar"
            >
              <PanelLeft className="size-4" />
            </button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-x-hidden overflow-y-auto">
        {/* Organization Name */}
        {!isCollapsed && (
          <div className="px-4 pt-3 pb-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Organization</p>
            <p className="text-sm font-medium truncate">{orgName}</p>
          </div>
        )}

        {/* Primary Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.title}>
                    <Link href={item.href}>
                      <item.icon className="size-4 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="flex-1" />

        <Separator className="mx-3 my-1" />

        {/* Secondary Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.title}>
                    <Link href={item.href}>
                      <item.icon className="size-4 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter />
      <SidebarRail />
    </Sidebar>
  );
}
