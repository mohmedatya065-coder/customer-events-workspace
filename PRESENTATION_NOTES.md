# FocusKPI Demo Presentation Notes

## One-minute introduction

> I built Customer Events Workspace as a small full-stack AI operations dashboard. It manages customers and event timelines, lets an operator add or update structured events, and answers customer-specific questions using only the selected customer’s event history. The application uses React, TypeScript, tRPC, MySQL with Drizzle, FastAPI-style API validation principles, and Manus built-in LLM integration with a clear Mock fallback.

## Architecture decisions

| Decision | Rationale |
|---|---|
| `customers` + `events` relational model | Preserves a clear one-to-many relationship and makes customer-scoped retrieval efficient. |
| Descending event query + `(customer_id, createdAt)` index | Optimizes the timeline and assistant context for recent events. |
| Server-side LLM call | Keeps credentials out of the browser and centralizes scope control. |
| `sourceEventIds` returned with answers | Makes every answer reviewable against stored evidence. |
| Mock fallback | Preserves a usable demo and transparent behavior if the LLM is unavailable. |
| Conversations + audit log | Provides traceability for AI questions and mutating actions. |
| CSV preview before commit | Validates rows before writing records and surfaces malformed input. |
| Webhook secret | Rejects external event ingestion without the configured server secret. |

## Safe demonstration flow

Create a customer, add two or three events with valid JSON metadata, then ask the assistant about the latest issue or recommended next step. Point out the assistant mode and source event IDs. Next, open Data Ops, demonstrate CSV preview with one malformed row, and explain that the audit log records mutations. Finally, open Health to show database and LLM configuration state.

## Honest limitations

This is a portfolio Demo, not a complete enterprise CRM. A production version would add enforced tenant authorization at every query, rate limiting, signed HTTP webhooks, a robust CSV parser, background jobs, and a complete audit retention policy. Those boundaries are documented rather than hidden.
