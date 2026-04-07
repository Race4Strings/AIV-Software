"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Pencil, Save, X } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { updateTwin } from "@/lib/api/twins";
import { toast } from "sonner";
import type { TwinData } from "@/types/twin";

interface TwinTabIdentityProps {
  twin: TwinData;
  displayName: string;
  categories: string[];
  onTwinUpdate: (updates: Partial<TwinData>) => void;
}

export function TwinTabIdentity({ twin, displayName, categories, onTwinUpdate }: TwinTabIdentityProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const startEdit = () => {
    setDraft({
      display_name: displayName,
      public_name: twin.public_name || "",
      bio: twin.bio || "",
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTwin(twin.id, draft);
      onTwinUpdate(draft);
      setEditing(false);
      toast.success("Identity updated");
    } catch {
      toast.error("Failed to update");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        {editing ? (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" disabled={saving}>
                  <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Save identity changes?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will update your public identity profile. Changes take effect immediately across all active deals and licensing outputs.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSave}>Save changes</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={startEdit}>
            <Pencil className="h-4 w-4 mr-1" /> Edit
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Display Name</CardTitle></CardHeader>
          <CardContent>
            {editing ? (
              <Input value={draft.display_name || ""} onChange={(e) => setDraft({ ...draft, display_name: e.target.value })} />
            ) : (
              <p className="text-lg font-medium">{displayName}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Public Name</CardTitle></CardHeader>
          <CardContent>
            {editing ? (
              <Input value={draft.public_name || ""} onChange={(e) => setDraft({ ...draft, public_name: e.target.value })} placeholder="How the public knows you" />
            ) : (
              <p className="text-lg font-medium">{twin.public_name || "\u2014"}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Bio</CardTitle></CardHeader>
        <CardContent>
          {editing ? (
            <Textarea value={draft.bio || ""} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} rows={3} placeholder="A brief description of who you are and what you're known for" />
          ) : (
            <p className="text-sm text-muted-foreground">{twin.bio || <span className="italic">No bio added yet. Click Edit to add one.</span>}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{categories.length > 1 ? "Categories" : "Category"}</CardTitle></CardHeader>
          <CardContent><div className="flex flex-wrap gap-1">{categories.map((cat) => <Badge key={cat}>{cat}</Badge>)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Clone Type</CardTitle></CardHeader>
          <CardContent><Badge variant="outline">{twin.clone_type || "PUBLIC_FIGURE"}</Badge></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">ALCM Engine</CardTitle></CardHeader>
          <CardContent>
            {twin.alcm_twin_id ? (
              <Badge className="bg-success/10 text-success">Connected</Badge>
            ) : (
              <Badge variant="outline">Not linked</Badge>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
