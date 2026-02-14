"use client";

import { PageHeader } from "@/components/ui/page-header";

export default function GoodsReceivingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Goods Receiving"
        description="Check in deliveries from suppliers against purchase orders."
        helpText="Record incoming goods against purchase orders — verify quantities, check quality, and update stock levels automatically."
      />

      <div className="rounded-lg border border-dashed p-12 text-center">
        <h3 className="text-lg font-semibold">No Pending Receipts</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Goods receipts appear here when purchase orders are sent and deliveries arrive.
          Scan or manually check items against PO line items.
        </p>
      </div>
    </div>
  );
}
