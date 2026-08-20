import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { buildCustomerContext, buildMockAnswer, normalizeMetadata } from "./customerAssistant";
import { countAuditLogs, createConversation, createCustomer, createCustomerEvent, databaseHealth, deleteCustomer, deleteCustomerEvent, getCustomerById, listAuditLogs, listConversations, listCustomerEvents, listCustomers, updateCustomer, updateCustomerEvent, writeAuditLog } from "./db";
import { invokeLLM, listLLMModels } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";

const id = z.number().int().positive();
const customerSchema = z.object({ name: z.string().trim().min(2).max(160), email: z.string().trim().email().max(320) });
const eventSchema = z.object({ customer_id: id, event_type: z.string().trim().min(2).max(100), description: z.string().trim().min(3).max(4000), metadata: z.string().trim().max(5000).optional().refine(value => !value || (() => { try { JSON.parse(value); return true; } catch { return false; } })(), "metadata must be valid JSON.") });

const csvPreview = (csv: string) => {
  const [header, ...rows] = csv.trim().split(/\r?\n/).filter(Boolean);
  const columns = (header ?? "").split(",").map(value => value.trim().toLowerCase());
  const nameIndex = columns.indexOf("name"), emailIndex = columns.indexOf("email");
  if (nameIndex < 0 || emailIndex < 0) return { accepted: [] as Array<{ name: string; email: string }>, rejected: [{ row: 0, reason: "CSV header must be name,email." }] };
  const emails = new Set<string>(), accepted: Array<{ name: string; email: string }> = [], rejected: Array<{ row: number; reason: string }> = [];
  rows.forEach((row, index) => { const fields = row.split(",").map(value => value.trim()); const parsed = customerSchema.safeParse({ name: fields[nameIndex], email: fields[emailIndex] }); if (!parsed.success) rejected.push({ row: index + 2, reason: "Invalid name or email." }); else if (emails.has(parsed.data.email)) rejected.push({ row: index + 2, reason: "Duplicate email in CSV." }); else { emails.add(parsed.data.email); accepted.push(parsed.data); } });
  return { accepted, rejected };
};

async function requiredCustomer(customerId: number) { const customer = await getCustomerById(customerId); if (!customer) throw new TRPCError({ code: "NOT_FOUND", message: "Customer was not found." }); return customer; }
async function ownedCustomer(customerId: number, openId?: string) { const customer = await requiredCustomer(customerId); if (openId && customer.ownerOpenId && customer.ownerOpenId !== openId) throw new TRPCError({ code: "FORBIDDEN", message: "This customer belongs to a different workspace." }); return customer; }

