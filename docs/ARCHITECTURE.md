# Joinery CRM/ERP System — Architecture Plan

## Executive Summary

A full enterprise-scope ERP/CRM system purpose-built for a **custom joinery design and manufacturing** business. This system covers the entire lifecycle: from lead capture and quoting, through design and production, to delivery, installation, invoicing, and aftercare.

---

## 1. Business Domain Overview

### What Makes Joinery ERP Unique

Custom joinery (kitchens, cabinetry, doors, windows, staircases, furniture) has distinct requirements:

- **Every job is unique** — no two orders are identical, requiring flexible BOM (Bill of Materials) generation
- **Design-to-manufacture workflow** — designs drive material requirements and production schedules
- **Material variability** — timber species, sheet goods, hardware, finishes all have variable lead times and pricing
- **Multi-stage production** — cutting, machining, assembly, finishing, quality check
- **Site work** — installation/fitting at customer premises requires scheduling and logistics
- **Long sales cycles** — residential and commercial projects can take weeks to months from quote to order

---

## 2. System Modules

### 2.1 CRM & Sales Pipeline

| Feature | Description |
|---------|-------------|
| Lead Management | Capture leads from web, referrals, trade shows, architects |
| Contact Database | Customers, architects, builders, interior designers, trade contacts |
| Opportunity Tracking | Pipeline stages: Enquiry → Site Measure → Design → Quote → Negotiation → Won/Lost |
| Activity Log | Calls, emails, meetings, site visits |
| Follow-up Automation | Scheduled reminders, automated email sequences |
| Territory Management | Assign reps to geographic areas or customer segments |
| Referral Tracking | Track which architect/builder referred the client |

### 2.2 Quoting & Estimating

| Feature | Description |
|---------|-------------|
| Quote Builder | Line-item quotes with materials, labour, finishes, hardware |
| Material Cost Calculator | Auto-calculate from current material prices + wastage factors |
| Labour Estimating | Time estimates per operation type (cutting, machining, assembly, finishing) |
| Margin Management | Target margin %, markup rules, discount approval workflows |
| Quote Versioning | Track revisions, compare versions, customer approval workflow |
| Quote Templates | Reusable templates for common product types (kitchen, wardrobe, etc.) |
| Digital Approval | Customer e-signature on accepted quotes |
| Quote-to-Order Conversion | One-click conversion preserving all specs |

### 2.3 Design & Engineering

| Feature | Description |
|---------|-------------|
| Design Brief Capture | Room dimensions, style preferences, material choices, colour schemes |
| File Management | Store CAD files, 3D renders, shop drawings, cut lists |
| Design Revision Tracking | Version control for design iterations |
| BOM Generation | Auto-generate bill of materials from design specifications |
| Cut List Integration | Generate optimised cut lists for sheet goods and solid timber |
| Specification Sheets | Generate detailed specs for workshop production |
| Customer Design Portal | Share designs with customers for review and approval |
| Integration Points | Hooks for CAD/CAM software (Cabinet Vision, Mozaik, SketchUp, AutoCAD) |

### 2.4 Order Management

| Feature | Description |
|---------|-------------|
| Order Processing | Confirmed orders with full specifications |
| Order Status Tracking | Real-time status through production stages |
| Change Order Management | Handle modifications after order confirmation with cost impact |
| Priority Management | Rush orders, VIP customers, deadline-driven scheduling |
| Order Grouping | Group related items (e.g., full kitchen = multiple cabinet orders) |
| Deposit & Payment Milestones | Stage payments tied to production milestones |

### 2.5 Inventory & Procurement

| Feature | Description |
|---------|-------------|
| Stock Management | Track timber, sheet goods, hardware, adhesives, finishes |
| Material Categories | Board goods, solid timber, veneers, laminates, hardware, ironmongery, glass, stone |
| Supplier Management | Preferred suppliers, price lists, lead times, MOQs |
| Purchase Orders | Auto-generate POs from job requirements |
| Reorder Points | Min/max stock levels with automated reorder suggestions |
| Goods Receiving | Check-in deliveries against POs, quality inspection |
| Material Allocation | Reserve stock against specific jobs |
| Wastage Tracking | Track offcuts, defective material, wastage rates |
| Batch/Board Tracking | Track timber batches for grain/colour matching |
| Cost Tracking | FIFO/weighted average costing per material |

