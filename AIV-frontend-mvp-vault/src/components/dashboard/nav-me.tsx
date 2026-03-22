"use client";

import * as React from "react";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { GraduationCap, User } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface NavMeProps {
  user?: { avatar?: string } | null;
  active?: boolean;
  onClick: () => void;
  cloneAvatar?: string;
  onTrainClick?: () => void;
}

export function NavMe({
  onClick,
  onTrainClick,
}: NavMeProps) {

  return (
    <div className="flex flex-col gap-1 w-full items-center">
      <SidebarMenuButton
        variant="default"
        className="w-full justify-start gap-2 px-2 group-data-[collapsible=icon]:!w-8 group-data-[collapsible=icon]:!p-2 group-data-[collapsible=icon]:justify-center group/me-item"
        onClick={onClick}
      >
        <User className="size-4" />
        <span className="font-medium group-data-[collapsible=icon]:hidden flex-1 text-left">
          Profile
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="ml-auto p-1 rounded-md hover:bg-sidebar-accent cursor-pointer group/icon group-data-[collapsible=icon]:hidden"
                onClick={(e) => {
                  e.stopPropagation();
                  onTrainClick?.();
                }}
              >
                <GraduationCap className="size-4 opacity-0 transition-opacity group-hover/me-item:opacity-100 group-hover/icon:text-[#2563EB]" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Train</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </SidebarMenuButton>

      {/* Train button for collapsed state */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarMenuButton
              variant="default"
              className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:!w-8 group-data-[collapsible=icon]:!p-2 justify-center text-muted-foreground hover:text-[#2563EB]"
              onClick={(e) => {
                e.stopPropagation();
                onTrainClick?.();
              }}
            >
              <GraduationCap className="size-4" />
            </SidebarMenuButton>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Train</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
