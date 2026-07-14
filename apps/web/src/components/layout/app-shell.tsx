"use client";



import { Suspense } from "react";

import Link from "next/link";

import Image from "next/image";

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



const navItems = [

  { href: "/research-graph", label: "Research Graph", icon: Network, tourId: "nav-research-graph" },

  { href: "/paper-generation", label: "Paper Generation", icon: Box, tourId: "nav-paper-generation" },

  { href: "/references", label: "References", icon: BookOpen, tourId: "nav-references" },

  { href: "/agents", label: "Agents", icon: Bot, tourId: "nav-agents" },

];



function AppSidebar() {

  const pathname = usePathname();



  return (

    <Sidebar collapsible="icon">

      <SidebarHeader className="p-3">

        <SidebarMenu>

          <SidebarMenuItem>

            <SidebarMenuButton size="lg" asChild>

              <Link href="/research-graph">

                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">

                  <Image

                    src="/holocron-icon.png"

                    alt="Holocron"

                    width={24}

                    height={24}

                    className="h-6 w-6 object-contain"

                  />

                </span>

                <span className="font-semibold group-data-[collapsible=icon]:hidden">

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



export function AppShell({ children }: { children: React.ReactNode }) {

  return (

    <SidebarProvider>

      <AppSidebar />

      <SidebarInset>

        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">

          <SidebarTrigger className="-ml-1" />

          <Separator orientation="vertical" className="mr-2 h-4" />

        </header>

        <main className="page-enter flex-1 overflow-auto">{children}</main>

      </SidebarInset>

      <OnboardingGate />

    </SidebarProvider>

  );

}

