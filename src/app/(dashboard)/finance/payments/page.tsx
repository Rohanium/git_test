"use client";

import { PageHeader } from "@/components/ui/page-header";

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Track customer payments and deposits."
        helpText="Record and track payments received against invoices — view payment method, reference details, and reconciliation status."
      />

      <div className="rounded-lg border border-dashed p-12 text-center">
        <h3 className="text-lg font-semibold">No Payments</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Payments are recorded against invoices. Create invoices from confirmed orders to start tracking payments.
        </p>
      </div>
    </div>
  );
}
