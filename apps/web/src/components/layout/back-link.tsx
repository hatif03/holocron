"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackLinkProps {
  href: string;
  label?: string;
  className?: string;
}

export function BackLink({ href, label, className }: BackLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 p-1 rounded hover:bg-muted text-muted-foreground shrink-0",
        className
      )}
      title={label ? `Back to ${label}` : "Go back"}
    >
      <ArrowLeft className="h-5 w-5" />
      {label && (
        <span className="text-sm hidden sm:inline">{label}</span>
      )}
    </Link>
  );
}
