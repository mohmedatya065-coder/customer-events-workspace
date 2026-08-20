import { useState } from "react";
import { FileUp, History, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

const sample = "name,email\nAmina Hassan,amina@example.com\nOmar Ali,omar@example.com";

export default function DataOpsPage() {
  const utils = trpc.useUtils();
  const [csv, setCsv] = useState(sample);
  const preview = trpc.imports.previewCustomers.useMutation({ onError: error => toast.error(error.message) });
  const commit = trpc.imports.commitCustomers.useMutation({ onSuccess: result => { toast.success(`Created ${result.created.length} customers.`); utils.customers.list.invalidate(); utils.audit.list.invalidate(); } , onError: error => toast.error(error.message) });
  const audit = trpc.audit.list.useQuery();
  return <div className="mx-auto max-w-6xl space-y-7">
    <section><p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Data operations</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Import & activity</h1><p className="mt-2 text-sm leading-6 text-slate-500">Validate a customer CSV before creating records, then review recent audit activity.</p></section>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><FileUp className="size-5 text-cyan-700"/>Customer CSV import</CardTitle><CardDescription>Required header: <code>name,email</code>. The preview detects malformed or duplicated rows.</CardDescription></CardHeader><CardContent className="space-y-4"><Textarea className="min-h-64 font-mono text-xs" value={csv} onChange={event => setCsv(event.target.value)} /><div className="flex flex-wrap gap-3"><Button variant="outline" onClick={() => preview.mutate({ csv })} disabled={preview.isPending}>Preview CSV</Button><Button className="bg-slate-950 text-white hover:bg-slate-800" onClick={() => commit.mutate({ csv })} disabled={!preview.data || !preview.data.accepted.length || commit.isPending}><Upload className="mr-2 size-4"/>Commit accepted rows</Button></div>{preview.data && <div className="grid gap-3 sm:grid-cols-2"><Summary title="Accepted" value={preview.data.accepted.length} className="text-emerald-700" /><Summary title="Rejected" value={preview.data.rejected.length} className="text-rose-700" /></div>}{preview.data?.rejected.length ? <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">{preview.data.rejected.map(item => <p key={`${item.row}-${item.reason}`}>Row {item.row}: {item.reason}</p>)}</div> : null}</CardContent></Card>
      <Card className="h-fit border-cyan-100 bg-cyan-50/60 shadow-none"><CardContent className="p-5"><ShieldCheck className="size-5 text-cyan-700"/><h2 className="mt-3 font-semibold text-slate-900">Webhook contract</h2><p className="mt-2 text-sm leading-6 text-slate-600">The server accepts a customer ID, event type, description, optional JSON metadata, and a configured secret. Invalid secrets are rejected before event creation.</p></CardContent></Card>
    </div>
    <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><History className="size-5 text-cyan-700"/>Recent activity</CardTitle><CardDescription>Server-side audit records for mutations and assistant questions.</CardDescription></CardHeader><CardContent>{audit.isLoading ? <p className="text-sm text-slate-500">Loading activity…</p> : <div className="divide-y divide-slate-100">{audit.data?.map(log => <div key={log.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium text-slate-800">{log.action}</p><p className="text-xs text-slate-500">{log.entityType}{log.entityId ? ` #${log.entityId}` : ""}</p></div><Badge variant="secondary">{new Date(log.createdAt).toLocaleString("en-GB")}</Badge></div>)}{!audit.data?.length && <p className="py-4 text-sm text-slate-500">No activity recorded yet.</p>}</div>}</CardContent></Card>
  </div>;
}

function Summary({ title, value, className }: { title: string; value: number; className: string }) { return <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p><p className={`mt-1 text-2xl font-semibold ${className}`}>{value}</p></div>; }
