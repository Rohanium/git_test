"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  {
    label: "Dashboard",
    href: "/",
    icon: "LayoutDashboard",
  },
  {
    label: "CRM",
    items: [
      { label: "Contacts", href: "/crm/contacts" },
      { label: "Companies", href: "/crm/companies" },
      { label: "Leads", href: "/crm/leads" },
      { label: "Opportunities", href: "/crm/opportunities" },
      { label: "Activities", href: "/crm/activities" },
    ],
  },
  {
    label: "Quotes",
    href: "/quotes",
    icon: "FileText",
  },
  {
    label: "Orders",
    href: "/orders",
    icon: "ClipboardList",
  },
  {
    label: "Design",
    href: "/design",
    icon: "Pencil",
  },
  {
    label: "Production",
    items: [
      { label: "Dashboard", href: "/production/dashboard" },
      { label: "Jobs", href: "/production/jobs" },
      { label: "Schedule", href: "/production/schedule" },
      { label: "Work Orders", href: "/production/work-orders" },
      { label: "Workstations", href: "/production/workstations" },
    ],
  },
  {
    label: "Inventory",
    items: [
      { label: "Stock", href: "/inventory/stock" },
      { label: "Materials", href: "/inventory/materials" },
      { label: "Suppliers", href: "/inventory/suppliers" },
      { label: "Purchase Orders", href: "/inventory/purchase-orders" },
      { label: "Goods Receiving", href: "/inventory/goods-receiving" },
    ],
  },
  {
    label: "Quality",
    href: "/quality",
    icon: "CheckCircle",
  },
  {
    label: "Delivery",
    items: [
      { label: "Deliveries", href: "/delivery/deliveries" },
      { label: "Installations", href: "/delivery/installations" },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Invoices", href: "/finance/invoices" },
      { label: "Payments", href: "/finance/payments" },
      { label: "Job Costing", href: "/finance/job-costing" },
      { label: "Reports", href: "/finance/reports" },
    ],
  },
  {
    label: "HR",
    href: "/hr",
    icon: "Users",
  },
  {
    label: "Reports",
    href: "/reports",
    icon: "BarChart3",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: "Settings",
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-shrink-0 border-r bg-card lg:block">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary" />
            <span className="text-lg font-bold">Joinery ERP</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navigation.map((item) => {
              if ("items" in item) {
                return (
                  <li key={item.label}>
                    <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {item.label}
                    </div>
                    <ul className="space-y-0.5">
                      {item.items.map((subItem) => (
                        <li key={subItem.href}>
                          <Link
                            href={subItem.href}
                            className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                              pathname === subItem.href
                                ? "bg-primary/10 font-medium text-primary"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                          >
                            {subItem.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              }

              return (
                <li key={item.href}>
                  <Link
                    href={item.href!}
                    className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                      pathname === item.href
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
