import {
  Bot,
  Database,
  FileUp,
  HeartPulse,
  PanelLeft,
  Plus,
  UsersRound,
} from "lucide-react";
import { useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { trpc } from "@/lib/trpc";

const primaryLinks = [
  { icon: UsersRound, label: "Customers", path: "/" },
  { icon: Bot, label: "AI Assistant", path: "/assistant" },
  { icon: FileUp, label: "Data Ops", path: "/data-ops" },
  { icon: HeartPulse, label: "Health", path: "/health" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const { data: customers = [] } = trpc.customers.list.useQuery(undefined, {
    retry: 1,
  });
  const collapsed = state === "collapsed";

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-border/70 bg-slate-950 text-slate-100">
        <SidebarHeader className="h-20 justify-center px-3">
          <div className="flex items-center gap-3">
            <button
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-cyan-400 text-slate-950 shadow-sm transition hover:bg-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
            >
              <Database className="size-5" />
            </button>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight">Client Ledger</p>
                <p className="text-[11px] text-slate-400">Events intelligence</p>
              </div>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="gap-4 px-2 pt-2">
          <SidebarMenu>
            {primaryLinks.map(item => {
              const active = item.path === "/" ? location === "/" : location.startsWith(item.path);
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={active}
                    onClick={() => setLocation(item.path)}
                    tooltip={item.label}
                    className="h-10 text-slate-300 hover:bg-slate-800 hover:text-white data-[active=true]:bg-cyan-400 data-[active=true]:text-slate-950"
                  >
                    <item.icon className="size-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>

          <SidebarSeparator className="bg-slate-800" />

          <div className="px-2 group-data-[collapsible=icon]:hidden">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Customers</span>
              <button
                onClick={() => setLocation("/")}
                aria-label="Add customer"
                className="rounded p-1 text-slate-400 transition hover:bg-slate-800 hover:text-cyan-300"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
            <SidebarMenu>
              {customers.slice(0, 8).map(customer => {
                const path = `/customers/${customer.id}`;
                return (
                  <SidebarMenuItem key={customer.id}>
                    <SidebarMenuButton
                      isActive={location === path}
                      onClick={() => setLocation(path)}
                      tooltip={customer.name}
                      className="h-9 text-slate-400 hover:bg-slate-800 hover:text-white data-[active=true]:bg-slate-800 data-[active=true]:text-cyan-300"
                    >
                      <span className="grid size-5 place-items-center rounded-full bg-slate-800 text-[9px] font-bold text-cyan-300">
                        {customer.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="truncate">{customer.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {customers.length === 0 && <p className="px-2 py-3 text-xs leading-5 text-slate-500">Create your first customer to begin.</p>}
            </SidebarMenu>
          </div>
        </SidebarContent>

        <SidebarFooter className="p-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 group-data-[collapsible=icon]:hidden">
            <p className="text-xs font-medium text-slate-200">Customer-scoped answers</p>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">The assistant only receives events for the selected customer.</p>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-h-screen bg-[#f6f8fb]">
        <div className="sticky top-0 z-20 flex h-16 items-center border-b border-slate-200/80 bg-[#f6f8fb]/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="rounded-lg md:hidden" />
            <span className="text-sm font-medium text-slate-700">Customer Events Workspace</span>
          </div>
        </div>
        <main className="mx-auto w-full max-w-[1600px] p-4 md:p-8">{children}</main>
      </SidebarInset>
    </>
  );
}
