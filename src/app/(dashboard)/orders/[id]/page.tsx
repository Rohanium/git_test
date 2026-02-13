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
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { Tabs } from "@/components/ui/tabs";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { PROJECT_TYPES, JOB_STATUSES, OPERATIONS } from "@/lib/constants";

const orderStatusVariant: Record<string, any> = {
  CONFIRMED: "default", IN_PRODUCTION: "warning", ON_HOLD: "destructive",
  READY_FOR_DELIVERY: "success", DELIVERED: "success", INSTALLED: "success",
  COMPLETED: "success", CANCELLED: "destructive",
};

const ORDER_STATUSES = [
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "IN_PRODUCTION", label: "In Production" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "READY_FOR_DELIVERY", label: "Ready for Delivery" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "INSTALLED", label: "Installed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("items");
  const [showStatusChange, setShowStatusChange] = useState(false);
  const [showChangeOrder, setShowChangeOrder] = useState(false);
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showScheduleDelivery, setShowScheduleDelivery] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  const [changeForm, setChangeForm] = useState({ description: "", reason: "", costImpact: "", timeImpact: "" });
  const [jobForm, setJobForm] = useState({
    orderItemId: "",
    priority: "NORMAL",
    dueDate: "",
    estimatedHours: "",
    notes: "",
    operations: [] as string[],
  });
  const [invoiceForm, setInvoiceForm] = useState({
    type: "STANDARD" as string,
    dueDate: "",
    description: "",
    amount: "",
  });
  const [deliveryForm, setDeliveryForm] = useState({
    scheduledDate: "",
    deliveryAddress: "",
    driverNotes: "",
  });

  const { data: order, isLoading, refetch } = trpc.orders.getById.useQuery(id as string);

  const updateStatusMutation = trpc.orders.updateStatus.useMutation({
    onSuccess: () => { setShowStatusChange(false); refetch(); },
  });
  const createChangeOrderMutation = trpc.orders.createChangeOrder.useMutation({
    onSuccess: () => { setShowChangeOrder(false); setChangeForm({ description: "", reason: "", costImpact: "", timeImpact: "" }); refetch(); },
  });
  const createJobMutation = trpc.production.createJob.useMutation({
    onSuccess: () => { setShowCreateJob(false); setJobForm({ orderItemId: "", priority: "NORMAL", dueDate: "", estimatedHours: "", notes: "", operations: [] }); refetch(); },
  });
  const createInvoiceMutation = trpc.finance.createInvoice.useMutation({
    onSuccess: () => { setShowCreateInvoice(false); setInvoiceForm({ type: "STANDARD", dueDate: "", description: "", amount: "" }); refetch(); },
  });
  const scheduleDeliveryMutation = trpc.delivery.scheduleDelivery.useMutation({
    onSuccess: () => { setShowScheduleDelivery(false); setDeliveryForm({ scheduledDate: "", deliveryAddress: "", driverNotes: "" }); refetch(); },
  });

  if (isLoading) return <div className="flex h-48 items-center justify-center text-muted-foreground">Loading order...</div>;
  if (!order) return <div>Order not found.</div>;

  const tabs = [
    { key: "items", label: "Items", count: order.orderItems.length },
    { key: "jobs", label: "Jobs", count: order.jobs.length },
    { key: "invoices", label: "Invoices", count: order.invoices.length },
    { key: "changes", label: "Change Orders", count: order.changeOrders.length },
    { key: "deliveries", label: "Deliveries", count: order.deliveries.length },
  ];

  const OPERATION_OPTIONS = Object.entries(OPERATIONS).map(([k, v]) => ({ value: k, label: v }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${order.orderNumber}`}
        description={order.company?.name}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={orderStatusVariant[order.status] ?? "secondary"} className="text-sm">
              {order.status.replace(/_/g, " ")}
            </Badge>
            <Button variant="outline" onClick={() => { setNewStatus(order.status); setShowStatusChange(true); }}>
              Change Status
            </Button>
            <Button variant="outline" onClick={() => setShowChangeOrder(true)}>
              Change Order
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-primary">{formatCurrency(Number(order.total))}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Deposit Required</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{order.depositRequired ? formatCurrency(Number(order.depositRequired)) : "—"}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Deposit Paid</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{order.depositPaid ? formatCurrency(Number(order.depositPaid)) : "—"}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Required Date</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-bold">{order.requiredDate ? formatDate(order.requiredDate) : "Not set"}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Priority</CardTitle></CardHeader>
          <CardContent>
            <Badge variant={order.priority === "URGENT" ? "destructive" : order.priority === "HIGH" ? "warning" : "outline"} className="text-sm">
              {order.priority}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Content */}
      {activeTab === "items" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Order Items</CardTitle>
            <Button size="sm" onClick={() => setShowCreateJob(true)}>+ Create Job</Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">#</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Qty</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Unit Price</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Job</th>
                  </tr>
                </thead>
                <tbody>
                  {order.orderItems.map((item, idx) => (
                    <tr key={item.id} className="border-b">
                      <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium">{item.description}</td>
                      <td className="px-4 py-3"><Badge variant="outline">{(PROJECT_TYPES as any)[item.productType] ?? item.productType}</Badge></td>
                      <td className="px-4 py-3 text-center">{item.quantity}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(Number(item.unitPrice))}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(Number(item.lineTotal))}</td>
                      <td className="px-4 py-3">{item.job ? <Badge variant="success">{item.job.jobNumber}</Badge> : <span className="text-muted-foreground">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "jobs" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Production Jobs</CardTitle>
            <Button size="sm" onClick={() => setShowCreateJob(true)}>+ Create Job</Button>
          </CardHeader>
          <CardContent>
            {order.jobs.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No jobs created yet. Create jobs from order items to start production.</p>
            ) : (
              <div className="space-y-3">
                {order.jobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">{job.jobNumber}</span>
                        <Badge variant={job.priority === "URGENT" ? "destructive" : job.priority === "HIGH" ? "warning" : "outline"}>{job.priority}</Badge>
                      </div>
                      <div className="mt-1 flex gap-1">
                        {job.operations.map((op: any) => (
                          <div key={op.id} title={(OPERATIONS as any)[op.operationType]} className={`h-5 w-5 rounded text-center text-[9px] leading-5 ${op.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" : op.status === "IN_PROGRESS" ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground"}`}>
                            {(OPERATIONS as any)[op.operationType]?.[0] ?? "?"}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{(JOB_STATUSES as any)[job.status]?.label ?? job.status}</Badge>
                      {job.dueDate && <p className="mt-1 text-xs text-muted-foreground">Due: {formatDate(job.dueDate)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "invoices" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Invoices</CardTitle>
            <Button size="sm" onClick={() => setShowCreateInvoice(true)}>+ Create Invoice</Button>
          </CardHeader>
          <CardContent>
            {order.invoices.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No invoices yet.</p>
            ) : (
              <div className="space-y-3">
                {order.invoices.map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <span className="font-mono font-medium">{inv.invoiceNumber}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{inv.type}</Badge>
                        <Badge variant={inv.status === "PAID" ? "success" : inv.status === "OVERDUE" ? "destructive" : "secondary"}>{inv.status}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{formatCurrency(Number(inv.total))}</p>
                      <p className="text-xs text-muted-foreground">Due: {formatDate(inv.dueDate)}</p>
                      {Number(inv.amountPaid) > 0 && <p className="text-xs text-emerald-600">Paid: {formatCurrency(Number(inv.amountPaid))}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "changes" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Change Orders</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowChangeOrder(true)}>+ New Change Order</Button>
          </CardHeader>
          <CardContent>
            {order.changeOrders.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No change orders.</p>
            ) : (
              <div className="space-y-3">
                {order.changeOrders.map((co: any) => (
                  <div key={co.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">{co.changeNumber}</span>
                        <Badge variant={co.status === "APPROVED" ? "success" : co.status === "REJECTED" ? "destructive" : "warning"}>{co.status}</Badge>
                      </div>
                      <div className="text-right">
                        {Number(co.costImpact) !== 0 && (
                          <span className={Number(co.costImpact) > 0 ? "text-destructive font-medium" : "text-emerald-600 font-medium"}>
                            {Number(co.costImpact) > 0 ? "+" : ""}{formatCurrency(Number(co.costImpact))}
                          </span>
                        )}
                        {co.timeImpact && <span className="ml-2 text-xs text-muted-foreground">+{co.timeImpact} days</span>}
                      </div>
                    </div>
                    <p className="mt-2 text-sm font-medium">{co.description}</p>
                    <p className="text-xs text-muted-foreground">Reason: {co.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "deliveries" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Deliveries</CardTitle>
            <Button size="sm" onClick={() => {
              setDeliveryForm({ scheduledDate: "", deliveryAddress: order.company?.addressLine1 ? `${order.company.addressLine1}, ${order.company.city ?? ""}` : "", driverNotes: "" });
              setShowScheduleDelivery(true);
            }}>+ Schedule Delivery</Button>
          </CardHeader>
          <CardContent>
            {order.deliveries.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No deliveries scheduled.</p>
            ) : (
              <div className="space-y-3">
                {order.deliveries.map((del: any) => (
                  <div key={del.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <span className="font-mono font-medium">{del.deliveryNumber}</span>
                      <p className="text-sm text-muted-foreground">{del.deliveryAddress}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={del.status === "DELIVERED" ? "success" : "outline"}>{del.status}</Badge>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDate(del.scheduledDate)}</p>
                      {del.installation && (
                        <Badge variant="outline" className="mt-1">{del.installation.status.replace(/_/g, " ")}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Status Change Modal ─────────────────────────── */}
      <Modal isOpen={showStatusChange} onClose={() => setShowStatusChange(false)} title="Update Order Status">
        <div className="space-y-4">
          <Select options={ORDER_STATUSES} value={newStatus} onChange={(e) => setNewStatus(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowStatusChange(false)}>Cancel</Button>
            <Button onClick={() => updateStatusMutation.mutate({ id: order.id, status: newStatus as any })} disabled={updateStatusMutation.isPending}>
              {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Change Order Modal ──────────────────────────── */}
      <Modal isOpen={showChangeOrder} onClose={() => setShowChangeOrder(false)} title="New Change Order" description="Document a modification to this order.">
        <form onSubmit={(e) => { e.preventDefault(); createChangeOrderMutation.mutate({ orderId: order.id, description: changeForm.description, reason: changeForm.reason, costImpact: parseFloat(changeForm.costImpact) || 0, timeImpact: changeForm.timeImpact ? parseInt(changeForm.timeImpact) : undefined }); }} className="space-y-4">
          <Input label="Description" value={changeForm.description} onChange={(e) => setChangeForm({ ...changeForm, description: e.target.value })} required placeholder="What is changing?" />
          <Input label="Reason" value={changeForm.reason} onChange={(e) => setChangeForm({ ...changeForm, reason: e.target.value })} required placeholder="Why is it changing?" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Cost Impact ($)" type="number" step="0.01" value={changeForm.costImpact} onChange={(e) => setChangeForm({ ...changeForm, costImpact: e.target.value })} placeholder="0.00" />
            <Input label="Time Impact (days)" type="number" value={changeForm.timeImpact} onChange={(e) => setChangeForm({ ...changeForm, timeImpact: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" type="button" onClick={() => setShowChangeOrder(false)}>Cancel</Button><Button type="submit" disabled={createChangeOrderMutation.isPending}>{createChangeOrderMutation.isPending ? "Creating..." : "Create Change Order"}</Button></div>
        </form>
      </Modal>

      {/* ── Create Job Modal ────────────────────────────── */}
      <Modal isOpen={showCreateJob} onClose={() => setShowCreateJob(false)} title="Create Production Job" description="Generate a workshop job from this order." className="max-w-xl">
        <form onSubmit={(e) => { e.preventDefault(); createJobMutation.mutate({ orderId: order.id, orderItemId: jobForm.orderItemId || undefined, priority: jobForm.priority as any, dueDate: jobForm.dueDate ? new Date(jobForm.dueDate) : undefined, estimatedHours: jobForm.estimatedHours ? parseFloat(jobForm.estimatedHours) : undefined, notes: jobForm.notes || undefined, operations: jobForm.operations.length > 0 ? jobForm.operations.map((op) => ({ operationType: op as any, estimatedMins: 60 })) : undefined }); }} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Order Item (optional)</label>
            <Select options={order.orderItems.map((i) => ({ value: i.id, label: i.description }))} value={jobForm.orderItemId} onChange={(e) => setJobForm({ ...jobForm, orderItemId: e.target.value })} placeholder="Link to specific item..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="mb-1.5 block text-sm font-medium">Priority</label><Select options={[{ value: "LOW", label: "Low" }, { value: "NORMAL", label: "Normal" }, { value: "HIGH", label: "High" }, { value: "URGENT", label: "Urgent" }]} value={jobForm.priority} onChange={(e) => setJobForm({ ...jobForm, priority: e.target.value })} /></div>
            <Input label="Due Date" type="date" value={jobForm.dueDate} onChange={(e) => setJobForm({ ...jobForm, dueDate: e.target.value })} />
          </div>
          <Input label="Estimated Hours" type="number" step="0.5" value={jobForm.estimatedHours} onChange={(e) => setJobForm({ ...jobForm, estimatedHours: e.target.value })} />
          <div>
            <label className="mb-1.5 block text-sm font-medium">Operations</label>
            <div className="grid grid-cols-3 gap-2">
              {OPERATION_OPTIONS.map((op) => (
                <label key={op.value} className="flex items-center gap-2 rounded border p-2 text-xs cursor-pointer hover:bg-muted/50">
                  <input type="checkbox" checked={jobForm.operations.includes(op.value)} onChange={(e) => { if (e.target.checked) { setJobForm({ ...jobForm, operations: [...jobForm.operations, op.value] }); } else { setJobForm({ ...jobForm, operations: jobForm.operations.filter((o) => o !== op.value) }); } }} className="rounded" />
                  {op.label}
                </label>
              ))}
            </div>
          </div>
          <Textarea label="Notes" value={jobForm.notes} onChange={(e) => setJobForm({ ...jobForm, notes: e.target.value })} />
          <div className="flex justify-end gap-2"><Button variant="outline" type="button" onClick={() => setShowCreateJob(false)}>Cancel</Button><Button type="submit" disabled={createJobMutation.isPending}>{createJobMutation.isPending ? "Creating..." : "Create Job"}</Button></div>
        </form>
      </Modal>

      {/* ── Create Invoice Modal ────────────────────────── */}
      <Modal isOpen={showCreateInvoice} onClose={() => setShowCreateInvoice(false)} title="Create Invoice" description="Generate an invoice for this order.">
        <form onSubmit={(e) => { e.preventDefault(); createInvoiceMutation.mutate({ orderId: order.id, type: invoiceForm.type as any, dueDate: new Date(invoiceForm.dueDate), lineItems: [{ description: invoiceForm.description || `${order.orderNumber} — ${invoiceForm.type.toLowerCase()} invoice`, unitPrice: parseFloat(invoiceForm.amount) || Number(order.total) }] }); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="mb-1.5 block text-sm font-medium">Invoice Type</label><Select options={[{ value: "DEPOSIT", label: "Deposit" }, { value: "PROGRESS", label: "Progress" }, { value: "STANDARD", label: "Standard" }, { value: "FINAL", label: "Final" }]} value={invoiceForm.type} onChange={(e) => setInvoiceForm({ ...invoiceForm, type: e.target.value })} /></div>
            <Input label="Due Date" type="date" value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} required />
          </div>
          <Input label="Description" value={invoiceForm.description} onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })} placeholder={`${order.orderNumber} invoice`} />
          <Input label="Amount ($)" type="number" step="0.01" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} placeholder={Number(order.total).toFixed(2)} required />
          <div className="flex justify-end gap-2"><Button variant="outline" type="button" onClick={() => setShowCreateInvoice(false)}>Cancel</Button><Button type="submit" disabled={createInvoiceMutation.isPending}>{createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}</Button></div>
        </form>
      </Modal>

      {/* ── Schedule Delivery Modal ─────────────────────── */}
      <Modal isOpen={showScheduleDelivery} onClose={() => setShowScheduleDelivery(false)} title="Schedule Delivery">
        <form onSubmit={(e) => { e.preventDefault(); scheduleDeliveryMutation.mutate({ orderId: order.id, scheduledDate: new Date(deliveryForm.scheduledDate), deliveryAddress: deliveryForm.deliveryAddress, driverNotes: deliveryForm.driverNotes || undefined }); }} className="space-y-4">
          <Input label="Delivery Date" type="date" value={deliveryForm.scheduledDate} onChange={(e) => setDeliveryForm({ ...deliveryForm, scheduledDate: e.target.value })} required />
          <Input label="Delivery Address" value={deliveryForm.deliveryAddress} onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryAddress: e.target.value })} required />
          <Textarea label="Driver Notes" value={deliveryForm.driverNotes} onChange={(e) => setDeliveryForm({ ...deliveryForm, driverNotes: e.target.value })} placeholder="Access instructions, contact number, etc." />
          <div className="flex justify-end gap-2"><Button variant="outline" type="button" onClick={() => setShowScheduleDelivery(false)}>Cancel</Button><Button type="submit" disabled={scheduleDeliveryMutation.isPending}>{scheduleDeliveryMutation.isPending ? "Scheduling..." : "Schedule Delivery"}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
