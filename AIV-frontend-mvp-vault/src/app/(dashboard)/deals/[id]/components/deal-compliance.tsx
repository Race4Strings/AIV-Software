"use client";

import { useState } from "react";
import { Plus, X, Shield } from "lucide-react";
import { toast } from "sonner";
import { humanizeEnum } from "@/lib/humanize";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { licensingApi, type Deal } from "@/lib/api/licensing";

/* ── Permitted Use Log tab content ── */

interface DealPulTabProps {
  deal: Deal;
  dealId: string;
  onDealUpdate: (deal: Deal) => void;
}

export function DealPulTab({ deal, dealId, onDealUpdate }: PulTabProps) {
  const [showPulForm, setShowPulForm] = useState(false);
  const [pulForm, setPulForm] = useState({ record_type: "UPDATE", content_produced: "", platforms_used: "" });

  return (
    <div className="space-y-3">
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
                  await licensingApi.submitPUL(dealId, {
                    record_type: pulForm.record_type,
                    content_produced: pulForm.content_produced,
                    platforms_used: pulForm.platforms_used,
                  });
                  const refreshed = await licensingApi.getDeal(dealId);
                  onDealUpdate(refreshed);
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
                  <span className="font-medium">{humanizeEnum(p.record_type)}</span>
                  {p.platforms_used?.length > 0 && <p className="text-xs text-muted-foreground mt-0.5">Platforms: {p.platforms_used.join(", ")}</p>}
                </div>
                <span className="text-xs text-muted-foreground">{new Date(p.submitted_at).toLocaleDateString()}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !showPulForm && <p className="text-sm text-muted-foreground py-8 text-center">No PUL submissions yet. Submit your first permitted use record to track compliance.</p>}
    </div>
  );
}

/* ── Compliance tab content (RDA + Partners) ── */

interface ComplianceTabProps {
  deal: Deal;
  dealId: string;
  onDealUpdate: (deal: Deal) => void;
}

export function DealComplianceTab({ deal, dealId, onDealUpdate }: ComplianceTabProps) {
  const [showRdaForm, setShowRdaForm] = useState(false);
  const [rdaForm, setRdaForm] = useState({ recipient_org: "", recipient_contact: "", purpose: "", restrictions: "" });
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [partnerForm, setPartnerForm] = useState({ partner_name: "", partner_role: "", data_access_scope: "" });

  return (
    <div className="space-y-6">
      {/* Reference Data Agreements */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Reference Data Agreements</h3>
          <Button size="sm" variant="outline" onClick={() => setShowRdaForm(!showRdaForm)}>
            {showRdaForm ? <X className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
            {showRdaForm ? "Cancel" : "New RDA"}
          </Button>
        </div>
        {showRdaForm && (
          <Card className="mb-3">
            <CardContent className="py-4 space-y-3">
              <div>
                <Label htmlFor="rda-recipient-org" className="text-xs text-muted-foreground mb-1 block">Recipient organization</Label>
                <Input id="rda-recipient-org" placeholder="Organization name" value={rdaForm.recipient_org} onChange={(e) => setRdaForm(p => ({ ...p, recipient_org: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="rda-recipient-contact" className="text-xs text-muted-foreground mb-1 block">Recipient contact email</Label>
                <Input id="rda-recipient-contact" placeholder="contact@example.com" value={rdaForm.recipient_contact} onChange={(e) => setRdaForm(p => ({ ...p, recipient_contact: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="rda-purpose" className="text-xs text-muted-foreground mb-1 block">Purpose of data transfer</Label>
                <Input id="rda-purpose" placeholder="Describe the purpose" value={rdaForm.purpose} onChange={(e) => setRdaForm(p => ({ ...p, purpose: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="rda-restrictions" className="text-xs text-muted-foreground mb-1 block">Restrictions (optional)</Label>
                <Input id="rda-restrictions" placeholder="Any restrictions" value={rdaForm.restrictions} onChange={(e) => setRdaForm(p => ({ ...p, restrictions: e.target.value }))} />
              </div>
              <Button size="sm" disabled={!rdaForm.recipient_org || !rdaForm.purpose} onClick={async () => {
                try {
                  await licensingApi.createRDA(dealId, rdaForm);
                  toast.success("RDA created");
                  setShowRdaForm(false);
                  setRdaForm({ recipient_org: "", recipient_contact: "", purpose: "", restrictions: "" });
                  const refreshed = await licensingApi.getDeal(dealId);
                  onDealUpdate(refreshed);
                } catch { toast.error("Failed to create RDA"); }
              }}>Create RDA</Button>
            </CardContent>
          </Card>
        )}
        {deal.rdas?.length ? (
          <div className="space-y-2">
            {deal.rdas.map((rda: any) => (
              <Card key={rda.id} className="border-border/50">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{rda.recipient_org}</p>
                      <p className="text-xs text-muted-foreground">{rda.purpose}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {rda.signed_at ? "Signed" : "Pending"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !showRdaForm && <p className="text-sm text-muted-foreground py-4 text-center">No Reference Data Agreements yet.</p>}
      </div>

      {/* Production Partner Disclosures */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Production Partner Disclosures</h3>
          <Button size="sm" variant="outline" onClick={() => setShowPartnerForm(!showPartnerForm)}>
            {showPartnerForm ? <X className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
            {showPartnerForm ? "Cancel" : "Disclose Partner"}
          </Button>
        </div>
        {showPartnerForm && (
          <Card className="mb-3">
            <CardContent className="py-4 space-y-3">
              <div>
                <Label htmlFor="partner-name" className="text-xs text-muted-foreground mb-1 block">Partner name</Label>
                <Input id="partner-name" placeholder="Partner name" value={partnerForm.partner_name} onChange={(e) => setPartnerForm(p => ({ ...p, partner_name: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="partner-role" className="text-xs text-muted-foreground mb-1 block">Partner role</Label>
                <Input id="partner-role" placeholder="e.g., Voice synthesis provider" value={partnerForm.partner_role} onChange={(e) => setPartnerForm(p => ({ ...p, partner_role: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="partner-data-scope" className="text-xs text-muted-foreground mb-1 block">Data access scope</Label>
                <Input id="partner-data-scope" placeholder="Data access scope" value={partnerForm.data_access_scope} onChange={(e) => setPartnerForm(p => ({ ...p, data_access_scope: e.target.value }))} />
              </div>
              <Button size="sm" disabled={!partnerForm.partner_name || !partnerForm.partner_role} onClick={async () => {
                try {
                  await licensingApi.addPartner(dealId, partnerForm);
                  toast.success("Partner disclosed");
                  setShowPartnerForm(false);
                  setPartnerForm({ partner_name: "", partner_role: "", data_access_scope: "" });
                  const refreshed = await licensingApi.getDeal(dealId);
                  onDealUpdate(refreshed);
                } catch { toast.error("Failed to disclose partner"); }
              }}>Submit Disclosure</Button>
            </CardContent>
          </Card>
        )}
        {deal.partners?.length ? (
          <div className="space-y-2">
            {deal.partners.map((p: any) => (
              <Card key={p.id} className="border-border/50">
                <CardContent className="py-3">
                  <p className="text-sm font-medium">{p.partner_name}</p>
                  <p className="text-xs text-muted-foreground">{p.partner_role} — {p.data_access_scope}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !showPartnerForm && <p className="text-sm text-muted-foreground py-4 text-center">No production partners disclosed yet.</p>}
      </div>
    </div>
  );
}
