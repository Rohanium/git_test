"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FileText,
  ClipboardList,
  Pencil,
  Factory,
  Package,
  CheckCircle,
  Truck,
  DollarSign,
  UserCircle,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  {
    label: "CRM",
    icon: Users,
    items: [
      { label: "Contacts", href: "/crm/contacts" },
      { label: "Companies", href: "/crm/companies" },
      { label: "Leads", href: "/crm/leads" },
      { label: "Opportunities", href: "/crm/opportunities" },
      { label: "Activities", href: "/crm/activities" },
    ],
  },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Quotes", href: "/quotes", icon: FileText },
  { label: "Orders", href: "/orders", icon: ClipboardList },
  { label: "Design", href: "/design", icon: Pencil },
  {
    label: "Production",
    icon: Factory,
    items: [
      { label: "Dashboard", href: "/production/dashboard" },
      { label: "Jobs", href: "/production/jobs" },
      { label: "Schedule", href: "/production/schedule" },
      { label: "Capacity", href: "/production/capacity" },
      { label: "Work Orders", href: "/production/work-orders" },
      { label: "Workstations", href: "/production/workstations" },
      { label: "Time Clock", href: "/production/time-clock" },
    ],
  },
  {
    label: "Inventory",
    icon: Package,
    items: [
      { label: "Stock", href: "/inventory/stock" },
      { label: "Materials", href: "/inventory/materials" },
      { label: "Suppliers", href: "/inventory/suppliers" },
      { label: "Purchase Orders", href: "/inventory/purchase-orders" },
      { label: "Goods Receiving", href: "/inventory/goods-receiving" },
    ],
  },
  { label: "Quality", href: "/quality", icon: CheckCircle },
  {
    label: "Delivery",
    icon: Truck,
    items: [
      { label: "Deliveries", href: "/delivery/deliveries" },
      { label: "Installations", href: "/delivery/installations" },
    ],
  },
  {
    label: "Finance",
    icon: DollarSign,
    items: [
      { label: "Invoices", href: "/finance/invoices" },
      { label: "Payments", href: "/finance/payments" },
      { label: "Job Costing", href: "/finance/job-costing" },
      { label: "Reports", href: "/finance/reports" },
    ],
  },
  { label: "HR", href: "/hr", icon: UserCircle },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function toggleSection(label: string) {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  function isSectionActive(items: { href: string }[]) {
    return items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"));
  }

  return (
    <aside className="hidden w-[260px] flex-shrink-0 lg:flex lg:flex-col border-r border-border/50 bg-card/80 glass">
      {/* Logo */}
      <div className="flex h-14 items-center px-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
            <span className="text-sm font-bold text-primary-foreground">JE</span>
          </div>
          <span className="text-[15px] font-semibold tracking-tight">Joinery ERP</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <ul className="space-y-0.5">
          {navigation.map((item) => {
            if ("items" in item && item.items) {
              const Icon = item.icon;
              const isActive = isSectionActive(item.items);
              const isOpen = collapsed[item.label] !== undefined ? !collapsed[item.label] : isActive;

              return (
                <li key={item.label} className="py-0.5">
                  <button
                    onClick={() => toggleSection(item.label)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-smooth",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    {Icon && <Icon className="h-[18px] w-[18px] opacity-70" />}
                    <span className="flex-1 text-left">{item.label}</span>
                    {isOpen ? (
                      <ChevronDown className="h-3.5 w-3.5 opacity-40" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                    )}
                  </button>
                  {isOpen && (
                    <ul className="mt-0.5 space-y-0.5 pl-[30px]">
                      {item.items.map((subItem) => {
                        const subActive = pathname === subItem.href || pathname.startsWith(subItem.href + "/");
                        return (
                          <li key={subItem.href}>
                            <Link
                              href={subItem.href}
                              className={cn(
                                "block rounded-lg px-3 py-2 text-[13px] transition-smooth",
                                subActive
                                  ? "bg-primary/10 font-medium text-primary"
                                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                              )}
                            >
                              {subItem.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            }

            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href!}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-smooth",
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  {Icon && <Icon className="h-[18px] w-[18px] opacity-70" />}
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom user section */}
      <div className="border-t border-border/50 px-3 py-3">
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
            AJ
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-[13px] font-medium">Admin User</p>
            <p className="truncate text-[11px] text-muted-foreground">admin@joinery-erp.local</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
