import { describe, expect, it } from "vitest";
import type { Customer, CustomerEvent } from "../drizzle/schema";
import {
  buildCustomerContext,
  buildMockAnswer,
  normalizeMetadata,
  orderCustomerEventsNewestFirst,
  scopeEventsToCustomer,
} from "./customerAssistant";

const customer: Customer = {
  id: 7,
  name: "Amina Hassan",
  email: "amina@example.com",
  createdAt: new Date("2026-08-01T10:00:00Z"),
};

const event = (id: number, customer_id: number, createdAt: string, description: string): CustomerEvent => ({
  id,
  customer_id,
  event_type: "support_ticket",
  description,
  metadata: null,
  createdAt: new Date(createdAt),
});

describe("customer event helpers", () => {
  it("normalizes valid JSON metadata and rejects invalid JSON", () => {
    expect(normalizeMetadata('{ "priority": "high" }')).toBe('{"priority":"high"}');
    expect(() => normalizeMetadata("not-json")).toThrow("Metadata must be valid JSON.");
  });

  it("keeps events scoped to one customer and orders them newest first", () => {
    const first = event(1, 7, "2026-08-01T09:00:00Z", "Older customer event");
    const second = event(2, 7, "2026-08-02T09:00:00Z", "Newer customer event");
    const otherCustomer = event(3, 9, "2026-08-03T09:00:00Z", "Must not leak");

    const scoped = scopeEventsToCustomer([first, otherCustomer, second], 7);
    expect(orderCustomerEventsNewestFirst(scoped).map(item => item.id)).toEqual([2, 1]);
    expect(scoped.some(item => item.customer_id !== 7)).toBe(false);
  });

  it("builds a mock answer and prompt from only the supplied event set", () => {
    const events = [event(2, 7, "2026-08-02T09:00:00Z", "Newer customer event")];
    const context = buildCustomerContext(customer, events);
    const answer = buildMockAnswer(customer, events, "What happened last?");

    expect(context).toContain("Newer customer event");
    expect(answer).toContain("وضع Mock مفعّل");
    expect(answer).toContain("Newer customer event");
  });
});
