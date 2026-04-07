"use client";

import { useState } from "react";
import { Plus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { licensingApi, type Deal } from "@/lib/api/licensing";

interface DealMilestonesProps {
  deal: Deal;
  dealId: string;
  onDealUpdate: (deal: Deal) => void;
}

export function DealMilestones({ deal, dealId, onDealUpdate }: DealMilestonesProps) {
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ title: "", due_date: "" });

  async function addMilestone() {
    if (!newMilestone.title.trim()) return;
    try {
      await licensingApi.addMilestone(dealId, newMilestone.title, newMilestone.due_date || undefined);
      const updated = await licensingApi.getDeal(dealId);
      onDealUpdate(updated);
      setNewMilestone({ title: "", due_date: "" });
      setShowAddMilestone(false);
      toast.success("Milestone added");
    } catch { toast.error("Failed to add milestone"); }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setShowAddMilestone(!showAddMilestone)}>
          <Plus className="h-4 w-4 mr-1" /> Add Milestone
        </Button>
      </div>
      {showAddMilestone && (
        <Card>
          <CardContent className="flex items-end gap-3 py-4">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Title</label>
              <Input value={newMilestone.title} onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })} placeholder="Campaign launch" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Due Date</label>
              <Input type="date" value={newMilestone.due_date} onChange={(e) => setNewMilestone({ ...newMilestone, due_date: e.target.value })} />
            </div>
            <Button size="sm" onClick={addMilestone} disabled={!newMilestone.title.trim()}>Add</Button>
          </CardContent>
        </Card>
      )}
      {deal.milestones?.length ? (
        <div className="space-y-2">
          {deal.milestones.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await licensingApi.updateMilestone?.(dealId, m.id, { completed: !m.completed_at });
                      const refreshed = await licensingApi.getDeal(dealId);
                      onDealUpdate(refreshed);
                      toast.success(m.completed_at ? "Milestone reopened" : "Milestone completed");
                    } catch {
                      toast.error("Failed to update milestone");
                    }
                  }}
                  className="shrink-0"
                >
                  {m.completed_at ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/40 hover:border-success transition-colors" />
                  )}
                </button>
                <div className="flex-1">
                  <span className={`font-medium ${m.completed_at ? "line-through text-muted-foreground" : ""}`}>{m.title}</span>
                  {m.description && <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>}
                </div>
                <span className="text-xs text-muted-foreground">
                  {m.completed_at
                    ? <span className="text-success">Completed {new Date(m.completed_at).toLocaleDateString()}</span>
                    : m.due_date ? `Due ${new Date(m.due_date).toLocaleDateString()}` : null}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !showAddMilestone && <p className="text-sm text-muted-foreground py-8 text-center">No milestones yet.</p>}
    </div>
  );
}
