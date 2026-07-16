"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  BookOpen,
  Box,
  Network,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { SetupWalkthrough } from "@/components/onboarding/SetupWalkthrough";
import { HolocronLogo } from "@/components/brand/holocron-logo";

const navItems = [
  { href: "/research-graph", label: "Research Graph", icon: Network, tourId: "nav-research-graph" },
  { href: "/paper-generation", label: "Paper Generation", icon: Box, tourId: "nav-paper-generation" },
  { href: "/references", label: "References", icon: BookOpen, tourId: "nav-references" },
  { href: "/agents", label: "Agents", icon: Bot, tourId: "nav-agents" },
];

const routeTitles: Record<string, string> = {
  "/research-graph": "Research Graph",
  "/paper-generation": "Paper Generation",
  "/references": "References",
  "/agents": "Agents",
  "/settings": "Settings",
};

function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/research-graph">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                  <HolocronLogo size={22} className="text-sidebar-foreground" />
                </span>
                <span className="font-display text-lg font-normal tracking-tight group-data-[collapsible=icon]:hidden">
                  Holocron
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const active = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href} id={item.tourId}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem id="nav-settings">
            <SidebarMenuButton asChild isActive={pathname.startsWith("/settings")} tooltip="Settings">
              <Link href="/settings">
                <Settings />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                Theme
              </span>
              <ThemeToggle />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function OnboardingGate() {
  return (
    <Suspense fallback={null}>
      <SetupWalkthrough />
    </Suspense>
  );
}

function MemoryHealthDot() {
  const [status, setStatus] = useState<"ok" | "warn" | "off">("off");

  useEffect(() => {
    fetch("/api/setup/status")
      .then((r) => r.json())
      .then((d) => {
        if (!d.supermemoryKeyConfigured) setStatus("off");
        else if (d.supermemory && d.supermemoryIntegration === "ok") setStatus("ok");
        else if (d.supermemory) setStatus("warn");
        else setStatus("off");
      })
      .catch(() => setStatus("off"));
    const interval = setInterval(() => {
      fetch("/api/setup/status")
        .then((r) => r.json())
        .then((d) => {
          if (!d.supermemory) setStatus("off");
          else if (d.supermemory === "ok" || d.supermemoryIntegration === "ok")
            setStatus("ok");
          else setStatus("warn");
        })
        .catch(() => setStatus("off"));
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const color =
    status === "ok"
      ? "bg-emerald-500"
      : status === "warn"
        ? "bg-amber-500"
        : "bg-muted-foreground/40";

  return (
    <span
      className={`h-1.5 w-1.5 rounded-full shrink-0 ${color}`}
      title={
        status === "ok"
          ? "Memory service connected"
          : status === "warn"
            ? "Memory service degraded"
            : "Memory service unavailable"
      }
    />
  );
}

function ShellHeader() {
  const pathname = usePathname();
  const base =
    navItems.find((item) => pathname.startsWith(item.href))?.href ??
    (pathname.startsWith("/settings") ? "/settings" : "");
  const title = routeTitles[base] ?? "Holocron";

  return (
    <header className="flex h-11 shrink-0 items-center gap-2 border-b px-3">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4" />
      <span className="text-sm font-medium">{title}</span>
      <MemoryHealthDot />
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar />
      <SidebarInset className="flex min-h-0 flex-col overflow-hidden">
        <ShellHeader />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
      </SidebarInset>
      <OnboardingGate />
    </SidebarProvider>
  );
}
