"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface PageScrollProps {
  children: React.ReactNode;
  className?: string;
  /** Inner content wrapper classes (padding, spacing) */
  contentClassName?: string;
}

/** Scrollable body for pages inside the locked AppShell viewport. */
export function PageScroll({ children, className, contentClassName }: PageScrollProps) {
  return (
    <ScrollArea className={cn("flex-1 min-h-0", className)}>
      <div className={contentClassName}>{children}</div>
    </ScrollArea>
  );
}

/** Full-height page shell: toolbar + scroll region. */
export function PageFrame({
  toolbar,
  children,
  contentClassName,
}: {
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {toolbar}
      <PageScroll contentClassName={contentClassName}>{children}</PageScroll>
    </div>
  );
}
