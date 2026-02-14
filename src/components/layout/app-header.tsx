"use client";

import { usePathname } from "next/navigation";
import { Search, Bell, Menu } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/projects": "Projects",
  "/quotes": "Quotes",
  "/orders": "Orders",
  "/design": "Design",
  "/quality": "Quality",
  "/hr": "Human Resources",
  "/reports": "Reports",
  "/settings": "Settings",
  "/crm/contacts": "Contacts",
  "/crm/companies": "Companies",
  "/crm/leads": "Leads",
  "/crm/opportunities": "Opportunities",
  "/crm/activities": "Activities",
  "/production/dashboard": "Production",
  "/production/jobs": "Jobs",
  "/production/schedule": "Schedule",
  "/production/capacity": "Factory Capacity",
  "/production/work-orders": "Work Orders",
  "/production/workstations": "Workstations",
  "/production/time-clock": "Time Clock",
  "/inventory/stock": "Stock",
  "/inventory/materials": "Materials",
  "/inventory/suppliers": "Suppliers",
  "/inventory/purchase-orders": "Purchase Orders",
  "/inventory/goods-receiving": "Goods Receiving",
  "/delivery/deliveries": "Deliveries",
  "/delivery/installations": "Installations",
  "/finance/invoices": "Invoices",
  "/finance/payments": "Payments",
  "/finance/job-costing": "Job Costing",
  "/finance/reports": "Financial Reports",
};

interface AppHeaderProps {
  onMenuToggle?: () => void;
}

export function AppHeader({ onMenuToggle }: AppHeaderProps) {
  const pathname = usePathname();
  const pageTitle = PAGE_TITLES[pathname] || "Joinery ERP";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/50 px-4 lg:px-6 glass">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-smooth lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-[15px] font-semibold">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="h-9 w-56 rounded-xl border-0 bg-muted/60 pl-9 pr-3 text-[13px] placeholder:text-muted-foreground/60 focus:bg-muted focus:outline-none focus:ring-2 focus:ring-ring/20 transition-smooth"
          />
        </div>

        <button className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-smooth md:hidden">
          <Search className="h-[18px] w-[18px]" />
        </button>

        <button className="relative flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-smooth">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
        </button>
      </div>
    </header>
  );
}