### 2.6 Production & Workshop Management

| Feature | Description |
|---------|-------------|
| Production Scheduling | Gantt-style scheduling across workstations |
| Work Orders | Detailed work orders per job with operations breakdown |
| Workstation Management | Define machines/stations: CNC, panel saw, edge bander, spray booth, assembly |
| Capacity Planning | Visualise workshop capacity and bottlenecks |
| Job Traveller / Route Card | Paper or digital card tracking job through workshop stages |
| Time Tracking | Clock on/off per job per operation |
| Machine Maintenance | Scheduled maintenance, downtime tracking |
| Barcode/QR Scanning | Scan components through production stages |
| Production Dashboard | Real-time workshop status board (TV display mode) |
| Rework Tracking | Log and manage rework/defects |

### 2.7 Quality Control

| Feature | Description |
|---------|-------------|
| Inspection Checklists | Configurable QC checklists per product type |
| Defect Logging | Categorise defects (material, machining, assembly, finish) |
| Photo Documentation | Attach photos to QC records |
| Hold/Release Workflow | QC hold prevents dispatch until resolved |
| Supplier Quality | Track material defects back to supplier |
| Customer Complaints | Log and resolve post-installation issues |

### 2.8 Delivery & Installation

| Feature | Description |
|---------|-------------|
| Delivery Scheduling | Calendar-based delivery planning |
| Route Planning | Optimise delivery routes |
| Installation Scheduling | Book installation crews and timeframes |
| Site Readiness Checklist | Verify site is ready before dispatch |
| Delivery Notes | Generate delivery documentation |
| Proof of Delivery | Digital signature capture on delivery |
| Installation Tracking | Track installation progress and sign-off |
| Snag List | Post-installation defect/snag tracking |

### 2.9 Finance & Accounting

| Feature | Description |
|---------|-------------|
| Invoicing | Progress invoices, final invoices, credit notes |
| Payment Tracking | Track deposits, stage payments, final payments |
| Accounts Receivable | Aging reports, payment reminders, overdue management |
| Accounts Payable | Supplier invoice matching, payment scheduling |
| Job Costing | Actual vs estimated costs per job (materials, labour, overhead) |
| Profitability Analysis | Margin analysis per job, customer, product type |
| Tax Management | GST/VAT handling, tax reports |
| Bank Reconciliation | Match transactions to invoices/payments |
| Financial Reporting | P&L, balance sheet, cash flow |
| Integration | Xero / MYOB / QuickBooks API integration |

### 2.10 HR & Workforce

| Feature | Description |
|---------|-------------|
| Employee Records | Personal details, employment terms, certifications |
| Timesheets | Weekly timesheets with job allocation |
| Leave Management | Annual leave, sick leave, public holidays |
| Skills Matrix | Track qualifications (e.g., spray painting, CNC operation) |
| Training Records | Certifications, H&S training, expiry tracking |
| Subcontractor Management | Track subcontractors (installers, painters, glaziers) |

### 2.11 Reporting & Analytics

| Feature | Description |
|---------|-------------|
| Executive Dashboard | KPIs: revenue, pipeline value, production throughput, margins |
| Sales Reports | Won/lost analysis, conversion rates, sales by rep/region |
| Production Reports | Throughput, efficiency, bottleneck analysis, rework rates |
| Financial Reports | Job profitability, margin trends, cash flow forecasting |
| Inventory Reports | Stock valuation, turnover rates, dead stock |
| Customer Reports | Customer lifetime value, repeat business, satisfaction |
| Custom Report Builder | Drag-and-drop report creation |
| Scheduled Reports | Automated email delivery of key reports |

### 2.12 Document Management

