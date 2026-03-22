"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { User, Pencil, Save, X, Loader2, ExternalLink } from "lucide-react";
import { updateTwin } from "@/lib/api/twins";
import { toast } from "sonner";
import type { Twin } from "@/lib/api/twins";

interface Props {
  twin: Twin;
  onUpdate?: () => Promise<void>;
}

const SOCIAL_URLS: Record<string, string> = {
  instagram: "https://instagram.com/",
  twitter: "https://twitter.com/",
  x: "https://x.com/",
  tiktok: "https://tiktok.com/@",
  youtube: "https://youtube.com/@",
  spotify: "https://open.spotify.com/artist/",
  facebook: "https://facebook.com/",
  linkedin: "https://linkedin.com/in/",
  twitch: "https://twitch.tv/",
  soundcloud: "https://soundcloud.com/",
  website: "",
};

const SOCIAL_COLORS: Record<string, string> = {
  instagram: "bg-gradient-to-r from-purple-500 to-pink-500",
  twitter: "bg-sky-500",
  x: "bg-neutral-800 dark:bg-neutral-200 dark:text-neutral-900",
  tiktok: "bg-neutral-900 dark:bg-neutral-200 dark:text-neutral-900",
  youtube: "bg-red-600",
  spotify: "bg-green-500",
  facebook: "bg-blue-600",
  linkedin: "bg-blue-700",
  twitch: "bg-purple-600",
  soundcloud: "bg-orange-500",
};

function getSocialUrl(platform: string, handle: string): string | null {
  const key = platform.toLowerCase().replace(/[_\s]/g, "");
  const base = SOCIAL_URLS[key];
  if (base === undefined) return null;
  if (!base) return handle.startsWith("http") ? handle : null;
  const cleanHandle = handle.replace(/^@/, "").replace(/^https?:\/\/[^/]+\//, "");
  return `${base}${cleanHandle}`;
}

function getSocialColor(platform: string): string {
  const key = platform.toLowerCase().replace(/[_\s]/g, "");
  return SOCIAL_COLORS[key] || "bg-muted-foreground";
}

export function TwinTabIdentity({ twin, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: twin.name || "",
    public_name: twin.public_name || "",
    category: twin.category || "",
    bio: twin.bio || "",
  });

  const alcm = twin.alcm_data || {};
  const social = (alcm.social_media as Record<string, string>) || {};
  const hasSocial = Object.values(social).some(Boolean);

  // Get user email from localStorage for display
  let userEmail = "";
  try {
    const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    if (stored) {
      const parsed = JSON.parse(stored);
      const u = parsed.data || parsed;
      userEmail = u.email || "";
    }
  } catch { /* ignore */ }

  const startEdit = () => {
    setForm({
      name: twin.name || "",
      public_name: twin.public_name || "",
      category: twin.category || "",
      bio: twin.bio || "",
    });
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const handleSave = async () => {
    setSaving(true);
    const result = await updateTwin(twin.id, {
      name: form.name,
      public_name: form.public_name || undefined,
      category: form.category || undefined,
      bio: form.bio || undefined,
    });
    setSaving(false);
    if (result) {
      toast.success("Identity updated");
      setEditing(false);
      onUpdate?.();
    } else {
      toast.error("Failed to update identity");
    }
  };

  if (!twin.bio && !twin.category && !hasSocial && !editing) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
          <User className="size-6 text-primary" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Complete your identity profile</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Add your public name, category, and bio to help your digital twin represent you accurately.
        </p>
        <Button className="mt-6" onClick={startEdit}>
          <Pencil className="mr-2 h-4 w-4" /> Edit Identity
        </Button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Editing Identity</h3>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={saving}>
              <X className="mr-1 h-3.5 w-3.5" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}
              Save
            </Button>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Full Name</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Public Name</label>
            <Input value={form.public_name} onChange={(e) => setForm({ ...form, public_name: e.target.value })} placeholder="Stage name or alias" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Category</label>
            <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Actor, Musician, Influencer" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Bio</label>
          <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={startEdit} className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      </div>

      {/* Identity cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <p className="mb-1 text-xs text-muted-foreground">Full Name</p>
            <p className="font-medium">{twin.name}</p>
          </CardContent>
        </Card>
        {twin.public_name && (
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <p className="mb-1 text-xs text-muted-foreground">Public Name</p>
              <p className="font-medium">{twin.public_name}</p>
            </CardContent>
          </Card>
        )}
        {twin.category && (
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <p className="mb-1 text-xs text-muted-foreground">Category</p>
              <p className="font-medium capitalize">{twin.category}</p>
            </CardContent>
          </Card>
        )}
        {userEmail && (
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <p className="mb-1 text-xs text-muted-foreground">Email</p>
              <p className="font-medium">{userEmail}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bio */}
      {twin.bio && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <p className="mb-1 text-xs text-muted-foreground">Bio</p>
            <p className="text-sm leading-relaxed">{twin.bio}</p>
          </CardContent>
        </Card>
      )}

      {/* Social Media — pills with hyperlinks */}
      {hasSocial && (
        <div>
          <h3 className="mb-3 text-sm font-medium">Social Media</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(social).filter(([, v]) => v).map(([key, value]) => {
              const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
              const url = getSocialUrl(key, value as string);
              const colorClass = getSocialColor(key);

              return url ? (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-80 ${colorClass}`}
                >
                  {label}
                  <ExternalLink className="size-3" />
                </a>
              ) : (
                <span
                  key={key}
                  className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-foreground"
                >
                  {label}: {typeof value === "string" && value.length > 40 ? value.slice(0, 40) + "…" : value}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
