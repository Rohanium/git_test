import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const variantStyles = {
  default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]",
  destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-[0.98]",
  outline: "border border-input bg-card shadow-card hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
  ghost: "hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
  link: "text-primary underline-offset-4 hover:underline",
};

const sizeStyles = {
  default: "h-10 px-5 py-2",
  sm: "h-9 px-3.5 text-[13px]",
  lg: "h-11 px-8",
  icon: "h-10 w-10",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
