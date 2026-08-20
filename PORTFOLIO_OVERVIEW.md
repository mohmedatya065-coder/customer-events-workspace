# Customer Events Workspace

**Customer Events Workspace** is a full-stack AI operations demo designed to demonstrate customer-scoped retrieval, event management, and auditable AI-assisted workflows.

## Why this project

The application addresses a common operations problem: customer context is spread across event streams, while support and account teams need grounded answers quickly. The product centralizes that context in a relational model and allows an operator to ask questions about one customer at a time.

## Technical highlights

| Area | Implementation |
|---|---|
| Frontend | React, TypeScript, Tailwind CSS, responsive Dashboard UI |
| API | tRPC procedures with Zod request validation |
| Database | MySQL/TiDB with Drizzle ORM and indexed customer event timelines |
| AI | Server-side Manus built-in LLM integration with a transparent Mock fallback |
| Grounding | Assistant context is built from the selected customer only and returns source event IDs |
| Reliability | Vitest validation coverage, health reporting, typed contracts, reproducible build |
| Operations | CSV preview/import, audit activity, signed-secret webhook contract, conversation history |

## Demonstration flow

1. Create a customer from the Customers page.
2. Add one or more structured timeline events with optional JSON metadata.
3. Open the AI Assistant, select the customer, and ask for the latest issue or a suggested next step.
4. Inspect the assistant mode and source event IDs to review the evidence behind the answer.
5. Open Data Ops to preview a customer CSV and inspect audit activity.
6. Open Health to verify service, database, LLM fallback state, and audit metrics.

## Design decisions

- The `customers` and `events` tables retain exact field names required by the product brief.
- Events are retrieved newest-first with a composite index on customer and creation time.
- The LLM is invoked on the server; client code never receives service credentials.
- Mock mode is intentionally labeled so the UI never presents an unavailable model as a real AI answer.
- The webhook contract validates a configured secret before recording an external event.

## Local run

```bash
pnpm install
pnpm dev
pnpm test
pnpm check
```

## Deliberate boundaries

This is a portfolio demo, not an enterprise CRM. Production hardening would include full multi-tenant enforcement on every list query, rate limiting, a dedicated signed HTTP webhook route, background processing, complete audit retention, and broader integration tests. Those follow-on items are deliberately documented rather than implied as complete.
