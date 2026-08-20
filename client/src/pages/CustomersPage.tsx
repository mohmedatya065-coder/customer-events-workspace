import { useState } from "react";
import { Plus, Search, UsersRound } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/format";

export default function CustomersPage() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [filter, setFilter] = useState("");
  const { data: customers = [], isLoading, error } = trpc.customers.list.useQuery({ search: filter.trim() || undefined });
  const createCustomer = trpc.customers.create.useMutation({
    onSuccess: customer => {
      toast.success(`${customer.name} was added.`);
      setName("");
      setEmail("");
      utils.customers.list.invalidate();
      setLocation(`/customers/${customer.id}`);
    },
    onError: error => toast.error(error.message),
  });

  const filtered = customers;

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Operations dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Customers</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Create customer records, inspect event timelines, and use the assistant to ask grounded questions about a single customer.</p>
        </div>
        <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-5 py-4 text-sm text-cyan-950">
          <span className="font-semibold">{customers.length}</span> customer{customers.length === 1 ? "" : "s"} in the workspace
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg text-slate-900">Customer directory</CardTitle>
              <CardDescription>Open a customer to view their event timeline.</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input value={filter} onChange={event => setFilter(event.target.value)} placeholder="Search customers" className="h-10 border-slate-200 pl-9" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading && <div className="space-y-3 p-6">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-16 w-full" />)}</div>}
            {error && <p className="p-6 text-sm text-rose-600">Could not load customers: {error.message}</p>}
            {!isLoading && !error && filtered.length === 0 && (
              <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
                <div className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-500"><UsersRound className="size-5" /></div>
                <h2 className="mt-4 font-medium text-slate-900">{customers.length ? "No matching customers" : "No customers yet"}</h2>
                <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">{customers.length ? "Try a different search term." : "Use the form to create the first customer record."}</p>
              </div>
            )}
            {!isLoading && filtered.map(customer => (
              <button key={customer.id} onClick={() => setLocation(`/customers/${customer.id}`)} className="group grid w-full grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-slate-100 px-6 py-4 text-left transition hover:bg-slate-50 last:border-0">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900 group-hover:text-cyan-800">{customer.name}</p>
                  <p className="mt-1 truncate text-sm text-slate-500">{customer.email}</p>
                </div>
                <time className="pt-1 text-xs text-slate-400">{formatDate(customer.createdAt)}</time>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="h-fit border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900">Add customer</CardTitle>
            <CardDescription>The email address must be unique.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={event => {
                event.preventDefault();
                createCustomer.mutate({ name, email });
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="customer-name">Name</Label>
                <Input id="customer-name" value={name} onChange={event => setName(event.target.value)} placeholder="Amina Hassan" required minLength={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-email">Email</Label>
                <Input id="customer-email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="amina@example.com" required />
              </div>
              <Button type="submit" className="w-full bg-slate-950 text-white hover:bg-slate-800" disabled={createCustomer.isPending}>
                <Plus className="mr-2 size-4" />
                {createCustomer.isPending ? "Creating customer…" : "Create customer"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