| Feature | Description |
|---------|-------------|
| Central Document Store | All project documents in one place |
| Document Templates | Quote letters, invoices, delivery notes, warranties |
| Auto-generation | PDF generation for quotes, invoices, work orders |
| Version Control | Track document revisions |
| Customer Portal Documents | Share relevant documents with customers |

---

## 3. Technical Architecture

### 3.1 Tech Stack

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│  Next.js 14+ (App Router) · TypeScript · React  │
│  Tailwind CSS · shadcn/ui · Zustand             │
│  React Query (TanStack Query) · React Hook Form │
│  Recharts (dashboards) · FullCalendar           │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│                  API Layer                        │
│  Next.js API Routes (Route Handlers)             │
│  tRPC for type-safe client-server communication  │
│  NextAuth.js (authentication)                    │
│  Zod (validation)                                │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│                Data Layer                         │
│  Prisma ORM · PostgreSQL                         │
│  Redis (caching, sessions, job queues)           │
│  MinIO / S3 (file storage)                       │
│  BullMQ (background jobs)                        │
└─────────────────────────────────────────────────┘
```

### 3.2 Project Structure

```
joinery-erp/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Database migrations
│   └── seed.ts                # Seed data
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/            # Auth pages (login, register, forgot-password)
│   │   ├── (dashboard)/       # Main authenticated layout
│   │   │   ├── crm/           # CRM module pages
│   │   │   │   ├── contacts/
│   │   │   │   ├── leads/
│   │   │   │   ├── opportunities/
│   │   │   │   └── activities/
│   │   │   ├── quotes/        # Quoting module
│   │   │   ├── orders/        # Order management
│   │   │   ├── design/        # Design & engineering
│   │   │   ├── production/    # Production scheduling & tracking
│   │   │   │   ├── schedule/
│   │   │   │   ├── work-orders/
│   │   │   │   ├── workstations/
│   │   │   │   └── dashboard/
│   │   │   ├── inventory/     # Stock & procurement
│   │   │   │   ├── stock/
│   │   │   │   ├── suppliers/
│   │   │   │   ├── purchase-orders/
│   │   │   │   └── goods-receiving/
│   │   │   ├── quality/       # QC module
│   │   │   ├── delivery/      # Delivery & installation
│   │   │   ├── finance/       # Financial module
│   │   │   │   ├── invoices/
│   │   │   │   ├── payments/
│   │   │   │   ├── job-costing/
│   │   │   │   └── reports/
│   │   │   ├── hr/            # HR & workforce
│   │   │   ├── reports/       # Analytics & reporting
│   │   │   ├── documents/     # Document management
│   │   │   └── settings/      # System settings
│   │   ├── api/               # API routes
│   │   │   └── trpc/          # tRPC router
│   │   └── layout.tsx
│   ├── server/                # Server-side code
│   │   ├── routers/           # tRPC routers per module
│   │   │   ├── crm.ts
│   │   │   ├── quotes.ts
│   │   │   ├── orders.ts
│   │   │   ├── production.ts
│   │   │   ├── inventory.ts
│   │   │   ├── finance.ts
│   │   │   └── ...
│   │   ├── services/          # Business logic layer
│   │   │   ├── quoting/
│   │   │   ├── production/
│   │   │   ├── inventory/
│   │   │   └── ...
│   │   ├── trpc.ts            # tRPC init
│   │   └── db.ts              # Prisma client
│   ├── components/            # Shared UI components
│   │   ├── ui/                # shadcn/ui base components
│   │   ├── layout/            # Shell, sidebar, header
│   │   ├── forms/             # Reusable form components
│   │   ├── tables/            # Data table components
│   │   └── charts/            # Dashboard chart components
│   ├── lib/                   # Shared utilities
│   │   ├── utils.ts
│   │   ├── constants.ts
│   │   ├── permissions.ts
│   │   └── pdf/               # PDF generation
│   ├── hooks/                 # Custom React hooks
│   ├── stores/                # Zustand stores
│   └── types/                 # Shared TypeScript types
├── public/                    # Static assets
├── tests/                     # Test suites
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docker-compose.yml         # PostgreSQL, Redis, MinIO
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### 3.3 Authentication & Authorization

