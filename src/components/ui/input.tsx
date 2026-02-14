import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-foreground/80">
            {label}
          </label>
        )}
        <input
          id={id}
          className={cn(
            "h-10 w-full rounded-xl border-0 bg-muted/60 px-3.5 text-[13px] ring-offset-background placeholder:text-muted-foreground/50 focus:bg-muted focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 transition-smooth",
            error && "ring-2 ring-destructive/30 focus:ring-destructive/50",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-[12px] text-destructive">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
