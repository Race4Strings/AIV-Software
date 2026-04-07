"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { humanizeEnum } from "@/lib/humanize";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { licensingApi, type Deal } from "@/lib/api/licensing";
import { authApi } from "@/lib/api";

import { DealHeader } from "./components/deal-header";
import { DealOverview } from "./components/deal-overview";
import { DealContract } from "./components/deal-contract";
import { DealMilestones } from "./components/deal-milestones";
import { DealMessages, type DealMessage } from "./components/deal-messages";
import { DealPulTab, DealComplianceTab } from "./components/deal-compliance";

export default function DealWorkspacePage() {
  const params = useParams();
  const dealId = params?.id as string;
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [messages, setMessages] = useState<DealMessage[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [sending, setSending] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{next: string; label: string; hint: string} | null>(null);
  const [showTrainPrompt, setShowTrainPrompt] = useState(false);

  async function handleTransition(newStatus: string) {
    if (!deal || transitioning) return;
    setTransitioning(true);
    try {
      await licensingApi.transitionStatus(dealId, newStatus);
      const updated = await licensingApi.getDeal(dealId);
      setDeal(updated);
      toast.success(`Deal transitioned to ${humanizeEnum(newStatus)}`, { description: `Updated at ${new Date().toLocaleString()}` });
      setShowTrainPrompt(true);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "Transition failed";
      toast.error(detail);
    }
    setTransitioning(false);
  }

  async function handleTrainAssistant(reasoning: string = "") {
    try {
      await licensingApi.trainAssistant(dealId, reasoning);
      toast.success("Decision recorded for your assistant");
    } catch { /* non-blocking */ }
    setShowTrainPrompt(false);
  }

  useEffect(() => {
    if (!dealId) return;
    licensingApi.getDeal(dealId).then(setDeal).catch(() => {
      toast.error("Failed to load deal details");
    }).finally(() => setLoading(false));
    licensingApi.getMessages(dealId).then(setMessages).catch(() => {});
    authApi.getMe().then((res) => {
      const u = res?.data || res;
      if (u?.id) setCurrentUserId(u.id);
    }).catch(() => {});
  }, [dealId]);

  async function sendMessage() {
    if (!msgInput.trim() || sending) return;
    setSending(true);
    try {
      const msg = await licensingApi.sendMessage(dealId, msgInput.trim());
      setMessages(prev => [...prev, msg]);
      setMsgInput("");
    } catch { toast.error("Failed to send message"); }
    setSending(false);
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!deal) {
    return <div className="p-6"><p className="text-muted-foreground">Deal not found.</p></div>;
  }

  return (
    <div className="space-y-6 p-6">
      <DealHeader
        deal={deal}
        transitioning={transitioning}
        showTrainPrompt={showTrainPrompt}
        onConfirmAction={setConfirmAction}
        onTrainAssistant={handleTrainAssistant}
        onDismissTrainPrompt={() => setShowTrainPrompt(false)}
      />

      <Tabs defaultValue="overview">
        <TabsList className="overflow-x-auto flex-nowrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contract">Contract {deal.contracts?.length ? `(${deal.contracts.length})` : ""}</TabsTrigger>
          <TabsTrigger value="milestones">Milestones {deal.milestones?.length ? `(${deal.milestones.length})` : ""}</TabsTrigger>
          <TabsTrigger value="messages">Messages {messages.length ? `(${messages.length})` : ""}</TabsTrigger>
          <TabsTrigger value="pul">Permitted Use {deal.pul_records?.length ? `(${deal.pul_records.length})` : ""}</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <DealOverview deal={deal} />
        </TabsContent>

        <TabsContent value="contract" className="mt-4 space-y-3">
          <DealContract deal={deal} dealId={dealId} onDealUpdate={setDeal} />
        </TabsContent>

        <TabsContent value="milestones" className="mt-4 space-y-3">
          <DealMilestones deal={deal} dealId={dealId} onDealUpdate={setDeal} />
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <DealMessages
            messages={messages}
            currentUserId={currentUserId}
            msgInput={msgInput}
            sending={sending}
            onMsgInputChange={setMsgInput}
            onSendMessage={sendMessage}
          />
        </TabsContent>

        <TabsContent value="pul" className="mt-4 space-y-3">
          <DealPulTab deal={deal} dealId={dealId} onDealUpdate={setDeal} />
        </TabsContent>

        <TabsContent value="compliance" className="mt-4 space-y-6">
          <DealComplianceTab deal={deal} dealId={dealId} onDealUpdate={setDeal} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
        title={confirmAction?.label ?? ""}
        description={confirmAction?.hint ?? ""}
        consequence={
          confirmAction?.next === "EXECUTED"
            ? "Commission will be calculated and locked. This action represents a binding financial commitment."
            : confirmAction?.next === "ACTIVE"
              ? "The client will begin receiving identity data. This activates the delivery period and cannot be undone."
              : undefined
        }
        confirmLabel={confirmAction?.label ?? "Confirm"}
        variant={confirmAction?.next === "EXECUTED" || confirmAction?.next === "ACTIVE" ? "destructive" : "default"}
        loading={transitioning}
        onConfirm={() => {
          if (!confirmAction) return;
          handleTransition(confirmAction.next);
          setConfirmAction(null);
        }}
      />
    </div>
  );
}
