interface PageToolbarProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageToolbar({
  title,
  description,
  actions,
  children,
}: PageToolbarProps) {
  return (
    <div className="flex h-11 shrink-0 items-center gap-3 border-b bg-background px-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h1 className="truncate text-sm font-semibold">{title}</h1>
          {description && (
            <span className="hidden truncate text-xs text-muted-foreground sm:inline">
              {description}
            </span>
          )}
        </div>
      </div>
      {children}
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