- **NextAuth.js** with credentials + optional SSO
- **Role-Based Access Control (RBAC)**:
  - `admin` — Full system access
  - `sales` — CRM, quotes, limited order view
  - `designer` — Design module, BOM, specifications
  - `workshop_manager` — Production, scheduling, work orders
  - `workshop_staff` — Time tracking, job traveller view
  - `accounts` — Finance, invoicing, payments
  - `installer` — Delivery/installation schedules, snag lists
  - `viewer` — Read-only dashboard access
- **Row-level security** — Users only see data relevant to their role/territory
- **Audit trail** — All data mutations logged with user, timestamp, before/after

---

## 4. Database Schema (Core Entities)

### 4.1 CRM

```
Contact          → Company, individual, or both
Lead             → Unqualified prospect, linked to Contact
Opportunity      → Qualified deal in pipeline (has stage, value, probability)
Activity         → Call, email, meeting, site visit (linked to Contact/Opportunity)
```

### 4.2 Quoting

```
Quote            → Header (customer, date, validity, status, margin target)
QuoteLineItem    → Individual items (product type, dimensions, materials, price)
QuoteVersion     → Snapshot of quote at a point in time
QuoteMaterial    → Materials breakdown per line item
QuoteLabour      → Labour estimate per line item
```

### 4.3 Orders & Jobs

```
Order            → Confirmed quote becomes order
OrderItem        → Line items from quote
Job              → Production job (one order may have multiple jobs)
JobOperation     → Individual operations within a job (cut, machine, assemble, finish)
ChangeOrder      → Modifications to confirmed order
```

### 4.4 Inventory

```
Material         → Raw material definition (timber, board, hardware)
MaterialCategory → Hierarchical categorisation
StockItem        → Physical stock with location, quantity, cost
Supplier         → Supplier details, payment terms
PurchaseOrder    → PO header
PurchaseOrderLine→ PO line items
GoodsReceipt     → Receiving record against PO
StockMovement    → Every stock in/out/transfer logged
MaterialAllocation → Stock reserved for specific job
```

### 4.5 Production

```
ProductionSchedule → Master schedule
WorkOrder        → Detailed work order for a job
WorkStation      → Machine/station definition (CNC, saw, spray booth)
WorkStationBooking → Time slot booked on a workstation
TimeEntry        → Employee clock on/off per job/operation
```

### 4.6 Finance

```
Invoice          → Customer invoice (progress, final, credit note)
InvoiceLine      → Line items
Payment          → Payment received
SupplierInvoice  → Supplier bill
JobCostRecord    → Actual cost accumulation per job
```

### 4.7 Common

```
User             → System user with role
AuditLog         → All mutations tracked
Document         → File metadata (linked to any entity)
Note             → Free-text notes on any entity
Notification     → System notifications
Setting          → System-wide configuration
```

---

## 5. Key Workflows

### 5.1 Lead-to-Cash Flow

```
Lead Captured
    ↓
Qualify → Create Opportunity
    ↓
Site Measure / Design Brief
    ↓
Design Iterations ←→ Customer Review
    ↓
Quote Generated (auto-priced from BOM)
    ↓
Customer Approval (e-signature)
    ↓
Order Created → Deposit Invoice Sent
    ↓
Materials Ordered (POs auto-generated)
    ↓
Production Scheduled
    ↓
Workshop Production (tracked per operation)
    ↓
QC Inspection
    ↓
Delivery Scheduled → Dispatched
    ↓
Installation → Customer Sign-off
    ↓
Final Invoice → Payment Collected
    ↓
Warranty Period → Aftercare
```

### 5.2 Production Flow

```
Work Order Created (from confirmed order)
    ↓
Materials Allocated / Ordered
    ↓
Cut Lists Generated
    ↓
CNC Programs Prepared (if applicable)
    ↓
Cutting → Edge Banding → Machining → Assembly → Finishing → QC
    ↓
Pack & Stage for Delivery
```

