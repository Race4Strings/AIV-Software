"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { licensingApi, type Deal } from "@/lib/api/licensing";

interface DealContractProps {
  deal: Deal;
  dealId: string;
  onDealUpdate: (deal: Deal) => void;
}

export function DealContract({ deal, dealId, onDealUpdate }: DealContractProps) {
  const [expandedContract, setExpandedContract] = useState<string | null>(null);
  const [generatingContract, setGeneratingContract] = useState(false);
  const [contractTemplate, setContractTemplate] = useState("licensing_agreement");
  const [showSignDialog, setShowSignDialog] = useState<string | null>(null);
  const [signEmails, setSignEmails] = useState({ talent: "", client: "" });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <select
          value={contractTemplate}
          onChange={(e) => setContractTemplate(e.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
        >
          <option value="licensing_agreement">Licensing Agreement</option>
          <option value="psa">Platform Services Agreement</option>
          <option value="dpa">Data Processing Agreement</option>
        </select>
        <Button
          variant="outline"
          size="sm"
          disabled={generatingContract}
          onClick={async () => {
            setGeneratingContract(true);
            try {
              await licensingApi.generateContract(dealId, contractTemplate);
              const refreshed = await licensingApi.getDeal(dealId);
              onDealUpdate(refreshed);
              toast.success("Contract generated");
            } catch { toast.error("Failed to generate contract"); }
            setGeneratingContract(false);
          }}
        >
          {generatingContract ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileText className="h-4 w-4 mr-1" />}
          Generate
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
                    <span className={c.signed_by_talent_at ? "text-success" : "text-muted-foreground"}>{c.signed_by_talent_at ? "Talent signed" : "Talent pending"}</span>
                    <span className={c.signed_by_client_at ? "text-success" : "text-muted-foreground"}>{c.signed_by_client_at ? "Client signed" : "Client pending"}</span>
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
                                <div>
                                  <Label htmlFor="sign-talent-email" className="text-xs text-muted-foreground mb-1 block">Talent representative email</Label>
                                  <Input
                                    id="sign-talent-email"
                                    placeholder="talent@example.com"
                                    type="email"
                                    value={signEmails.talent}
                                    onChange={(e) => setSignEmails(prev => ({ ...prev, talent: e.target.value }))}
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="sign-client-email" className="text-xs text-muted-foreground mb-1 block">Client representative email</Label>
                                  <Input
                                    id="sign-client-email"
                                    placeholder="client@example.com"
                                    type="email"
                                    value={signEmails.client}
                                    onChange={(e) => setSignEmails(prev => ({ ...prev, client: e.target.value }))}
                                    className="text-sm"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    disabled={!signEmails.talent || !signEmails.client}
                                    onClick={async () => {
                                      try {
                                        await licensingApi.sendForSignature(dealId, c.id, signEmails.talent, signEmails.client);
                                        toast.success("Contract sent for signature — both parties will receive signing links via email");
                                        setShowSignDialog(null);
                                        setSignEmails({ talent: "", client: "" });
                                        const refreshed = await licensingApi.getDeal(dealId);
                                        onDealUpdate(refreshed);
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
    </div>
  );
}
