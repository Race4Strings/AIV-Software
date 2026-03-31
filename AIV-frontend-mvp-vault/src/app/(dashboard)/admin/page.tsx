"use client";

import { useEffect, useState } from "react";
import {
  Shield, Key, Users, UserPlus, CheckCircle2, Clock,
  Loader2, Copy, RefreshCw, Mail, Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";

interface AccessCode {
  id: string;
  code: string;
  label: string;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
  expires_at: string | null;
}

interface WaitlistEntry {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  status: string;
  granted_at: string | null;
  access_code: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [codeLabel, setCodeLabel] = useState("");
  const [codeCount, setCodeCount] = useState(5);
  const [granting, setGranting] = useState<string | null>(null);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user.role !== "OWNER") {
        router.replace("/dashboard");
        return;
      }
      setAuthorized(true);
    } catch {
      router.replace("/dashboard");
    }
  }, [router]);

  async function loadData() {
    setLoading(true);
    try {
      const [codesRes, waitlistRes] = await Promise.allSettled([
        apiClient.get("/auth/access-codes"),
        apiClient.get("/auth/waitlist"),
      ]);
      if (codesRes.status === "fulfilled") setCodes(codesRes.value.data);
      if (waitlistRes.status === "fulfilled") setWaitlist(waitlistRes.value.data);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { if (authorized) loadData(); }, [authorized]);

  async function generateCodes() {
    setGenerating(true);
    try {
      await apiClient.post("/auth/generate-codes", { count: codeCount, label: codeLabel || "Generated" });
      toast.success(`${codeCount} access codes generated`);
      setCodeLabel("");
      await loadData();
    } catch { toast.error("Failed to generate codes"); }
    setGenerating(false);
  }

  async function grantAccess(entryId: string) {
    setGranting(entryId);
    try {
      await apiClient.post("/auth/grant-access", { waitlist_id: entryId });
      toast.success("Access granted — code sent");
      await loadData();
    } catch { toast.error("Failed to grant access"); }
    setGranting(null);
  }

  async function removeFromWaitlist(entryId: string) {
    if (!window.confirm("Remove this entry from the waitlist?")) return;
    try {
      await apiClient.delete(`/auth/waitlist/${entryId}`);
      toast.success("Removed from waitlist");
      await loadData();
    } catch { toast.error("Failed to remove"); }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success("Code copied");
  }

  if (!authorized) return null;

  if (loading) {
    return (
      <div className="max-w-4xl space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const unusedCodes = codes.filter((c) => !c.is_used);
  const usedCodes = codes.filter((c) => c.is_used);
  const pendingWaitlist = waitlist.filter((w) => w.status === "pending");
  const grantedWaitlist = waitlist.filter((w) => w.status === "granted");

  return (
    <div className="max-w-4xl space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Access codes, waitlist management, and platform operations.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <div className="text-2xl font-bold">{unusedCodes.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Available Codes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <div className="text-2xl font-bold">{usedCodes.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Used Codes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <div className="text-2xl font-bold text-yellow-500">{pendingWaitlist.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Pending Applications</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <div className="text-2xl font-bold text-emerald-500">{grantedWaitlist.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Access Granted</div>
          </CardContent>
        </Card>
      </div>

      {/* Generate Access Codes */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Key className="h-5 w-5" /> Generate Access Codes</h2>
        <Card>
          <CardContent className="flex items-end gap-3 py-5">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground block mb-1.5">Label</label>
              <Input
                value={codeLabel}
                onChange={(e) => setCodeLabel(e.target.value)}
                placeholder="e.g., Investor batch, Partner event"
              />
            </div>
            <div className="w-24">
              <label className="text-xs text-muted-foreground block mb-1.5">Count</label>
              <Input
                type="number"
                min={1}
                max={50}
                value={codeCount}
                onChange={(e) => setCodeCount(parseInt(e.target.value) || 1)}
              />
            </div>
            <Button onClick={generateCodes} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Key className="h-4 w-4 mr-1" />}
              Generate
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Available Codes */}
      {unusedCodes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Available Codes ({unusedCodes.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {unusedCodes.map((c) => (
              <Card key={c.id} className="border-border/50">
                <CardContent className="flex items-center gap-3 py-3">
                  <Key className="h-4 w-4 text-primary shrink-0" />
                  <code className="font-mono text-sm flex-1">{c.code}</code>
                  <Badge variant="outline" className="text-[10px]">{c.label}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => copyCode(c.code)} className="h-7 w-7 p-0">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Waitlist */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5" /> Waitlist ({waitlist.length})</h2>

        {pendingWaitlist.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-yellow-500 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Pending ({pendingWaitlist.length})
            </h3>
            {pendingWaitlist.map((w) => (
              <Card key={w.id} className="border-yellow-500/20">
                <CardContent className="flex items-center gap-4 py-4">
                  <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{w.name || w.email}</span>
                      {w.role && <Badge variant="outline" className="text-[10px]">{w.role}</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {w.email} · Applied {new Date(w.created_at).toLocaleDateString()}
                      {w.metadata && Object.keys(w.metadata).length > 0 && (
                        <span> · {Object.entries(w.metadata).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(", ")}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => grantAccess(w.id)}
                      disabled={granting === w.id}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {granting === w.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5 mr-1" />}
                      Grant Access
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => removeFromWaitlist(w.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {grantedWaitlist.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-emerald-500 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Granted ({grantedWaitlist.length})
            </h3>
            {grantedWaitlist.map((w) => (
              <Card key={w.id} className="border-border/30">
                <CardContent className="flex items-center gap-4 py-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm truncate">{w.name || w.email}</span>
                    {w.access_code && <code className="text-xs font-mono text-muted-foreground ml-2">{w.access_code}</code>}
                  </div>
                  <span className="text-xs text-muted-foreground">{w.granted_at ? new Date(w.granted_at).toLocaleDateString() : ""}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {waitlist.length === 0 && (
          <Card className="border-border/50">
            <CardContent className="py-8 text-center">
              <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No waitlist applications yet. Share the platform to start receiving requests.</p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
