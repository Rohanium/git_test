import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: { value: number; label: string };
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  trend,
  icon,
  className,
}: StatCardProps) {
  return (
    <div className={cn("rounded-2xl bg-card p-5 shadow-card", className)}>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-muted-foreground">{title}</p>
        {icon && <div className="text-muted-foreground/60">{icon}</div>}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
      {description && (
        <p className="mt-1 text-[12px] text-muted-foreground">{description}</p>
      )}
      {trend && (
        <p
          className={cn(
            "mt-1.5 text-[12px] font-semibold",
            trend.value >= 0 ? "text-emerald-600" : "text-red-500"
          )}
        >
          {trend.value >= 0 ? "+" : ""}
          {trend.value}% {trend.label}
        </p>
      )}
    </div>
  );
}
