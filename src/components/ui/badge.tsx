import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
  className?: string;
}

const variantStyles = {
  default: "bg-primary/15 text-primary",
  secondary: "bg-secondary text-secondary-foreground",
  destructive: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
  outline: "border border-border bg-card text-foreground shadow-card",
  success: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
  warning: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
