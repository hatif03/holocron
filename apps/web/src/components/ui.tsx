import { cn } from "@/lib/utils";

export function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "gradient" | "cyan";
  size?: "default" | "sm" | "lg";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-sm font-medium tracking-wide transition-all disabled:opacity-50",
        size === "sm" && "h-8 px-3 text-sm",
        size === "default" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-6 text-base",
        variant === "default" &&
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_12px_rgba(196,30,58,0.35)]",
        variant === "outline" &&
          "border border-border bg-transparent hover:border-primary/60 hover:bg-muted",
        variant === "ghost" && "hover:bg-muted hover:text-accent-cyan",
        variant === "gradient" &&
          "bg-gradient-to-r from-primary to-[#8b1528] text-white hover:from-primary/90 hover:to-[#8b1528]/90 shadow-[0_0_16px_rgba(196,30,58,0.4)]",
        variant === "cyan" &&
          "border border-accent-cyan/60 bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20",
        className
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-sm border border-border bg-muted/40 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/50",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-sm border border-border bg-muted/40 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/50",
        className
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-sm border border-border bg-card text-card-foreground shadow-[0_0_0_1px_rgba(196,30,58,0.06)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Badge({
  className,
  variant = "default",
  children,
}: {
  className?: string;
  variant?: "default" | "success" | "template" | "cyan" | "yellow";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2.5 py-0.5 text-xs font-medium tracking-wide",
        variant === "default" && "bg-primary/15 text-primary",
        variant === "success" && "bg-emerald-500/15 text-emerald-400",
        variant === "template" && "bg-sky-500/15 text-sky-300",
        variant === "cyan" && "bg-accent-cyan/15 text-accent-cyan",
        variant === "yellow" && "bg-accent-yellow/15 text-accent-yellow",
        className
      )}
    >
      {children}
    </span>
  );
}

export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-sm border border-border bg-card p-6 shadow-[0_0_40px_rgba(196,30,58,0.2)] mx-4 page-enter">
        <h2 className="font-display text-xl font-bold mb-4 text-accent-yellow">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {description && (
          <div className="text-xs text-muted-foreground">{description}</div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 rounded-sm border-2 border-transparent transition-colors",
          checked ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 rounded-sm bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-sm border border-border bg-muted/40 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
