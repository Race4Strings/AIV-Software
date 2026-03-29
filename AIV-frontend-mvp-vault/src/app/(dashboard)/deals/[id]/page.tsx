"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FileText, Target, Shield, MessageSquare,
  CheckCircle2, AlertTriangle, Loader2, Send, Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { licensingApi, type Deal } from "@/lib/api/licensing";
import apiClient from "@/lib/api/client";

interface DealMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export default function DealWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params?.id as string;
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<DealMessage[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [sending, setSending] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ title: "", due_date: "" });
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [expandedContract, setExpandedContract] = useState<string | null>(null);
  const [generatingContract, setGeneratingContract] = useState(false);
  const [showPulForm, setShowPulForm] = useState(false);
  const [pulForm, setPulForm] = useState({ record_type: "UPDATE", content_produced: "", platforms_used: "" });
  const [showSignDialog, setShowSignDialog] = useState<string | null>(null);
  const [signEmails, setSignEmails] = useState({ talent: "", client: "" });
  const [transitioning, setTransitioning] = useState(false);
  const [showTrainPrompt, setShowTrainPrompt] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Status transition config
  const NEXT_ACTION: Record<string, { label: string; next: string; variant?: "default" | "outline" }> = {
    SUBMITTED: { label: "Begin Review", next: "UNDER_REVIEW" },
    UNDER_REVIEW: { label: "Approve Inquiry", next: "APPROVED" },
    APPROVED: { label: "Send to Contract", next: "CONTRACT_SENT" },
    CONTRACT_SENT: { label: "Mark as Executed", next: "EXECUTED" },
    EXECUTED: { label: "Activate Deal", next: "ACTIVE" },
    ACTIVE: { label: "Complete Deal", next: "COMPLETED", variant: "outline" },
  };

  async function handleTransition(newStatus: string) {
    if (!deal || transitioning) return;
    setTransitioning(true);
    try {
      await apiClient.put(`/deals/${dealId}/status`, { status: newStatus });
      const updated = await licensingApi.getDeal(dealId);
      setDeal(updated);
      toast.success(`Deal moved to ${newStatus.replace("_", " ")}`);
      setShowTrainPrompt(true);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "Transition failed";
      toast.error(detail);
    }
    setTransitioning(false);
  }

  async function handleTrainAssistant(reasoning: string = "") {
    try {
      await apiClient.post(`/deals/${dealId}/train-assistant`, { reasoning });
      toast.success("Decision recorded for your assistant");
    } catch { /* non-blocking */ }
    setShowTrainPrompt(false);
  }

  useEffect(() => {
    if (!dealId) return;
    licensingApi.getDeal(dealId).then(setDeal).catch(() => {}).finally(() => setLoading(false));
    licensingApi.getMessages(dealId).then(setMessages).catch(() => {});
  }, [dealId]);

  async function sendMessage() {
    if (!msgInput.trim() || sending) return;
    setSending(true);
    try {
      const msg = await licensingApi.sendMessage(dealId, msgInput.trim());
      setMessages(prev => [...prev, msg]);
      setMsgInput("");
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch { toast.error("Failed to send message"); }
    setSending(false);
  }

  async function addMilestone() {
    if (!newMilestone.title.trim()) return;
    try {
      await licensingApi.addMilestone(dealId, newMilestone.title, newMilestone.due_date || undefined);
      const updated = await licensingApi.getDeal(dealId);
      setDeal(updated);
      setNewMilestone({ title: "", due_date: "" });
      setShowAddMilestone(false);
      toast.success("Milestone added");
    } catch { toast.error("Failed to add milestone"); }
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!deal) {
    return <div className="p-6"><p className="text-muted-foreground">Deal not found.</p></div>;
  }

  const flags = deal.parameter_flags || {};
  const allOk = flags._all_within_range;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/deals")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{deal.deal_type.replace("_", " ")} — Deal #{deal.deal_number}</h1>
            <Badge variant="outline">{deal.status.replace("_", " ")}</Badge>
            {allOk === true && <span className="flex items-center gap-1 text-xs text-emerald-500"><CheckCircle2 className="h-4 w-4" /> All parameters within range</span>}
            {allOk === false && <span className="flex items-center gap-1 text-xs text-yellow-500"><AlertTriangle className="h-4 w-4" /> Parameters flagged</span>}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            ${deal.value.toLocaleString()} {deal.currency} | Commission: {(deal.commission_rate * 100).toFixed(0)}% (${deal.commission_amount.toLocaleString()})
            {deal.territory?.length > 0 && ` | ${deal.territory.join(", ")}`}
          </p>
        </div>
      </div>

      {allOk === false && (
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="py-4">
            <h3 className="text-sm font-medium text-yellow-500 mb-2">Flagged Parameters</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(flags)
                .filter(([k, v]) => !k.startsWith("_") && typeof v === "object" && (v as Record<string, string>).status === "flagged")
                .map(([key, val]) => (
                  <Badge key={key} variant="outline" className="bg-yellow-500/10 text-yellow-500">
                    {key}: {(val as Record<string, string>).reason}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Action Bar */}
      {deal.status && NEXT_ACTION[deal.status] && (
        <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
          <div className="text-sm text-muted-foreground">
            Current: <span className="font-medium text-foreground">{deal.status.replace(/_/g, " ")}</span>
          </div>
          <Button
            size="sm"
            variant={NEXT_ACTION[deal.status].variant || "default"}
            onClick={() => handleTransition(NEXT_ACTION[deal.status].next)}
            disabled={transitioning}
          >
            {transitioning ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            {NEXT_ACTION[deal.status].label}
          </Button>
        </div>
      )}

      {/* Negotiation Knowledge Opt-In */}
      {showTrainPrompt && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between py-3">
            <p className="text-sm">Add this decision to your assistant&apos;s knowledge?</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleTrainAssistant()}>Yes</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowTrainPrompt(false)}>No</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contract">Contract {deal.contracts?.length ? `(${deal.contracts.length})` : ""}</TabsTrigger>
          <TabsTrigger value="milestones">Milestones {deal.milestones?.length ? `(${deal.milestones.length})` : ""}</TabsTrigger>
          <TabsTrigger value="messages">Messages {messages.length ? `(${messages.length})` : ""}</TabsTrigger>
          <TabsTrigger value="pul">PUL {deal.pul_records?.length ? `(${deal.pul_records.length})` : ""}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Data Scope</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {deal.data_scope?.map((s) => <Badge key={s} variant="secondary">{s.replace("_", " ")}</Badge>)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Financial</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Deal Value</span><span className="font-medium">${deal.value.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Commission ({(deal.commission_rate * 100).toFixed(0)}%)</span><span>${deal.commission_amount.toLocaleString()}</span></div>
                <div className="flex justify-between border-t pt-1"><span className="text-muted-foreground">Net to Talent</span><span className="font-medium text-emerald-500">${(deal.value - deal.commission_amount).toLocaleString()}</span></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contract" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              disabled={generatingContract}
              onClick={async () => {
                setGeneratingContract(true);
                try {
                  await apiClient.post(`/deals/${dealId}/generate-contract`);
                  const refreshed = await licensingApi.getDeal(dealId);
                  setDeal(refreshed);
                  toast.success("Contract generated from deal terms");
                } catch { toast.error("Failed to generate contract"); }
                setGeneratingContract(false);
              }}
            >
              {generatingContract ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileText className="h-4 w-4 mr-1" />}
              Generate Contract
            </Button>
          </div>
          {deal.contracts?.length ? (
            <div className="space-y-2">
              {deal.contracts.map((c) => (
                <Card key={c.id} className="cursor-pointer" onClick={() => setExpandedContract(expandedContract === c.id ? null : c.id)}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="flex-1"><span className="font-medium">Version {c.version}</span></div>
                      <div className="flex gap-3 text-xs">
                        <span className={c.signed_by_talent_at ? "text-emerald-500" : "text-muted-foreground"}>{c.signed_by_talent_at ? "Talent signed" : "Talent pending"}</span>
                        <span className={c.signed_by_client_at ? "text-emerald-500" : "text-muted-foreground"}>{c.signed_by_client_at ? "Client signed" : "Client pending"}</span>
                      </div>
                    </div>
                    {expandedContract === c.id && (
                      <div className="mt-4 pt-4 border-t border-border/50">
                        {c.contract_text ? (
                          <>
                            <div className="text-sm text-muted-foreground whitespace-pre-wrap max-h-80 overflow-y-auto rounded-lg bg-muted/30 p-4">
                              {c.contract_text}
                            </div>
                            {!c.signed_by_talent_at || !c.signed_by_client_at ? (
                              <div className="mt-3 flex items-center gap-2">
                                {showSignDialog === c.id ? (
                                  <div className="flex flex-col gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                                    <Input
                                      placeholder="Talent representative email"
                                      type="email"
                                      value={signEmails.talent}
                                      onChange={(e) => setSignEmails(prev => ({ ...prev, talent: e.target.value }))}
                                      className="text-sm"
                                    />
                                    <Input
                                      placeholder="Client representative email"
                                      type="email"
                                      value={signEmails.client}
                                      onChange={(e) => setSignEmails(prev => ({ ...prev, client: e.target.value }))}
                                      className="text-sm"
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        disabled={!signEmails.talent || !signEmails.client}
                                        onClick={async () => {
                                          try {
                                            await apiClient.post(`/deals/${dealId}/contract/${c.id}/send-for-signature?talent_email=${encodeURIComponent(signEmails.talent)}&client_email=${encodeURIComponent(signEmails.client)}`);
                                            toast.success("Contract sent for signature");
                                            setShowSignDialog(null);
                                            setSignEmails({ talent: "", client: "" });
                                          } catch { toast.error("Failed to send for signature"); }
                                        }}
                                      >
                                        Send
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => setShowSignDialog(null)}>
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => { e.stopPropagation(); setShowSignDialog(c.id); }}
                                    >
                                      Send for Signature
                                    </Button>
                                    <span className="text-xs text-muted-foreground">via Dropbox Sign</span>
                                  </>
                                )}
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">Contract text not yet uploaded.</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground py-8 text-center">No contracts uploaded yet.</p>}
        </TabsContent>

        <TabsContent value="milestones" className="mt-4 space-y-3">
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
                          setDeal(refreshed);
                          toast.success(m.completed_at ? "Milestone reopened" : "Milestone completed");
                        } catch {
                          toast.error("Failed to update milestone");
                        }
                      }}
                      className="shrink-0"
                    >
                      {m.completed_at ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/40 hover:border-emerald-500 transition-colors" />
                      )}
                    </button>
                    <div className="flex-1">
                      <span className={`font-medium ${m.completed_at ? "line-through text-muted-foreground" : ""}`}>{m.title}</span>
                      {m.description && <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {m.completed_at
                        ? <span className="text-emerald-500">Completed {new Date(m.completed_at).toLocaleDateString()}</span>
                        : m.due_date ? `Due ${new Date(m.due_date).toLocaleDateString()}` : null}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !showAddMilestone && <p className="text-sm text-muted-foreground py-8 text-center">No milestones yet.</p>}
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <Card className="flex flex-col" style={{ height: "400px" }}>
            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No messages yet. Start the conversation.</p>
                </div>
              )}
              {messages.map((msg) => {
                const isSystem = msg.sender_id === "system";
                const isCurrentUser = !isSystem && (() => {
                  try { const u = JSON.parse(localStorage.getItem("user") || "{}"); return (u.data?.id || u.id) === msg.sender_id; } catch { return false; }
                })();
                const senderLabel = isSystem ? "System" : isCurrentUser ? "You" : `Participant ${msg.sender_id.slice(0, 6)}`;
                return (
                  <div key={msg.id} className="mb-3">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium">{senderLabel}</span>
                      {!isSystem && !isCurrentUser && <Badge variant="outline" className="text-[9px] py-0">Client</Badge>}
                      <span className="text-xs text-muted-foreground">{new Date(msg.created_at).toLocaleString()}</span>
                    </div>
                    <p className={`text-sm rounded-lg px-3 py-2 ${isCurrentUser ? "bg-primary/10 ml-8" : "bg-muted/30 mr-8"}`}>{msg.content}</p>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </ScrollArea>
            <div className="border-t p-3 flex gap-2">
              <Textarea
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Type a message..."
                className="min-h-[40px] max-h-[80px] resize-none"
                rows={1}
              />
              <Button size="icon" onClick={sendMessage} disabled={!msgInput.trim() || sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="pul" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPulForm(!showPulForm)}
            >
              <Plus className="h-4 w-4 mr-1" /> Submit PUL Record
            </Button>
          </div>
          {showPulForm && (
            <Card>
              <CardContent className="space-y-3 py-4">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Record Type</label>
                  <select
                    value={pulForm.record_type}
                    onChange={(e) => setPulForm({ ...pulForm, record_type: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="OPENING_DECLARATION">Opening Declaration</option>
                    <option value="UPDATE">Update</option>
                    <option value="MATERIAL_CHANGE">Material Change</option>
                    <option value="MILESTONE_GATE">Milestone Gate</option>
                    <option value="CLOSING_ATTESTATION">Closing Attestation</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Content Produced</label>
                  <Input
                    value={pulForm.content_produced}
                    onChange={(e) => setPulForm({ ...pulForm, content_produced: e.target.value })}
                    placeholder="Describe content produced using licensed data"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Platforms Used (comma-separated)</label>
                  <Input
                    value={pulForm.platforms_used}
                    onChange={(e) => setPulForm({ ...pulForm, platforms_used: e.target.value })}
                    placeholder="YouTube, Instagram, TikTok"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      await apiClient.post(`/deals/${dealId}/pul`, {
                        record_type: pulForm.record_type,
                        content_produced: { description: pulForm.content_produced },
                        platforms_used: pulForm.platforms_used.split(",").map((s: string) => s.trim()).filter(Boolean),
                      });
                      const refreshed = await licensingApi.getDeal(dealId);
                      setDeal(refreshed);
                      setShowPulForm(false);
                      setPulForm({ record_type: "UPDATE", content_produced: "", platforms_used: "" });
                      toast.success("PUL record submitted");
                    } catch { toast.error("Failed to submit PUL record"); }
                  }}
                  disabled={!pulForm.content_produced.trim()}
                >
                  Submit
                </Button>
              </CardContent>
            </Card>
          )}
          {deal.pul_records?.length ? (
            <div className="space-y-2">
              {deal.pul_records.map((p) => (
                <Card key={p.id}>
                  <CardContent className="flex items-center gap-4 py-4">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <span className="font-medium">{p.record_type.replace(/_/g, " ")}</span>
                      {p.platforms_used?.length > 0 && <p className="text-xs text-muted-foreground mt-0.5">Platforms: {p.platforms_used.join(", ")}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(p.submitted_at).toLocaleDateString()}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !showPulForm && <p className="text-sm text-muted-foreground py-8 text-center">No PUL submissions yet. Submit your first permitted use record to track compliance.</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
