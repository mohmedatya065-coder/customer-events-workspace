import { useEffect, useMemo, useState } from "react";
import { Bot, MessageSquareText, Send, ShieldCheck, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

export default function AssistantPage() {
  const [location] = useLocation();
  const customersQuery = trpc.customers.list.useQuery();
  const customers = customersQuery.data ?? [];
  const customerFromUrl = useMemo(() => new URLSearchParams(location.split("?")[1] ?? "").get("customer"), [location]);
  const [customerId, setCustomerId] = useState<string>("");
  const [question, setQuestion] = useState("");
  const utils = trpc.useUtils();
  const history = trpc.assistant.history.useQuery({ customerId: Number(customerId || 0) }, { enabled: Boolean(customerId) });
  const ask = trpc.assistant.ask.useMutation({ onSuccess: () => { utils.assistant.history.invalidate({ customerId: Number(customerId) }); setQuestion(""); }, onError: error => toast.error(error.message) });

  useEffect(() => {
    if (customerFromUrl && customers.some(customer => customer.id === Number(customerFromUrl))) {
      setCustomerId(customerFromUrl);
    } else if (!customerId && customers[0]) {
      setCustomerId(String(customers[0].id));
    }
  }, [customerFromUrl, customers, customerId]);

  const selectedCustomer = customers.find(customer => customer.id === Number(customerId));
  const answer = ask.data;

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 px-6 py-8 text-white md:px-8">
        <div className="flex items-start gap-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-cyan-400 text-slate-950"><Bot className="size-5" /></div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Customer-scoped intelligence</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Ask the assistant</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">The assistant retrieves only events for the selected customer. It will use the built-in LLM when available and transparently switch to Mock mode if it is unavailable.</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><MessageSquareText className="size-5 text-cyan-700" />New question</CardTitle>
            <CardDescription>Questions are grounded in the selected customer’s stored events.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-5"
              onSubmit={event => {
                event.preventDefault();
                if (!customerId) return toast.error("Create or select a customer first.");
                ask.mutate({ customerId: Number(customerId), question, eventLimit: 15 });
              }}
            >
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select value={customerId} onValueChange={setCustomerId} disabled={!customers.length}>
                  <SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger>
                  <SelectContent>{customers.map(customer => <SelectItem key={customer.id} value={String(customer.id)}>{customer.name} — {customer.email}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assistant-question">Question</Label>
                <Textarea id="assistant-question" value={question} onChange={event => setQuestion(event.target.value)} placeholder="What are the latest issues and next steps for this customer?" required minLength={3} className="min-h-36 resize-y" />
              </div>
              <Button type="submit" className="bg-slate-950 text-white hover:bg-slate-800" disabled={!selectedCustomer || ask.isPending}><Send className="mr-2 size-4" />{ask.isPending ? "Reviewing events…" : "Ask assistant"}</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="h-fit border-cyan-100 bg-cyan-50/60 shadow-none">
          <CardContent className="p-5">
            <ShieldCheck className="size-5 text-cyan-700" />
            <h2 className="mt-3 font-semibold text-slate-900">Scope guard</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">The context is built server-side from one customer ID. The answer includes event IDs used as its evidence.</p>
          </CardContent>
        </Card>
      </div>

      {answer && (
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-slate-50/60">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="size-5 text-cyan-700" />Assistant answer</CardTitle><CardDescription>{selectedCustomer?.name ?? "Selected customer"}</CardDescription></div>
              <Badge className={answer.mode === "llm" ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-amber-100 text-amber-800 hover:bg-amber-100"}>{answer.mode === "llm" ? "LLM mode" : "Mock mode"}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-6">
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{answer.answer}</p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Runtime note</p><p className="mt-1 text-sm text-slate-600">{answer.note}</p></div>
            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Source event IDs</p><div className="mt-2 flex flex-wrap gap-2">{answer.sourceEventIds.length ? answer.sourceEventIds.map(id => <Badge key={id} variant="secondary">#{id}</Badge>) : <span className="text-sm text-slate-500">No events available.</span>}</div></div>
          </CardContent>
        </Card>
      )}
      {customerId && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader><CardTitle className="text-lg">Conversation history</CardTitle><CardDescription>Saved server-side per customer, including the answer mode and evidence IDs.</CardDescription></CardHeader>
          <CardContent className="divide-y divide-slate-100">
            {history.isLoading && <p className="py-4 text-sm text-slate-500">Loading conversation history…</p>}
            {!history.isLoading && history.data?.map(item => <article key={item.id} className="py-4 first:pt-0"><div className="flex flex-wrap justify-between gap-2"><p className="font-medium text-slate-800">{item.question}</p><Badge variant="secondary">{item.mode}</Badge></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.answer}</p><p className="mt-2 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString("en-GB")} · events {item.sourceEventIds}</p></article>)}
            {!history.isLoading && !history.data?.length && <p className="py-4 text-sm text-slate-500">No saved questions for this customer yet.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
