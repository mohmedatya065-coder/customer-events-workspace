import { index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/** Core user table backing the scaffold authentication flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/** Customer records. Column names intentionally follow the requested contract. */
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  ownerOpenId: varchar("ownerOpenId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Customer event records. Column names intentionally follow the requested contract. */
export const events = mysqlTable(
  "events",
  {
    id: int("id").autoincrement().primaryKey(),
    customer_id: int("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    event_type: varchar("event_type", { length: 100 }).notNull(),
    description: text("description").notNull(),
    metadata: text("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("events_customer_created_idx").on(table.customer_id, table.createdAt)],
);

export const conversations = mysqlTable(
  "conversations",
  {
    id: int("id").autoincrement().primaryKey(),
    customer_id: int("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    mode: varchar("mode", { length: 12 }).notNull(),
    sourceEventIds: text("sourceEventIds").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("conversations_customer_created_idx").on(table.customer_id, table.createdAt)],
);

export const audit_logs = mysqlTable(
  "audit_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerOpenId: varchar("ownerOpenId", { length: 64 }),
    action: varchar("action", { length: 80 }).notNull(),
    entityType: varchar("entityType", { length: 60 }).notNull(),
    entityId: int("entityId"),
    metadata: text("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("audit_logs_owner_created_idx").on(table.ownerOpenId, table.createdAt)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type CustomerEvent = typeof events.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type AuditLog = typeof audit_logs.$inferSelect;
