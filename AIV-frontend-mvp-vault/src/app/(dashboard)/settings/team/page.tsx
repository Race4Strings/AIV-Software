"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, UserPlus, Shield, Mail, CheckCircle2,
  Clock, Loader2, Crown, Eye,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { organizationsApi, type OrgMember } from "@/lib/api/organizations";

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Crown; color: string; desc: string }> = {
  OWNER: { label: "Owner", icon: Crown, color: "text-amber-500", desc: "Full control over the organization and all identities" },
  ADMIN: { label: "Admin", icon: Shield, color: "text-blue-500", desc: "Can manage identities, deals, and team settings" },
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

  useEffect(() => {
    // Get org ID from user data
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const userData = user.data || user;
      // The org ID would come from the user's organization membership
      // For now, fetch from the API using the user's first org
      if (userData.org_id) {
        setOrgId(userData.org_id);
        loadMembers(userData.org_id);
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
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
                      <Badge variant="outline" className="text-[10px]">
                        <RoleIcon className={`h-3 w-3 mr-1 ${roleConfig.color}`} />
                        {roleConfig.label}
                      </Badge>
                    </div>
                    {m.email && m.name && (
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    )}
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {m.accepted_at ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          Joined {new Date(m.accepted_at).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-yellow-500" />
                          Invitation pending
                        </span>
                      )}
                    </div>
                  </div>
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
