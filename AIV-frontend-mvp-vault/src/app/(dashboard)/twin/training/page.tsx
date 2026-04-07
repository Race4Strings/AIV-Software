"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchTwins, Twin } from "@/lib/api/twins";
import { trainingApi, TrainingSubmission } from "@/lib/api/training";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Fingerprint, CheckCircle, XCircle, Clock, MessageSquare, Inbox } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "sonner";
import { humanizeEnum } from "@/lib/humanize";
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
// Select imports removed — form now uses native <select> for simplicity

export default function TrainingPage() {
  const [twin, setTwin] = useState<Twin | null>(null);
  const [submissions, setSubmissions] = useState<TrainingSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [submittingData, setSubmittingData] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState<{
    category: string;
    change_description: string;
    description: string;
    content: string;
    source: string;
    target_fields: string[];
  }>({
    category: "personality",
    change_description: "",
    description: "",
    content: "",
    source: "",
    target_fields: [],
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twin || !formData.description.trim() || !formData.content.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSubmittingData(true);
    try {
      const payload = {
        category: formData.category,
        change_description: formData.description,
        target_fields: formData.target_fields,
        content: {
          description: formData.description,
          data: formData.content,
          source: formData.source || undefined,
        },
      };

      await trainingApi.createSubmission(twin.id, payload);

      toast.success("Submission created successfully");
      setShowSuccess(true);
      await loadData();
      
      setTimeout(() => {
        setOpenDialog(false);
        setFormData({ category: "personality", change_description: "", description: "", content: "", source: "", target_fields: [] });
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
    setProcessingId(subId);
    try {
      await trainingApi.approveSubmission(twin.id, subId);
      toast.success("Training data approved and applied to ALCM");
      await loadData();
    } catch {
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
      <div className="mx-auto max-w-4xl space-y-8 animate-pulse">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
        {/* Submission cards skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border/50 overflow-hidden">
              <div className="bg-muted/30 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-40" />
              </div>
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-20 w-full rounded-md" />
              </div>
            </div>
          ))}
        </div>
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
          <Link href="/twin/training-area" className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1">
            <MessageSquare className="h-3.5 w-3.5" />
            Open Training Area
          </Link>
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
                <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-success" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground">Submission Received</h3>
                  <p className="text-sm text-muted-foreground mt-1">Your training data has been queued for review.</p>
                </div>
              </div>
            ) : (
            <form onSubmit={handleCreateSubmit} className="space-y-4 pt-4">
              {/* Category */}
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="personality">Personality &amp; Style</option>
                  <option value="knowledge">Knowledge &amp; Expertise</option>
                  <option value="voice">Voice &amp; Speech</option>
                  <option value="visual">Visual &amp; Appearance</option>
                  <option value="behavioral">Behavioral Patterns</option>
                  <option value="correction">Correction / Fix</option>
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label>What changed? <span className="text-destructive">*</span></Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Updated stance on AI regulation"
                  required
                />
              </div>

              {/* Content */}
              <div className="space-y-1.5">
                <Label>New information <span className="text-destructive">*</span></Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter the actual content, quote, position, or information to add..."
                  rows={4}
                  required
                />
              </div>

              {/* Source */}
              <div className="space-y-1.5">
                <Label>Source (optional)</Label>
                <Input
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  placeholder="Interview, article, personal knowledge..."
                />
              </div>

              {/* Target fields as checkboxes */}
              <div className="space-y-1.5">
                <Label>What should this update?</Label>
                <div className="flex flex-wrap gap-2">
                  {["personality", "knowledge", "voice", "communication_style", "opinions"].map((field) => (
                    <label key={field} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.target_fields.includes(field)}
                        onChange={(e) => {
                          const fields = formData.target_fields;
                          setFormData({
                            ...formData,
                            target_fields: e.target.checked
                              ? [...fields, field]
                              : fields.filter((f: string) => f !== field),
                          });
                        }}
                        className="rounded border-border"
                      />
                      {humanizeEnum(field)}
                    </label>
                  ))}
                </div>
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
        <EmptyState
          icon={Inbox}
          title="Your ALCM is up to date"
          description="There are no pending training submissions. When AIV suggests refinements or new data is captured, they will appear here for your review."
        />
      ) : (
        <div className="grid gap-4">
          {submissions.map((sub) => (
            <Card key={sub.id} className={`overflow-hidden transition-[border-color,opacity] ${sub.status === "approved" ? "border-success/20" : sub.status === "rejected" ? "border-destructive/20 opacity-75" : "border-border/50"}`}>
              <CardHeader className={`${sub.status === "approved" ? "bg-success/5" : sub.status === "rejected" ? "bg-destructive/5" : "bg-muted/30"} pb-4`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      {humanizeEnum(sub.category)} Update
                      <StatusBadge
                        status={sub.status}
                        className={
                          sub.status === "pending"
                            ? "bg-warning/10 text-warning border-warning/20"
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
                      {confirmAction?.id === sub.id && confirmAction.type === "reject" ? (
                        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5">
                          <span className="text-xs text-muted-foreground">
                            Reject this submission?
                          </span>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs"
                            disabled={processingId === sub.id}
                            onClick={() => handleReject(sub.id)}
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
                            onClick={() => handleApprove(sub.id)}
                            className="bg-success hover:bg-success/90 text-white"
                          >
                            {processingId === sub.id ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle className="mr-2 size-4" />}
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
