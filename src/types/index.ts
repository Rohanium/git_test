// Re-export Prisma types for frontend use
export type {
  User,
  Company,
  Contact,
  Lead,
  Opportunity,
  Activity,
  Quote,
  QuoteLineItem,
  Order,
  OrderItem,
  Job,
  JobOperation,
  WorkStation,
  Material,
  StockItem,
  PurchaseOrder,
  Supplier,
  Invoice,
  Payment,
  Delivery,
  Installation,
  Employee,
  QualityCheck,
  Defect,
} from "@prisma/client";

// ── Pagination ──────────────────────────────────────────────
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  pages: number;
  page: number;
  pageSize: number;
}

// ── Dashboard KPIs ──────────────────────────────────────────
export interface ExecutiveKpis {
  pipelineValue: number;
  pipelineCount: number;
  monthlyOrders: number;
  yearToDateRevenue: number;
  activeJobs: number;
  overdueInvoices: number;
  winRate: number;
}

// ── Job Cost Summary ────────────────────────────────────────
export interface JobCostSummary {
  materialCost: number;
  labourCost: number;
  otherCosts: number;
  totalCost: number;
  revenue: number;
  profit: number;
  marginPercent: number;
}

// ── Stock Summary ───────────────────────────────────────────
export interface StockSummaryItem {
  id: string;
  sku: string;
  name: string;
  unit: string;
  totalQuantity: number;
  totalValue: number;
  reorderPoint: number | null;
  isLowStock: boolean;
}
