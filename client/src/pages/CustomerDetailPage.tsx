import { useState } from "react";
import { ArrowLeft, CalendarClock, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { formatDate, prettyMetadata } from "@/lib/format";

export default function CustomerDetailPage({ id }: { id: number }) {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: customer, isLoading: customerLoading, error: customerError } = trpc.customers.get.useQuery({ id });
  const { data: events = [], isLoading: eventsLoading, error: eventsError } = trpc.events.list.useQuery({ customer_id: id });
  const [eventType, setEventType] = useState("");
  const [description, setDescription] = useState("");
  const [metadata, setMetadata] = useState("");
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const createEvent = trpc.events.create.useMutation({
    onSuccess: () => {
      toast.success("Event added to the customer timeline.");
      setEventType("");
      setDescription("");
      setMetadata("");
      utils.events.list.invalidate({ customer_id: id });
    },
    onError: error => toast.error(error.message),
  });
  const updateEvent = trpc.events.update.useMutation({ onSuccess: () => { toast.success("Event updated."); resetForm(); utils.events.list.invalidate({ customer_id: id }); }, onError: error => toast.error(error.message) });
  const deleteEvent = trpc.events.delete.useMutation({ onSuccess: () => { toast.success("Event deleted."); utils.events.list.invalidate({ customer_id: id }); }, onError: error => toast.error(error.message) });
  const deleteCustomer = trpc.customers.delete.useMutation({ onSuccess: () => { toast.success("Customer deleted."); utils.customers.list.invalidate(); setLocation("/"); }, onError: error => toast.error(error.message) });
  const resetForm = () => { setEventType(""); setDescription(""); setMetadata(""); setEditingEventId(null); };

  if (customerLoading) return <p className="p-6 text-sm text-slate-500">Loading customer…</p>;
  if (customerError || !customer) return <Card><CardContent className="p-8 text-sm text-rose-600">Customer not found.</CardContent></Card>;

  return (
    <div className="space-y-7">
      <button onClick={() => setLocation("/")} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-950"><ArrowLeft className="size-4" />Back to customers</button>
      <section className="flex flex-col justify-between gap-5 rounded-3xl bg-slate-950 px-6 py-7 text-white md:flex-row md:items-end md:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Customer profile</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{customer.name}</h1>
          <p className="mt-2 text-sm text-slate-300">{customer.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm"><span className="font-semibold text-cyan-300">{events.length}</span> events</div>
          <Button onClick={() => setLocation(`/assistant?customer=${customer.id}`)} className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"><Sparkles className="mr-2 size-4" />Ask assistant</Button>
          <Button variant="outline" onClick={() => { if (confirm(`Delete ${customer.name} and all of its events?`)) deleteCustomer.mutate({ id: customer.id }); }} className="border-rose-400 bg-transparent text-rose-200 hover:bg-rose-500 hover:text-white"><Trash2 className="size-4" /></Button>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-lg"><CalendarClock className="size-5 text-cyan-700" />Event timeline</CardTitle>
            <CardDescription>Events are returned newest first from the database.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {eventsLoading && <p className="p-6 text-sm text-slate-500">Loading events…</p>}
            {eventsError && <p className="p-6 text-sm text-rose-600">Could not load events: {eventsError.message}</p>}
            {!eventsLoading && !eventsError && events.length === 0 && <p className="p-8 text-sm text-slate-500">No events have been recorded for this customer.</p>}
            {events.map(event => {
              const eventMetadata = prettyMetadata(event.metadata);
              return (
                <article key={event.id} className="border-b border-slate-100 px-6 py-5 last:border-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <Badge variant="secondary" className="bg-cyan-50 font-medium text-cyan-800 hover:bg-cyan-50">{event.event_type}</Badge>
                    <div className="flex items-center gap-2"><time className="text-xs text-slate-400">{formatDate(event.createdAt)}</time><button aria-label="Edit event" onClick={() => { setEditingEventId(event.id); setEventType(event.event_type); setDescription(event.description); setMetadata(event.metadata ?? ""); }} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-cyan-700"><Pencil className="size-3.5"/></button><button aria-label="Delete event" onClick={() => { if (confirm("Delete this event?")) deleteEvent.mutate({ id: event.id }); }} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="size-3.5"/></button></div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{event.description}</p>
                  {eventMetadata && <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950 p-3 text-xs leading-5 text-cyan-100">{eventMetadata}</pre>}
                </article>
              );
            })}
          </CardContent>
        </Card>

        <Card className="h-fit border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{editingEventId ? "Edit event" : "Add event"}</CardTitle>
            <CardDescription>Metadata is optional but must be valid JSON.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={event => {
                event.preventDefault();
                if (editingEventId) updateEvent.mutate({ id: editingEventId, data: { event_type: eventType, description, metadata: metadata || undefined } });
                else createEvent.mutate({ customer_id: id, event_type: eventType, description, metadata: metadata || undefined });
              }}
            >
              <div className="space-y-2"><Label htmlFor="event-type">event_type</Label><Input id="event-type" value={eventType} onChange={event => setEventType(event.target.value)} placeholder="support_ticket" required minLength={2} /></div>
              <div className="space-y-2"><Label htmlFor="event-description">description</Label><Textarea id="event-description" value={description} onChange={event => setDescription(event.target.value)} placeholder="Customer requested a billing clarification…" required minLength={3} className="min-h-28 resize-y" /></div>
              <div className="space-y-2"><Label htmlFor="event-metadata">metadata <span className="font-normal text-slate-400">(optional JSON)</span></Label><Textarea id="event-metadata" value={metadata} onChange={event => setMetadata(event.target.value)} placeholder={'{ "channel": "email", "priority": "high" }'} className="min-h-24 font-mono text-xs" /></div>
              <div className="flex gap-2"><Button type="submit" className="flex-1 bg-slate-950 text-white hover:bg-slate-800" disabled={createEvent.isPending || updateEvent.isPending}><Plus className="mr-2 size-4" />{editingEventId ? "Save changes" : createEvent.isPending ? "Adding event…" : "Add event"}</Button>{editingEventId && <Button type="button" variant="outline" onClick={resetForm}><X className="size-4" /></Button>}</div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
