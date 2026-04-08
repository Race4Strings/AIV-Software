"use client";

import { useContext } from "react";
import { SidebarContext, type SidebarContextValue } from "@/components/providers/sidebar-provider";

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return ctx;
}
