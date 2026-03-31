"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Moon, Sun, User, Mail, Shield, Bell, LogOut, Users, Calendar, Building2, DollarSign, Loader2, Eye, EyeOff, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authApi } from "@/lib/api";
import apiClient from "@/lib/api/client";

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
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ old: "", new: "", confirm: "" });
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

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
    try { await authApi.signout(); } catch {}
    localStorage.removeItem("user");
    router.replace("/auth/signin");
  };

  const updateNotifPref = async (key: string, value: boolean) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    // Persist to both localStorage (immediate) and backend (durable)
    localStorage.setItem("notification_prefs", JSON.stringify(updated));
    try {
      await apiClient.post("/notifications/preferences", updated);
    } catch {
      // Silent fallback — localStorage still has the prefs
    }
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
                  <Link href="/settings/team" className="font-medium text-xs text-primary hover:underline">Manage team</Link>
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

      {/* Billing */}
      <section className="space-y-4 border-t border-border pt-6">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><DollarSign className="h-5 w-5" /> Billing</h2>
          <p className="text-sm text-muted-foreground">Payment methods, invoices, and payout history.</p>
        </div>
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Manage billing</p>
                <p className="text-sm text-muted-foreground">View invoices, manage payment methods, and track payouts.</p>
              </div>
              <Link href="/settings/billing">
                <Button variant="outline" size="sm" className="gap-2">
                  Open Billing
                </Button>
              </Link>
            </div>
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

        {/* Change Password */}
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Change password</p>
                <p className="text-sm text-muted-foreground">Update your account password.</p>
              </div>
              {!showPasswordForm && (
                <Button variant="outline" size="sm" onClick={() => setShowPasswordForm(true)} className="gap-2">
                  <Lock className="h-4 w-4" /> Change
                </Button>
              )}
            </div>
            {showPasswordForm && (
              <div className="mt-4 space-y-3 max-w-sm">
                <div className="relative">
                  <Input
                    type={showOldPw ? "text" : "password"}
                    placeholder="Current password"
                    value={passwordForm.old}
                    onChange={(e) => setPasswordForm(p => ({ ...p, old: e.target.value }))}
                  />
                  <button type="button" onClick={() => setShowOldPw(!showOldPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                    {showOldPw ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showNewPw ? "text" : "password"}
                    placeholder="New password (min 8 characters)"
                    value={passwordForm.new}
                    onChange={(e) => setPasswordForm(p => ({ ...p, new: e.target.value }))}
                  />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                    {showNewPw ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
                {passwordForm.new.length > 0 && (() => {
                  const s = (passwordForm.new.length >= 8 ? 1 : 0) + (/[A-Z]/.test(passwordForm.new) ? 1 : 0) + (/[0-9]/.test(passwordForm.new) ? 1 : 0) + (/[^A-Za-z0-9]/.test(passwordForm.new) ? 1 : 0);
                  const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-emerald-500"];
                  const labels = ["", "Weak", "Fair", "Good", "Strong"];
                  return (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[1,2,3,4].map(l => <div key={l} className={`h-1 flex-1 rounded-full transition-colors ${l <= s ? colors[s-1] : "bg-muted"}`} />)}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{passwordForm.new.length < 8 ? "At least 8 characters" : labels[s]}</p>
                    </div>
                  );
                })()}
                <Input
                  type="password"
                  placeholder="Confirm new password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm(p => ({ ...p, confirm: e.target.value }))}
                />
                {passwordForm.confirm && passwordForm.new !== passwordForm.confirm && (
                  <p className="text-xs text-red-500">Passwords don&apos;t match</p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    disabled={changingPassword || passwordForm.new.length < 8 || passwordForm.new !== passwordForm.confirm || !passwordForm.old}
                    onClick={async () => {
                      setChangingPassword(true);
                      try {
                        await authApi.changePassword(passwordForm.old, passwordForm.new);
                        toast.success("Password changed successfully");
                        setPasswordForm({ old: "", new: "", confirm: "" });
                        setShowPasswordForm(false);
                      } catch (err: any) {
                        toast.error(err?.response?.data?.detail || "Failed to change password");
                      }
                      setChangingPassword(false);
                    }}
                  >
                    {changingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Update Password
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowPasswordForm(false); setPasswordForm({ old: "", new: "", confirm: "" }); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