---

## 6. Integration Points

| System | Integration | Purpose |
|--------|-------------|---------|
| Xero / MYOB / QuickBooks | REST API | Sync invoices, payments, chart of accounts |
| CAD/CAM Software | File import/export | Design files, cut lists, CNC programs |
| Email (SMTP/IMAP) | API | Send quotes, log email correspondence |
| SMS Gateway | API | Appointment reminders, delivery notifications |
| Google Maps / Mapbox | API | Site locations, delivery route planning |
| Cloud Storage (S3/MinIO) | SDK | Design files, photos, documents |
| Payment Gateway (Stripe) | API | Online deposit/payment collection |

---

## 7. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Availability | 99.9% uptime |
| Response Time | < 200ms for page loads, < 500ms for complex queries |
| Data Retention | 7+ years for financial records |
| Backup | Daily automated backups with point-in-time recovery |
| Security | OWASP Top 10 compliance, encrypted at rest and in transit |
| Scalability | Support 50+ concurrent users, 10,000+ jobs/year |
| Browser Support | Chrome, Firefox, Safari, Edge (latest 2 versions) |
| Mobile | Responsive design, PWA for workshop floor tablets |
| Accessibility | WCAG 2.1 AA compliance |

---

## 8. Implementation Phases

### Phase 1 — Foundation & CRM
- Project scaffolding, auth, RBAC
- Contact and company management
- Lead and opportunity pipeline
- Activity logging
- Basic dashboard

### Phase 2 — Quoting & Orders
- Quote builder with line items
- Material cost calculation
- Labour estimation
- Quote versioning and approval
- Quote-to-order conversion
- Order management

### Phase 3 — Design & BOM
- Design brief capture
- File management (upload, version, share)
- BOM generation from specifications
- Cut list generation
- Customer design review portal

### Phase 4 — Inventory & Procurement
- Material catalogue
- Stock management (in/out/transfer)
- Supplier management
- Purchase orders (manual + auto-generate from jobs)
- Goods receiving
- Stock allocation per job

### Phase 5 — Production & Workshop
- Workstation setup
- Production scheduling (Gantt view)
- Work order generation
- Job traveller / route card
- Time tracking (clock on/off)
- Workshop dashboard (TV display mode)

### Phase 6 — Quality & Delivery
- QC checklists and inspection
- Defect logging
- Delivery scheduling
- Installation tracking
- Snag list management
- Customer sign-off

### Phase 7 — Finance
- Invoice generation (progress + final)
- Payment tracking
- Accounts receivable aging
- Job costing (actual vs estimated)
- Profitability reporting
- Accounting system integration (Xero/MYOB)

### Phase 8 — Reporting & Polish
- Executive dashboard with KPIs
- Custom report builder
- Scheduled report delivery
- Document template system
- PDF generation
- Notification system
- Mobile/tablet optimisation

---

## 9. Dev Environment Setup

```bash
# Prerequisites
Node.js 20+
PostgreSQL 16+
Redis 7+
pnpm (package manager)

# Local development
docker-compose up -d          # Start PostgreSQL, Redis, MinIO
pnpm install                  # Install dependencies
pnpm prisma migrate dev       # Run migrations
pnpm prisma db seed           # Seed demo data
pnpm dev                      # Start dev server on localhost:3000
```

---

## 10. Key Design Decisions

1. **Next.js App Router** — Server components for performance, server actions for mutations, streaming for large datasets
2. **tRPC** — End-to-end type safety eliminates API contract bugs
3. **Prisma** — Type-safe database access with excellent migration tooling
4. **PostgreSQL** — Robust relational database ideal for complex business data with JSON support for flexible fields
5. **Redis + BullMQ** — Background processing for PDF generation, email sending, report generation, stock recalculation
6. **Multi-tenant ready** — Schema designed to support multiple business entities if needed
7. **Soft deletes** — Critical business data is never hard-deleted
8. **Event sourcing for key entities** — Order status changes, stock movements logged as immutable events
