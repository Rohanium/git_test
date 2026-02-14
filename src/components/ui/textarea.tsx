import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-foreground/80">
            {label}
          </label>
        )}
        <textarea
          id={id}
          className={cn(
            "min-h-[80px] w-full rounded-xl border-0 bg-muted/60 px-3.5 py-2.5 text-[13px] ring-offset-background placeholder:text-muted-foreground/50 focus:bg-muted focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 transition-smooth",
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
Textarea.displayName = "Textarea";
