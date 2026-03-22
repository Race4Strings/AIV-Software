"use client"

import { type LucideIcon } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
  currentView,
  setCurrentView
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    id: string
  }[]
  currentView: string
  setCurrentView: (view: string) => void
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title} className={currentView === item.id ? "bg-sidebar-accent text-sidebar-accent-foreground rounded-md" : ""}>
              <SidebarMenuButton
                tooltip={item.title}
                onClick={() => setCurrentView(item.id)}
                isActive={currentView === item.id}
              >
                {item.icon && <item.icon />}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
