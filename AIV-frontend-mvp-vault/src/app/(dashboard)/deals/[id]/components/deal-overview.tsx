"use client";

import { humanizeEnum } from "@/lib/humanize";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Deal } from "@/lib/api/licensing";

interface DealOverviewProps {
  deal: Deal;
}

export function DealOverview({ deal }: DealOverviewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Data Scope</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {deal.data_scope?.map((s) => <Badge key={s} variant="secondary">{humanizeEnum(s)}</Badge>)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Financial</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Deal Value</span><span className="font-medium font-mono tabular-nums">${deal.value.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Commission (<span className="font-mono tabular-nums">{(deal.commission_rate * 100).toFixed(0)}%</span>)</span><span className="font-mono tabular-nums">${deal.commission_amount.toLocaleString()}</span></div>
          <div className="flex justify-between border-t pt-1"><span className="text-muted-foreground">Net to Talent</span><span className="font-medium text-success font-mono tabular-nums">${(deal.value - deal.commission_amount).toLocaleString()}</span></div>
        </CardContent>
      </Card>
    </div>
  );
}
