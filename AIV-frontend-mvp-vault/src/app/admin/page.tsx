"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  RefreshCw,
  LogOut,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Loader2,
  Mail,
  Send,
  Users,
  Ticket,
  Trash2,
  ChevronDown,
  ChevronUp,
  User,
  Building2,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import apiClient from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AccessCode {
  id: string;
  code: string;
  label: string | null;
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
  phone: string | null;
  referral_source: string | null;
  metadata: Record<string, string> | null;
  status: string;
  granted_code: string | null;
  created_at: string;
  granted_at: string | null;
}

type Tab = "codes" | "waitlist";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLE_LABELS: Record<string, string> = {
  creator: "Creator / Talent",
  manager: "Manager / Agent",
  brand: "Brand / Partner",
  investor: "Investor / Press",
};

const ROLE_COLORS: Record<string, string> = {
  creator: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  manager: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  brand: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  investor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function getMetadataDisplay(
  entry: WaitlistEntry
): { label: string; value: string }[] | null {
  if (!entry.metadata || Object.keys(entry.metadata).length === 0) return null;
  return Object.entries(entry.metadata).map(([k, v]) => ({
    label: k
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    value: v,
  }));
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AdminPanel() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("waitlist");
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [grantingId, setGrantingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "available" | "used">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkGranting, setBulkGranting] = useState(false);

  // ── Auth guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    const admin = localStorage.getItem("aiv-admin");
    if (!admin) {
      router.replace("/auth/admin");
      return;
    }
    try {
      const parsed = JSON.parse(admin);
      if (!parsed.authenticated) router.replace("/auth/admin");
    } catch {
      router.replace("/auth/admin");
    }
  }, [router]);

  // ── Data fetching ───────────────────────────────────────────────────────
  const fetchCodes = useCallback(async () => {
    try {
      const res = await apiClient.get("/auth/access-codes");
      setCodes(res.data || []);
    } catch {
      toast.error("Failed to load access codes");
    }
  }, []);

  const fetchWaitlist = useCallback(async () => {
    try {
      const res = await apiClient.get("/auth/waitlist");
      setWaitlist(res.data || []);
    } catch {
      toast.error("Failed to load waitlist");
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchCodes(), fetchWaitlist()]);
    setLoading(false);
  }, [fetchCodes, fetchWaitlist]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Actions ─────────────────────────────────────────────────────────────
  const generateCodes = async (count: number) => {
    setGenerating(true);
    try {
      const res = await apiClient.post("/auth/generate-codes", {
        count,
        label: "Admin Generated",
        prefix: "AIV",
      });
      toast.success(res.data?.message ?? `Generated ${count} codes`);
      await fetchCodes();
    } catch {
      toast.error("Failed to generate codes");
    } finally {
      setGenerating(false);
    }
  };

  const grantAccess = async (waitlistId: string) => {
    setGrantingId(waitlistId);
    try {
      const res = await apiClient.post("/auth/grant-access", {
        waitlist_id: waitlistId,
      });
      toast.success(res.data?.message ?? "Access granted");
      await fetchAll();
    } catch {
      toast.error("Failed to grant access");
    } finally {
      setGrantingId(null);
    }
  };

  const bulkGrant = async () => {
    if (selectedIds.size === 0) return;
    setBulkGranting(true);
    try {
      const res = await apiClient.post("/auth/grant-access-bulk", {
        waitlist_ids: Array.from(selectedIds),
      });
      toast.success(
        res.data?.message ?? `Granted access to ${selectedIds.size} entries`
      );
      setSelectedIds(new Set());
      await fetchAll();
    } catch {
      toast.error("Failed to bulk grant access");
    } finally {
      setBulkGranting(false);
    }
  };

  const removeEntry = async (waitlistId: string) => {
    setRemovingId(waitlistId);
    try {
      const res = await apiClient.delete(`/auth/waitlist/${waitlistId}`);
      toast.success(res.data?.message ?? "Entry removed");
      await fetchAll();
    } catch {
      toast.error("Failed to remove entry");
    } finally {
      setRemovingId(null);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Copied: ${code}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("aiv-admin");
    router.replace("/auth/admin");
  };

  // ── Selection helpers ───────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pendingEntries = waitlist.filter((w) => w.status === "pending");

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingEntries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingEntries.map((e) => e.id)));
    }
  };

  // ── Derived data ────────────────────────────────────────────────────────
  const filteredCodes = codes.filter((c) => {
    if (filter === "available") return !c.is_used;
    if (filter === "used") return c.is_used;
    return true;
  });

  const totalCodes = codes.length;
  const usedCodes = codes.filter((c) => c.is_used).length;
  const availableCodes = totalCodes - usedCodes;
  const pendingWaitlist = pendingEntries.length;
  const grantedWaitlist = waitlist.filter((w) => w.status === "granted").length;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">AIV Admin</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAll}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1.5" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Stats Row */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            icon={<Users className="h-5 w-5 text-blue-400" />}
            label="Total Waitlist"
            value={waitlist.length}
          />
          <StatCard
            icon={<Clock className="h-5 w-5 text-amber-400" />}
            label="Pending"
            value={pendingWaitlist}
          />
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5 text-green-400" />}
            label="Granted"
            value={grantedWaitlist}
          />
          <StatCard
            icon={<Ticket className="h-5 w-5 text-purple-400" />}
            label="Codes Available"
            value={availableCodes}
          />
        </div>

        {/* Tabs */}
        <div className="mb-6 flex w-fit gap-1 rounded-lg border border-border bg-card p-1">
          <button
            onClick={() => setTab("waitlist")}
            className={`flex cursor-pointer items-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === "waitlist"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <Mail className="mr-1.5 inline h-4 w-4" />
            Waitlist ({waitlist.length})
          </button>
          <button
            onClick={() => setTab("codes")}
            className={`flex cursor-pointer items-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === "codes"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <Ticket className="mr-1.5 inline h-4 w-4" />
            Access Codes ({totalCodes})
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : tab === "waitlist" ? (
          /* ── Waitlist Tab ─────────────────────────────────────────── */
          <Card className="overflow-hidden p-0">
            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between border-b border-primary/20 bg-primary/10 px-4 py-3">
                <span className="text-sm font-medium text-primary">
                  {selectedIds.size} selected
                </span>
                <Button size="sm" onClick={bulkGrant} disabled={bulkGranting}>
                  {bulkGranting ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-1.5 h-4 w-4" />
                  )}
                  Grant Access to {selectedIds.size} Selected
                </Button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="w-10 px-4 py-3 text-left">
                      <Checkbox
                        checked={
                          pendingEntries.length > 0 &&
                          selectedIds.size === pendingEntries.length
                        }
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all pending"
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Requested
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Code
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {waitlist.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-12 text-center text-muted-foreground"
                      >
                        No waitlist entries yet
                      </td>
                    </tr>
                  ) : (
                    waitlist.map((entry) => (
                      <WaitlistRow
                        key={entry.id}
                        entry={entry}
                        expanded={expandedId === entry.id}
                        selected={selectedIds.has(entry.id)}
                        granting={grantingId === entry.id}
                        removing={removingId === entry.id}
                        onToggleExpand={() =>
                          setExpandedId(
                            expandedId === entry.id ? null : entry.id
                          )
                        }
                        onToggleSelect={() => toggleSelect(entry.id)}
                        onGrant={() => grantAccess(entry.id)}
                        onRemove={() => removeEntry(entry.id)}
                        onCopyCode={copyCode}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          /* ── Access Codes Tab ─────────────────────────────────────── */
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => generateCodes(5)}
                disabled={generating}
                size="sm"
              >
                {generating ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-1.5 h-4 w-4" />
                )}
                Generate 5 Codes
              </Button>
              <Button
                onClick={() => generateCodes(10)}
                disabled={generating}
                variant="outline"
                size="sm"
              >
                Generate 10
              </Button>
              <div className="ml-auto flex gap-1 rounded-lg border border-border bg-card p-0.5">
                {(["all", "available", "used"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      filter === f
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {f === "all"
                      ? `All (${totalCodes})`
                      : f === "available"
                        ? `Available (${availableCodes})`
                        : `Used (${usedCodes})`}
                  </button>
                ))}
              </div>
            </div>

            <Card className="overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Code
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Label
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Used By
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Created
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCodes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-12 text-center text-muted-foreground"
                      >
                        {filter === "all"
                          ? "No access codes yet"
                          : `No ${filter} codes`}
                      </td>
                    </tr>
                  ) : (
                    filteredCodes.map((code) => (
                      <tr
                        key={code.id}
                        className="border-b border-border last:border-0 transition-colors hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">
                          <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                            {code.code}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {code.label || "\u2014"}
                        </td>
                        <td className="px-4 py-3">
                          {code.is_used ? (
                            <Badge
                              variant="secondary"
                              className="gap-1 text-muted-foreground"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Used
                            </Badge>
                          ) : (
                            <Badge className="gap-1 border-green-500/30 bg-green-500/15 text-green-400">
                              <Clock className="h-3 w-3" /> Available
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {code.used_by || "\u2014"}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDate(code.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyCode(code.code)}
                            title="Copy code"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card className="flex flex-row items-center gap-3 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </Card>
  );
}

function WaitlistRow({
  entry,
  expanded,
  selected,
  granting,
  removing,
  onToggleExpand,
  onToggleSelect,
  onGrant,
  onRemove,
  onCopyCode,
}: {
  entry: WaitlistEntry;
  expanded: boolean;
  selected: boolean;
  granting: boolean;
  removing: boolean;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onGrant: () => void;
  onRemove: () => void;
  onCopyCode: (code: string) => void;
}) {
  const metadata = getMetadataDisplay(entry);
  const isPending = entry.status === "pending";

  return (
    <>
      <tr
        className={`border-b border-border last:border-0 transition-colors ${
          selected ? "bg-primary/5" : "hover:bg-muted/30"
        }`}
      >
        {/* Checkbox */}
        <td className="px-4 py-3">
          {isPending ? (
            <Checkbox
              checked={selected}
              onCheckedChange={onToggleSelect}
              aria-label={`Select ${entry.name || entry.email}`}
            />
          ) : (
            <div className="w-4" />
          )}
        </td>

        {/* Name + expand toggle */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleExpand}
              className="cursor-pointer p-0.5 text-muted-foreground hover:text-foreground"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            <span className="font-medium">{entry.name || "\u2014"}</span>
          </div>
        </td>

        {/* Role badge */}
        <td className="px-4 py-3">
          {entry.role ? (
            <Badge
              variant="outline"
              className={
                ROLE_COLORS[entry.role] ||
                "bg-muted text-muted-foreground border-border"
              }
            >
              {ROLE_LABELS[entry.role] || entry.role}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">{"\u2014"}</span>
          )}
        </td>

        {/* Email */}
        <td className="px-4 py-3 text-xs text-muted-foreground">
          {entry.email}
        </td>

        {/* Status */}
        <td className="px-4 py-3">
          {entry.status === "granted" ? (
            <Badge className="gap-1 border-green-500/30 bg-green-500/15 text-green-400">
              <CheckCircle2 className="h-3 w-3" /> Granted
            </Badge>
          ) : entry.status === "removed" ? (
            <Badge
              variant="destructive"
              className="gap-1 bg-destructive/15 text-destructive"
            >
              <XCircle className="h-3 w-3" /> Removed
            </Badge>
          ) : (
            <Badge className="gap-1 border-amber-500/30 bg-amber-500/15 text-amber-400">
              <Clock className="h-3 w-3" /> Pending
            </Badge>
          )}
        </td>

        {/* Date */}
        <td className="px-4 py-3 text-xs text-muted-foreground">
          {formatDate(entry.created_at)}
        </td>

        {/* Granted code */}
        <td className="px-4 py-3 text-xs">
          {entry.granted_code ? (
            <button
              onClick={() => onCopyCode(entry.granted_code!)}
              className="cursor-pointer rounded bg-muted px-2 py-0.5 font-mono text-xs transition-colors hover:bg-accent"
            >
              {entry.granted_code}
            </button>
          ) : (
            <span className="text-muted-foreground">{"\u2014"}</span>
          )}
        </td>

        {/* Actions */}
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            {isPending && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onGrant}
                disabled={granting}
                title="Grant access"
              >
                {granting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 text-primary" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              disabled={removing}
              title="Remove"
            >
              {removing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 text-destructive" />
              )}
            </Button>
          </div>
        </td>
      </tr>

      {/* Expanded detail row */}
      {expanded && (
        <tr className="bg-muted/30">
          <td colSpan={8} className="px-4 py-4">
            <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-3">
              {entry.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{entry.phone}</span>
                </div>
              )}
              {entry.referral_source && (
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Referral:</span>
                  <span>{entry.referral_source}</span>
                </div>
              )}
              {entry.granted_at && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                  <span className="text-muted-foreground">Granted:</span>
                  <span>{formatDate(entry.granted_at)}</span>
                </div>
              )}
              {metadata && metadata.length > 0 && (
                <div className="mt-1 sm:col-span-3">
                  <div className="mb-2 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium text-muted-foreground">
                      Role Details
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {metadata.map((m) => (
                      <div
                        key={m.label}
                        className="rounded-lg border border-border bg-card px-3 py-2"
                      >
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {m.label}
                        </div>
                        <div className="mt-0.5">{m.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!entry.phone && !entry.referral_source && !metadata && (
                <div className="italic text-muted-foreground">
                  No additional details
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
