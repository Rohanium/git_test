"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { PROJECT_TYPES } from "@/lib/constants";

export default function QuoteDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [showAddItem, setShowAddItem] = useState(false);
  const [form, setForm] = useState({
    productType: "KITCHEN",
    description: "",
    dimensions: "",
    quantity: "1",
    materialCost: "",
    labourCost: "",
    labourHours: "",
    hardwareCost: "",
    finishType: "",
    notes: "",
  });

  const { data: quote, isLoading, refetch } = trpc.quotes.getById.useQuery(id as string);

  const addItemMutation = trpc.quotes.addLineItem.useMutation({
    onSuccess: () => {
      setShowAddItem(false);
      setForm({
        productType: "KITCHEN", description: "", dimensions: "", quantity: "1",
        materialCost: "", labourCost: "", labourHours: "", hardwareCost: "",
        finishType: "", notes: "",
      });
      refetch();
    },
  });

  const convertMutation = trpc.quotes.convertToOrder.useMutation({
    onSuccess: (order) => {
      router.push(`/orders`);
    },
  });

  if (isLoading) {
    return <div className="flex h-48 items-center justify-center text-muted-foreground">Loading quote...</div>;
  }

  if (!quote) {
    return <div>Quote not found.</div>;
  }

  const statusVariant: Record<string, any> = {
    DRAFT: "secondary", SENT: "default", APPROVED: "success",
    REJECTED: "destructive", CONVERTED: "success",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${quote.quoteNumber} — ${quote.title}`}
        description={quote.company?.name ?? "No company assigned"}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant[quote.status] ?? "secondary"} className="text-sm">
              {quote.status}
            </Badge>
            <Button
              variant="outline"
              onClick={() => window.open(`/api/quotes/${quote.id}/pdf`, "_blank")}
            >
              Preview PDF
            </Button>
            <Button variant="outline" onClick={() => setShowAddItem(true)}>
              + Add Item
            </Button>
            {quote.status === "APPROVED" && (
              <Button
                onClick={() => convertMutation.mutate(quote.id)}
                disabled={convertMutation.isPending}
              >
                Convert to Order
              </Button>
            )}
          </div>
        }
      />

      {/* Quote Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Subtotal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(Number(quote.subtotal))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">GST ({Number(quote.taxRate) * 100}%)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(Number(quote.taxAmount))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total (inc GST)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatCurrency(Number(quote.total))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{quote.lineItems.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          {quote.lineItems.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>No line items yet.</p>
              <Button className="mt-2" variant="outline" onClick={() => setShowAddItem(true)}>
                + Add First Item
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">#</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Material</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Labour</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Hardware</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Qty</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.lineItems.map((item, index) => (
                    <tr key={item.id} className="border-b">
                      <td className="px-4 py-3 text-muted-foreground">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{item.description}</div>
                        {item.dimensions && (
                          <div className="text-xs text-muted-foreground">{item.dimensions}</div>
                        )}
                        {item.finishType && (
                          <div className="text-xs text-muted-foreground">Finish: {item.finishType}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">
                          {(PROJECT_TYPES as any)[item.productType] ?? item.productType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">{formatCurrency(Number(item.materialCost))}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(Number(item.labourCost))}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(Number(item.hardwareCost))}</td>
                      <td className="px-4 py-3 text-center">{item.quantity}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatCurrency(Number(item.lineTotal))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30">
                    <td colSpan={7} className="px-4 py-3 text-right font-semibold">Subtotal</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(Number(quote.subtotal))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Line Item Modal */}
      <Modal
        isOpen={showAddItem}
        onClose={() => setShowAddItem(false)}
        title="Add Line Item"
        description="Add a new item to this quote."
        className="max-w-xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addItemMutation.mutate({
              quoteId: quote.id,
              productType: form.productType,
              description: form.description,
              dimensions: form.dimensions || undefined,
              quantity: parseInt(form.quantity) || 1,
              materialCost: parseFloat(form.materialCost) || 0,
              labourCost: parseFloat(form.labourCost) || 0,
              labourHours: form.labourHours ? parseFloat(form.labourHours) : undefined,
              hardwareCost: parseFloat(form.hardwareCost) || 0,
              finishType: form.finishType || undefined,
              notes: form.notes || undefined,
            });
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Product Type</label>
              <Select
                options={Object.entries(PROJECT_TYPES).map(([k, v]) => ({ value: k, label: v }))}
                value={form.productType}
                onChange={(e) => setForm({ ...form, productType: e.target.value })}
              />
            </div>
            <Input
              label="Quantity"
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              min="1"
            />
          </div>
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="e.g. Base cabinet - 600mm wide, soft-close drawers"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Dimensions"
              value={form.dimensions}
              onChange={(e) => setForm({ ...form, dimensions: e.target.value })}
              placeholder="e.g. 600W x 580D x 720H"
            />
            <Input
              label="Finish Type"
              value={form.finishType}
              onChange={(e) => setForm({ ...form, finishType: e.target.value })}
              placeholder="e.g. 2-pack paint, stain"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Material Cost ($)"
              type="number"
              step="0.01"
              value={form.materialCost}
              onChange={(e) => setForm({ ...form, materialCost: e.target.value })}
              placeholder="0.00"
            />
            <Input
              label="Labour Cost ($)"
              type="number"
              step="0.01"
              value={form.labourCost}
              onChange={(e) => setForm({ ...form, labourCost: e.target.value })}
              placeholder="0.00"
            />
            <Input
              label="Hardware Cost ($)"
              type="number"
              step="0.01"
              value={form.hardwareCost}
              onChange={(e) => setForm({ ...form, hardwareCost: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <Input
            label="Labour Hours"
            type="number"
            step="0.5"
            value={form.labourHours}
            onChange={(e) => setForm({ ...form, labourHours: e.target.value })}
            placeholder="Estimated hours"
          />
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowAddItem(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addItemMutation.isPending}>
              {addItemMutation.isPending ? "Adding..." : "Add Item"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