async function askCustomer(input: { customerId: number; question: string; eventLimit: number; ownerOpenId?: string | null }) {
  const customer = await requiredCustomer(input.customerId);
  const customerEvents = await listCustomerEvents({ customerId: customer.id, limit: input.eventLimit });
  const sourceEventIds = customerEvents.map(event => event.id);
  let answer: string, mode: "llm" | "mock", note: string;
  try {
    if (!process.env.BUILT_IN_FORGE_API_KEY) throw new Error("LLM unavailable");
    const { data: models } = await listLLMModels(); const model = models.find(item => item.id === "gpt-5-mini")?.id ?? models[0]?.id;
    if (!model) throw new Error("No model available");
    const response = await invokeLLM({ model, messages: [{ role: "system", content: "Answer only from the supplied customer events. Never invent facts. Cite event IDs in square brackets." }, { role: "user", content: `${buildCustomerContext(customer, customerEvents)}\n\nQuestion: ${input.question}` }] });
    const content = response.choices[0]?.message.content; if (typeof content !== "string" || !content.trim()) throw new Error("Empty response");
    answer = content.trim(); mode = "llm"; note = "Answer generated from customer-scoped event context.";
  } catch (error) { answer = buildMockAnswer(customer, customerEvents, input.question); mode = "mock"; note = `Mock fallback: ${error instanceof Error ? error.message : "LLM unavailable"}`; }
  await createConversation({ customer_id: customer.id, question: input.question, answer, mode, sourceEventIds });
  await writeAuditLog({ ownerOpenId: input.ownerOpenId, action: "assistant.ask", entityType: "customer", entityId: customer.id, metadata: { mode, sourceEventIds } });
  return { answer, mode, sourceEventIds, note };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({ me: publicProcedure.query(opts => opts.ctx.user), logout: publicProcedure.mutation(({ ctx }) => { ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 }); return { success: true } as const; }) }),
  customers: router({
    list: publicProcedure.input(z.object({ search: z.string().max(120).optional() }).optional()).query(({ input }) => listCustomers(input?.search)),
    get: publicProcedure.input(z.object({ id })).query(({ input, ctx }) => ownedCustomer(input.id, ctx.user?.openId)),
    create: publicProcedure.input(customerSchema).mutation(async ({ input, ctx }) => { const customer = await createCustomer({ ...input, ownerOpenId: ctx.user?.openId }); if (!customer) throw new Error("Creation failed."); await writeAuditLog({ ownerOpenId: ctx.user?.openId, action: "customer.create", entityType: "customer", entityId: customer.id }); return customer; }),
    update: publicProcedure.input(z.object({ id, data: customerSchema.partial() })).mutation(async ({ input, ctx }) => { await ownedCustomer(input.id, ctx.user?.openId); const customer = await updateCustomer(input.id, input.data); await writeAuditLog({ ownerOpenId: ctx.user?.openId, action: "customer.update", entityType: "customer", entityId: input.id, metadata: input.data }); return customer; }),
    delete: publicProcedure.input(z.object({ id })).mutation(async ({ input, ctx }) => { await ownedCustomer(input.id, ctx.user?.openId); await deleteCustomer(input.id); await writeAuditLog({ ownerOpenId: ctx.user?.openId, action: "customer.delete", entityType: "customer", entityId: input.id }); return { success: true } as const; }),
  }),
  events: router({
    list: publicProcedure.input(z.object({ customer_id: id, limit: z.number().int().min(1).max(100).optional(), event_type: z.string().max(100).optional(), before: z.coerce.date().optional() })).query(async ({ input, ctx }) => { await ownedCustomer(input.customer_id, ctx.user?.openId); return listCustomerEvents({ customerId: input.customer_id, limit: input.limit, eventType: input.event_type || undefined, before: input.before }); }),
    create: publicProcedure.input(eventSchema).mutation(async ({ input, ctx }) => { await ownedCustomer(input.customer_id, ctx.user?.openId); normalizeMetadata(input.metadata); const event = await createCustomerEvent(input); if (!event) throw new Error("Creation failed."); await writeAuditLog({ ownerOpenId: ctx.user?.openId, action: "event.create", entityType: "event", entityId: event.id }); return event; }),
    update: publicProcedure.input(z.object({ id, data: eventSchema.omit({ customer_id: true }).partial() })).mutation(async ({ input, ctx }) => { const event = await updateCustomerEvent(input.id, input.data); if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Event was not found." }); await writeAuditLog({ ownerOpenId: ctx.user?.openId, action: "event.update", entityType: "event", entityId: input.id }); return event; }),
    delete: publicProcedure.input(z.object({ id })).mutation(async ({ input, ctx }) => { await deleteCustomerEvent(input.id); await writeAuditLog({ ownerOpenId: ctx.user?.openId, action: "event.delete", entityType: "event", entityId: input.id }); return { success: true } as const; }),
  }),
  assistant: router({ ask: publicProcedure.input(z.object({ customerId: id, question: z.string().trim().min(3).max(1200), eventLimit: z.number().int().min(1).max(30).default(15) })).mutation(async ({ input, ctx }) => { await ownedCustomer(input.customerId, ctx.user?.openId); return askCustomer({ ...input, ownerOpenId: ctx.user?.openId }); }), history: publicProcedure.input(z.object({ customerId: id })).query(async ({ input, ctx }) => { await ownedCustomer(input.customerId, ctx.user?.openId); return listConversations(input.customerId); }) }),
  imports: router({ previewCustomers: publicProcedure.input(z.object({ csv: z.string().max(500000) })).mutation(({ input }) => csvPreview(input.csv)), commitCustomers: publicProcedure.input(z.object({ csv: z.string().max(500000) })).mutation(async ({ input, ctx }) => { const preview = csvPreview(input.csv); const created = []; for (const row of preview.accepted) { try { const customer = await createCustomer({ ...row, ownerOpenId: ctx.user?.openId }); if (customer) created.push(customer.id); } catch { preview.rejected.push({ row: 0, reason: `Email already exists: ${row.email}` }); } } await writeAuditLog({ ownerOpenId: ctx.user?.openId, action: "customers.import", entityType: "customer", metadata: { created: created.length, rejected: preview.rejected.length } }); return { created, rejected: preview.rejected }; }) }),
  webhooks: router({ verify: publicProcedure.input(z.object({ secret: z.string().min(1) })).mutation(({ input }) => { if (!process.env.WEBHOOK_INGEST_SECRET || input.secret !== process.env.WEBHOOK_INGEST_SECRET) throw new TRPCError({ code: "UNAUTHORIZED", message: "Webhook secret is invalid." }); return { accepted: true } as const; }), ingest: publicProcedure.input(eventSchema.extend({ secret: z.string().min(1) })).mutation(async ({ input }) => { if (!process.env.WEBHOOK_INGEST_SECRET || input.secret !== process.env.WEBHOOK_INGEST_SECRET) throw new TRPCError({ code: "UNAUTHORIZED", message: "Webhook secret is invalid." }); await requiredCustomer(input.customer_id); const event = await createCustomerEvent(input); await writeAuditLog({ action: "webhook.ingest", entityType: "event", entityId: event?.id }); return event; }) }),
  audit: router({ list: publicProcedure.query(() => listAuditLogs()) }),
  health: router({ check: publicProcedure.query(async () => ({ service: "healthy" as const, database: await databaseHealth(), llmConfigured: Boolean(process.env.BUILT_IN_FORGE_API_KEY && process.env.BUILT_IN_FORGE_API_URL), auditLogCount: await countAuditLogs(), checkedAt: new Date().toISOString() })) }),
});

export type AppRouter = typeof appRouter;
