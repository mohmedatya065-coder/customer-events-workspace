import { Activity, CheckCircle2, CircleAlert, History, RefreshCw, ServerCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export default function HealthPage() {
  const health = trpc.health.check.useQuery(undefined, { refetchInterval: 30000 });
  const data = health.data;

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <section><p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Runtime observability</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Health</h1><p className="mt-2 text-sm leading-6 text-slate-500">A quick view of the API service, SQL connection, and LLM configuration.</p></section>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <HealthCard title="Service" icon={Activity} healthy={Boolean(data?.service === "healthy")} detail={data ? "tRPC service is responding." : health.isLoading ? "Checking service…" : health.error?.message ?? "Unable to check service."} />
        <HealthCard title="Database" icon={ServerCog} healthy={Boolean(data?.database.connected)} detail={data?.database.detail ?? "Checking database…"} />
        <HealthCard title="LLM" icon={CheckCircle2} healthy={Boolean(data?.llmConfigured)} detail={data?.llmConfigured ? "Built-in LLM credentials are available." : "Mock fallback will be used when needed."} />
        <HealthCard title="Audit activity" icon={History} healthy={Boolean(data)} detail={data ? `${data.auditLogCount} activity records are stored.` : "Checking audit activity…"} />
      </div>
      <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-lg">Last check</CardTitle><CardDescription>{data?.checkedAt ? new Date(data.checkedAt).toLocaleString("en-GB") : "No successful health check yet."}</CardDescription></CardHeader><CardContent><Button variant="outline" onClick={() => health.refetch()} disabled={health.isFetching}><RefreshCw className={`mr-2 size-4 ${health.isFetching ? "animate-spin" : ""}`} />Run health check</Button></CardContent></Card>
    </div>
  );
}

function HealthCard({ title, icon: Icon, healthy, detail }: { title: string; icon: typeof Activity; healthy: boolean; detail: string }) {
  return <Card className="border-slate-200 shadow-sm"><CardHeader className="pb-3"><div className="flex items-center justify-between"><div className={`grid size-10 place-items-center rounded-xl ${healthy ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}><Icon className="size-5" /></div><Badge className={healthy ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-amber-100 text-amber-800 hover:bg-amber-100"}>{healthy ? "Ready" : "Fallback"}</Badge></div><CardTitle className="pt-4 text-base">{title}</CardTitle></CardHeader><CardContent className="text-sm leading-6 text-slate-500">{detail}</CardContent></Card>;
}
