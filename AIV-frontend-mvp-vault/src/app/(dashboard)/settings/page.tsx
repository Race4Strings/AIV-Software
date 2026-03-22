"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun, User, Mail, Shield, Bell, LogOut } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed.data || parsed);
      }
    } catch { /* ignore */ }
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/backend/auth/logout", { method: "POST", credentials: "include" });
    } catch { /* ignore */ }
    localStorage.removeItem("user");
    router.replace("/auth/signin");
  };

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
  ] as const;

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your preferences.</p>
      </div>

      {/* Account Info */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Account</h2>
          <p className="text-sm text-muted-foreground">Your account details.</p>
        </div>
        <Card className="border-border/50">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{user?.name || "—"}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {user?.email || "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Appearance */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Appearance</h2>
          <p className="text-sm text-muted-foreground">Choose how AIV looks for you.</p>
        </div>
        <div className="flex gap-3">
          {mounted &&
            themeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                  theme === opt.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/30"
                }`}
              >
                <opt.icon className="h-4 w-4" />
                {opt.label}
              </button>
            ))}
        </div>
      </section>

      {/* Security */}
      <section className="space-y-4 border-t border-border pt-6">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" /> Security
          </h2>
          <p className="text-sm text-muted-foreground">Manage your session and security settings.</p>
        </div>
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sign out</p>
                <p className="text-sm text-muted-foreground">End your current session on this device.</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" /> Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Notifications */}
      <section className="space-y-4 border-t border-border pt-6">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5" /> Notifications
          </h2>
          <p className="text-sm text-muted-foreground">Configure how you receive alerts.</p>
        </div>
        <p className="text-sm text-muted-foreground italic">Coming soon.</p>
      </section>
    </div>
  );
}
