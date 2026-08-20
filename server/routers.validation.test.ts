import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({ databaseHealth: vi.fn(), countAuditLogs: vi.fn() }));

vi.mock("./db", () => ({
  createCustomer: vi.fn(),
  createCustomerEvent: vi.fn(),
  countAuditLogs: mocks.countAuditLogs,
  databaseHealth: mocks.databaseHealth,
  getCustomerById: vi.fn(),
  listCustomerEvents: vi.fn(),
  listCustomers: vi.fn(),
}));

import { appRouter } from "./routers";

function createContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("router validation and health", () => {
  beforeEach(() => {
    mocks.databaseHealth.mockReset();
    mocks.countAuditLogs.mockReset();
  });

  it("rejects invalid customer payloads before persistence", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(caller.customers.create({ name: "A", email: "not-an-email" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("rejects invalid event metadata before persistence", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(
      caller.events.create({
        customer_id: 1,
        event_type: "note",
        description: "A valid description",
        metadata: "not-json",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("reports service and database health", async () => {
    mocks.databaseHealth.mockResolvedValue({ connected: true, detail: "Database query succeeded." });
    mocks.countAuditLogs.mockResolvedValue(3);
    const caller = appRouter.createCaller(createContext());

    const result = await caller.health.check();

    expect(result.service).toBe("healthy");
    expect(result.database).toEqual({ connected: true, detail: "Database query succeeded." });
    expect(typeof result.llmConfigured).toBe("boolean");
    expect(result.auditLogCount).toBe(3);
    expect(result.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("accepts the configured webhook secret and rejects another value", async () => {
    const caller = appRouter.createCaller(createContext());
    const configuredSecret = process.env.WEBHOOK_INGEST_SECRET;

    expect(configuredSecret).toBeTruthy();
    await expect(caller.webhooks.verify({ secret: configuredSecret! })).resolves.toEqual({ accepted: true });
    await expect(caller.webhooks.verify({ secret: "invalid-secret" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
