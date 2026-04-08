"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { TopHeader } from "@/components/dashboard/top-header";
import { SidebarProvider } from "@/components/providers/sidebar-provider";
import { useSidebar } from "@/hooks/use-sidebar";
import { useStoredUser } from "@/hooks/use-stored-user";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <AppSidebar className="hidden md:flex" />

      {/* Mobile sidebar sheet — always expanded */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0 bg-sidebar border-sidebar-border">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <AppSidebar
            className="relative w-full"
            onNavigate={() => setMobileOpen(false)}
            forceExpanded
          />
        </SheetContent>
      </Sheet>

      {/* Content area — margin adapts to sidebar width */}
      <div className={`flex flex-1 flex-col transition-[margin] duration-200 ${collapsed ? "md:ml-12" : "md:ml-60"}`}>
        <TopHeader onMobileMenuToggle={() => setMobileOpen(true)} />
        <main id="main-content" className="flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading } = useStoredUser();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/auth/signin");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <DashboardShell>{children}</DashboardShell>
    </SidebarProvider>
  );
}
