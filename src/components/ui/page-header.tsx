interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  helpText?: string;
}

export function PageHeader({ title, description, actions, helpText }: PageHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          {description && (
            <p className="text-[13px] text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {helpText && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-3 text-[13px] text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
          {helpText}
        </div>
      )}
    </div>
  );
}
