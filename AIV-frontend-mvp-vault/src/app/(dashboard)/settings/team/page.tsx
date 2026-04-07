"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, UserPlus, Shield, CheckCircle2,
  Clock, Loader2, Crown, Eye, Trash2,
} from "lucide-react";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { organizationsApi, type OrgMember } from "@/lib/api/organizations";
import { authApi } from "@/lib/api";

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Crown; color: string; desc: string }> = {
  OWNER: { label: "Owner", icon: Crown, color: "text-warning", desc: "Full control over the organization and all identities" },
  ADMIN: { label: "Admin", icon: Shield, color: "text-primary", desc: "Can manage identities, deals, and team settings" },
  MEMBER: { label: "Member", icon: Users, color: "text-foreground", desc: "Can view and contribute to identities and deals" },
  VIEWER: { label: "Viewer", icon: Eye, color: "text-muted-foreground", desc: "Read-only access to identities and deals" },
};

export default function TeamPage() {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string>("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviting, setInviting] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  useEffect(() => {
    // Get org ID from authenticated user profile
    authApi.getMe()
      .then((res) => {
        const userData = res?.data || res;
        if (userData?.org_id) {
          setOrgId(userData.org_id);
          loadMembers(userData.org_id);
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  async function loadMembers(oid: string) {
    try {
      const m = await organizationsApi.getMembers(oid);
      setMembers(m);
    } catch {
      // Org may not have members endpoint working
    }
    setLoading(false);
  }

  async function handleInvite() {
    if (!inviteEmail.trim() || !orgId) return;
    setInviting(true);
    try {
      await organizationsApi.invite(orgId, inviteEmail.trim(), inviteRole);
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setShowInvite(false);
      await loadMembers(orgId);
    } catch {
      toast.error("Failed to send invitation");
    }
    setInviting(false);
  }

  if (loading) {
    return (
      <div className="max-w-3xl space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8 p-6">
      <Breadcrumb items={[{ label: "Settings", href: "/settings" }, { label: "Team" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground mt-1">Manage your team and control access to identities and deals.</p>
        </div>
        <Button size="sm" onClick={() => setShowInvite(!showInvite)}>
          <UserPlus className="h-4 w-4 mr-1.5" /> Invite Member
        </Button>
      </div>

      {/* Invite Form */}
      {showInvite && (
        <Card>
          <CardContent className="py-5">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Email Address</Label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                />
              </div>
              <div className="w-36">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Role</Label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="MEMBER">Member</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>
              <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Invite"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {ROLE_CONFIG[inviteRole]?.desc}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Members List */}
      <section className="space-y-2">
        {members.length > 0 ? (
          members.map((m) => {
            const roleConfig = ROLE_CONFIG[m.role] || ROLE_CONFIG.MEMBER;
            const RoleIcon = roleConfig.icon;
            return (
              <Card key={m.id} className="border-border/50">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{m.name || m.email || `User ${m.user_id.slice(0, 8)}`}</span>
                      {editingRole === m.user_id ? (
                        <select
                          value={m.role}
                          onChange={async (e) => {
                            try {
                              await organizationsApi.updateMemberRole(orgId, m.user_id, e.target.value);
                              toast.success("Role updated");
                              setEditingRole(null);
                              await loadMembers(orgId);
                            } catch { toast.error("Failed to update role"); }
                          }}
                          onBlur={() => setEditingRole(null)}
                          autoFocus
                          className="rounded border border-border bg-background px-2 py-0.5 text-xs"
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="MEMBER">Member</option>
                          <option value="VIEWER">Viewer</option>
                        </select>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <RoleIcon className={`h-3 w-3 mr-1 ${roleConfig.color}`} />
                          {roleConfig.label}
                        </Badge>
                      )}
                    </div>
                    {m.email && m.name && (
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    )}
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {m.accepted_at ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-success" />
                          Joined {new Date(m.accepted_at).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-warning" />
                          Invitation pending
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Member actions — hidden for OWNER */}
                  {m.role !== "OWNER" && (
                    <div className="flex items-center gap-1">
                      {confirmRemove === m.user_id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-500">Remove?</span>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs"
                            onClick={async () => {
                              try {
                                await organizationsApi.removeMember(orgId, m.user_id);
                                toast.success("Member removed");
                                setConfirmRemove(null);
                                await loadMembers(orgId);
                              } catch { toast.error("Failed to remove member"); }
                            }}
                          >
                            Yes
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setConfirmRemove(null)}>
                            No
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => setEditingRole(editingRole === m.user_id ? null : m.user_id)}
                            title="Edit role"
                          >
                            <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => setConfirmRemove(m.user_id)}
                            title="Remove member"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-semibold">No team members yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Invite team members to collaborate on identity management and deal operations. Each member gets role-based access.
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Back link */}
      <div className="pt-2">
        <Link href="/settings" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Settings
        </Link>
      </div>
    </div>
  );
}
