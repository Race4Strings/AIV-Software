"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Moon, Sun, User, Mail, Shield, Bell, LogOut, Users, Calendar, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [notifPrefs, setNotifPrefs] = useState({
    deal_alerts: true,
    pul_reminders: true,
    health_alerts: true,
    milestone_reminders: true,
    system_updates: false,
  });
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed.data || parsed);
      }
      // Load notification prefs from localStorage
      const prefs = localStorage.getItem("notification_prefs");
      if (prefs) setNotifPrefs(JSON.parse(prefs));
    } catch {}
  }, []);

  const handleLogout = async () => {
    try { await fetch("/api/backend/auth/signout", { credentials: "include" }); } catch {}
    localStorage.removeItem("user");
    router.replace("/auth/signin");
  };

  const updateNotifPref = (key: string, value: boolean) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    localStorage.setItem("notification_prefs", JSON.stringify(updated));
  };

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
  ] as const;

  return (
    <div className="max-w-2xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account, preferences, and notifications.</p>
      </div>

      {/* Account Info */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Account</h2>
          <p className="text-sm text-muted-foreground">Your account and organization details.</p>
        </div>
        <Card className="border-border/50">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-lg">{(user?.name as string) || "—"}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {(user?.email as string) || "—"}
                </p>
              </div>
              <Badge variant="outline">{(user?.role as string) || "TALENT"}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border/30">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Organization</p>
                  <p className="font-medium text-xs">{(user?.org_name as string) || (user?.organization as Record<string, string>)?.name || "My Organization"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Member since</p>
                  <p className="font-medium text-xs">{user?.created_at ? new Date(user.created_at as string).toLocaleDateString() : "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Team</p>
                  <Link href="#" className="font-medium text-xs text-primary hover:underline">Manage team</Link>
                </div>
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
          {mounted && themeOptions.map((opt) => (
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

      {/* Notifications */}
      <section className="space-y-4 border-t border-border pt-6">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Bell className="h-5 w-5" /> Notifications</h2>
          <p className="text-sm text-muted-foreground">Control which alerts you receive.</p>
        </div>
        <Card className="border-border/50">
          <CardContent className="p-5 space-y-4">
            {[
              { key: "deal_alerts", label: "Deal Alerts", desc: "New inquiries, status changes, contract updates" },
              { key: "pul_reminders", label: "PUL Reminders", desc: "Permitted Use Lifecycle submission deadlines" },
              { key: "health_alerts", label: "Health Alerts", desc: "Twin health changes requiring attention" },
              { key: "milestone_reminders", label: "Milestone Reminders", desc: "Upcoming deal milestones and deadlines" },
              { key: "system_updates", label: "System Updates", desc: "Platform maintenance and feature announcements" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">{item.label}</Label>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={(notifPrefs as Record<string, boolean>)[item.key]}
                  onCheckedChange={(v) => updateNotifPref(item.key, v)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Security */}
      <section className="space-y-4 border-t border-border pt-6">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Shield className="h-5 w-5" /> Security</h2>
          <p className="text-sm text-muted-foreground">Session and access management.</p>
        </div>
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sign out</p>
                <p className="text-sm text-muted-foreground">End your current session on this device.</p>
              </div>
              <Button variant="destructive" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" /> Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
