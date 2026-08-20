import { and, desc, eq, like, lt, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  AuditLog,
  Conversation,
  Customer,
  CustomerEvent,
  audit_logs,
  conversations,
  customers,
  events,
  InsertUser,
  users,
} from "../drizzle/schema";
import { normalizeMetadata, orderCustomerEventsNewestFirst } from "./customerAssistant";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) _db = drizzle(process.env.DATABASE_URL);
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database connection is not available.");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date(), role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user") };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn, role: values.role };
  for (const field of ["name", "email", "loginMethod"] as const) if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

export async function listCustomers(search = "") {
  const db = await requireDb();
  const query = search.trim();
  const where = query ? or(like(customers.name, `%${query}%`), like(customers.email, `%${query}%`)) : undefined;
  return db.select().from(customers).where(where).orderBy(desc(customers.createdAt), desc(customers.id));
}

export async function getCustomerById(id: number): Promise<Customer | undefined> {
  const db = await requireDb();
  return (await db.select().from(customers).where(eq(customers.id, id)).limit(1))[0];
}

export async function createCustomer(input: { name: string; email: string; ownerOpenId?: string | null }) {
  const db = await requireDb();
  const result = await db.insert(customers).values(input);
  return getCustomerById(Number(result[0].insertId));
}

export async function updateCustomer(id: number, input: { name?: string; email?: string }) {
  const db = await requireDb();
  await db.update(customers).set(input).where(eq(customers.id, id));
  return getCustomerById(id);
}

export async function deleteCustomer(id: number) {
  const db = await requireDb();
  await db.delete(customers).where(eq(customers.id, id));
}

export async function listCustomerEvents(input: { customerId: number; limit?: number; eventType?: string; before?: Date }) {
  const db = await requireDb();
  const conditions = [eq(events.customer_id, input.customerId)];
  if (input.eventType) conditions.push(eq(events.event_type, input.eventType));
  if (input.before) conditions.push(lt(events.createdAt, input.before));
  const result = await db.select().from(events).where(and(...conditions)).orderBy(desc(events.createdAt), desc(events.id)).limit(input.limit ?? 50);
  return orderCustomerEventsNewestFirst(result);
}

export async function createCustomerEvent(input: { customer_id: number; event_type: string; description: string; metadata?: string | null }) {
  const db = await requireDb();
  const result = await db.insert(events).values({ ...input, metadata: normalizeMetadata(input.metadata) });
  return (await db.select().from(events).where(eq(events.id, Number(result[0].insertId))).limit(1))[0];
}

export async function updateCustomerEvent(id: number, input: { event_type?: string; description?: string; metadata?: string | null }) {
  const db = await requireDb();
  await db.update(events).set({ ...input, metadata: input.metadata === undefined ? undefined : normalizeMetadata(input.metadata) }).where(eq(events.id, id));
  return (await db.select().from(events).where(eq(events.id, id)).limit(1))[0];
}

export async function deleteCustomerEvent(id: number) {
  const db = await requireDb();
  await db.delete(events).where(eq(events.id, id));
}

export async function createConversation(input: { customer_id: number; question: string; answer: string; mode: string; sourceEventIds: number[] }) {
  const db = await requireDb();
  const result = await db.insert(conversations).values({ ...input, sourceEventIds: JSON.stringify(input.sourceEventIds) });
  return (await db.select().from(conversations).where(eq(conversations.id, Number(result[0].insertId))).limit(1))[0];
}

export async function listConversations(customerId: number, limit = 20): Promise<Conversation[]> {
  const db = await requireDb();
  return db.select().from(conversations).where(eq(conversations.customer_id, customerId)).orderBy(desc(conversations.createdAt), desc(conversations.id)).limit(limit);
}

export async function writeAuditLog(input: { ownerOpenId?: string | null; action: string; entityType: string; entityId?: number | null; metadata?: unknown }) {
  const db = await requireDb();
  await db.insert(audit_logs).values({ ...input, metadata: input.metadata ? JSON.stringify(input.metadata) : null });
}

export async function listAuditLogs(limit = 20): Promise<AuditLog[]> {
  const db = await requireDb();
  return db.select().from(audit_logs).orderBy(desc(audit_logs.createdAt), desc(audit_logs.id)).limit(limit);
}

export async function countAuditLogs() {
  const db = await requireDb();
  const result = await db.execute(sql`SELECT COUNT(*) AS total FROM audit_logs`);
  const rows = result[0] as unknown as Array<{ total: number | string }>;
  return Number(rows[0]?.total ?? 0);
}

export async function databaseHealth() {
  const db = await getDb();
  if (!db) return { connected: false, detail: "DATABASE_URL is unavailable." };
  try { await db.execute(sql`SELECT 1 AS healthy`); return { connected: true, detail: "Database query succeeded." }; }
  catch (error) { return { connected: false, detail: error instanceof Error ? error.message : "Database query failed." }; }
}
