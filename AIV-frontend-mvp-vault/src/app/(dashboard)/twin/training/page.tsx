"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchTwins, Twin } from "@/lib/api/twins";
import { trainingApi, TrainingSubmission } from "@/lib/api/training";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Fingerprint, CheckCircle, XCircle, Clock } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TrainingPage() {
  const [twin, setTwin] = useState<Twin | null>(null);
  const [submissions, setSubmissions] = useState<TrainingSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [submittingData, setSubmittingData] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    category: "commercial",
    change_description: "",
    target_fields: "",
    content: "",
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twin || !formData.change_description.trim() || !formData.content.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSubmittingData(true);
    try {
      let parsedContent = {};
      try {
        parsedContent = JSON.parse(formData.content);
      } catch {
        parsedContent = { raw_data: formData.content };
      }

      const targetFieldsArray = formData.target_fields.split(",").map(f => f.trim()).filter(Boolean);

      await trainingApi.createSubmission(twin.id, {
        category: formData.category,
        change_description: formData.change_description,
        target_fields: targetFieldsArray,
        content: parsedContent
      });

      toast.success("Submission created successfully");
      setShowSuccess(true);
      await loadData();
      
      setTimeout(() => {
        setOpenDialog(false);
        setFormData({ category: "commercial", change_description: "", target_fields: "", content: "" });
        setShowSuccess(false);
      }, 1500);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || "Failed to create submission");
    } finally {
      setSubmittingData(false);
    }
  };

  const loadData = useCallback(async () => {
    try {
      const twinsList = await fetchTwins();
      const activeTwin = twinsList.find((tw) => tw.bio || tw.category) || twinsList[0];

      if (activeTwin) {
        setTwin(activeTwin);
        const subs = await trainingApi.getSubmissions(activeTwin.id);
        setSubmissions(subs);
      }
    } catch (err) {
      toast.error("Failed to load training data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [confirmAction, setConfirmAction] = useState<{ id: string; type: "approve" | "reject" } | null>(null);

  const handleApprove = async (subId: string) => {
    if (!twin) return;
    setConfirmAction(null);
    setProcessingId(subId);
    try {
      await trainingApi.approveSubmission(twin.id, subId);
      toast.success("Training data approved and applied to ALCM");
      await loadData();
    } catch (err) {
      toast.error("Failed to approve submission");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (subId: string) => {
    if (!twin) return;
    setConfirmAction(null);
    setProcessingId(subId);
    try {
      await trainingApi.rejectSubmission(twin.id, subId);
      toast.success("Training data rejected");
      await loadData();
    } catch (err) {
      toast.error("Failed to reject submission");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!twin) {
    return (
      <EmptyState
        icon={Fingerprint}
        title="No digital twin yet"
        description="Complete onboarding to create your digital twin before managing training."
        ctaLabel="Start Onboarding"
        ctaHref="/onboard"
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Training Portal</h1>
          <p className="text-sm text-muted-foreground">
            Review and approve AI-generated or requested refinements to your digital twin&apos;s ALCM.
          </p>
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button>New Submission</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Suggest New Training Data</DialogTitle>
              <DialogDescription>
                Submit requested changes or additional data to refine your twin&apos;s ALCM.
              </DialogDescription>
            </DialogHeader>
            {showSuccess ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-in fade-in zoom-in duration-300">
                <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground">Submission Received</h3>
                  <p className="text-sm text-muted-foreground mt-1">Your training data has been queued for review.</p>
                </div>
              </div>
            ) : (
            <form onSubmit={handleCreateSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="identity">Identity</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="governance">Governance</SelectItem>
                    <SelectItem value="knowledge">Knowledge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Change Description <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.change_description}
                  onChange={(e) => setFormData({ ...formData, change_description: e.target.value })}
                  placeholder="e.g., Update standard hourly rate to $200"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Target Fields (Comma-separated)</Label>
                <Input
                  value={formData.target_fields}
                  onChange={(e) => setFormData({ ...formData, target_fields: e.target.value })}
                  placeholder="e.g., base_rate, terms"
                />
              </div>
              <div className="space-y-2">
                <Label>Content (JSON or Text) <span className="text-red-500">*</span></Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Paste the new data or JSON payload to apply"
                  rows={4}
                  required
                />
              </div>
              <DialogFooter className="pt-2">
                <Button type="submit" disabled={submittingData}>
                  {submittingData ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Submit changes
                </Button>
              </DialogFooter>
            </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {submissions.length === 0 ? (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle className="size-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Your ALCM is up to date</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              There are no pending training submissions. When AIV suggests refinements or new data is captured, they will appear here for your review.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {submissions.map((sub) => (
            <Card key={sub.id} className={`overflow-hidden transition-all ${sub.status === "approved" ? "border-emerald-500/20" : sub.status === "rejected" ? "border-destructive/20 opacity-75" : "border-border/50"}`}>
              <CardHeader className={`${sub.status === "approved" ? "bg-emerald-500/5" : sub.status === "rejected" ? "bg-destructive/5" : "bg-muted/30"} pb-4`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      {sub.category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())} Update
                      <StatusBadge
                        status={sub.status}
                        className={
                          sub.status === "pending"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            : ""
                        }
                      />
                    </CardTitle>
                    <CardDescription className="mt-1.5 flex items-center gap-1.5 text-xs">
                      <Clock className="size-3" />
                      Submitted {formatDistanceToNow(new Date(sub.created_at), { addSuffix: true })}
                    </CardDescription>
                  </div>

                  {sub.status === "pending" && (
                    <div className="flex items-center gap-2">
                      {confirmAction?.id === sub.id ? (
                        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5">
                          <span className="text-xs text-muted-foreground">
                            {confirmAction.type === "approve" ? "Apply this data to your twin?" : "Reject this submission?"}
                          </span>
                          <Button
                            size="sm"
                            variant={confirmAction.type === "approve" ? "default" : "destructive"}
                            className="h-7 text-xs"
                            disabled={processingId === sub.id}
                            onClick={() => confirmAction.type === "approve" ? handleApprove(sub.id) : handleReject(sub.id)}
                          >
                            {processingId === sub.id ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                            Confirm
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setConfirmAction(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={processingId === sub.id}
                            onClick={() => setConfirmAction({ id: sub.id, type: "reject" })}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <XCircle className="mr-2 size-4" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            disabled={processingId === sub.id}
                            onClick={() => setConfirmAction({ id: sub.id, type: "approve" })}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle className="mr-2 size-4" />
                            Approve Data
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {sub.change_description && (
                  <p className="mb-4 text-sm font-medium text-foreground">
                    {sub.change_description}
                  </p>
                )}

                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Proposed Changes (Target Fields: {sub.target_fields.join(", ")})
                  </h4>
                  <div className="rounded-md bg-muted p-4 font-mono text-xs">
                    <pre className="whitespace-pre-wrap break-words">
                      {JSON.stringify(sub.content, null, 2)}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
