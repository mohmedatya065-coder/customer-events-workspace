import type { Customer, CustomerEvent } from "../drizzle/schema";

export type AssistantMode = "llm" | "mock";

export function parseMetadata(value?: string | null) {
  if (!value?.trim()) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error("Metadata must be valid JSON.");
  }
}

export function normalizeMetadata(value?: string | null) {
  const parsed = parseMetadata(value);
  return parsed === null ? null : JSON.stringify(parsed);
}

export function orderCustomerEventsNewestFirst<T extends Pick<CustomerEvent, "createdAt" | "id">>(items: T[]) {
  return [...items].sort((a, b) => {
    const timeDifference = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return timeDifference || b.id - a.id;
  });
}

export function scopeEventsToCustomer<T extends Pick<CustomerEvent, "customer_id">>(items: T[], customerId: number) {
  return items.filter(item => item.customer_id === customerId);
}

export function buildCustomerContext(customer: Customer, customerEvents: CustomerEvent[]) {
  const timeline = customerEvents.length
    ? customerEvents
        .map(event => {
          const metadata = event.metadata ? `\nMetadata: ${event.metadata}` : "";
          return [
            `Event ID: ${event.id}`,
            `Timestamp: ${new Date(event.createdAt).toISOString()}`,
            `Type: ${event.event_type}`,
            `Description: ${event.description}`,
            metadata,
          ]
            .filter(Boolean)
            .join("\n");
        })
        .join("\n\n---\n\n")
    : "No events are stored for this customer.";

  return `Customer\nID: ${customer.id}\nName: ${customer.name}\nEmail: ${customer.email}\n\nCustomer events (newest first):\n${timeline}`;
}

export function buildMockAnswer(customer: Customer, customerEvents: CustomerEvent[], question: string) {
  if (!customerEvents.length) {
    return `وضع Mock مفعّل. لا توجد أحداث محفوظة للعميل ${customer.name} حتى الآن، لذلك لا يمكنني الإجابة عن السؤال: «${question}».`;
  }

  const latest = customerEvents[0];
  const eventTypes = Array.from(new Set(customerEvents.map(event => event.event_type))).join("، ");
  const recentEvents = customerEvents
    .slice(0, 3)
    .map(event => `- ${event.event_type}: ${event.description}`)
    .join("\n");

  return [
    "وضع Mock مفعّل، لذلك هذه إجابة محلية مبنية فقط على سجل الأحداث دون استدعاء نموذج لغوي.",
    `للعميل ${customer.name} عدد ${customerEvents.length} من الأحداث المسجلة ضمن الأنواع: ${eventTypes}.`,
    `أحدث حدث هو ${latest.event_type} بتاريخ ${new Date(latest.createdAt).toLocaleString("en-GB")}: ${latest.description}.`,
    "أقرب أحداث للسؤال:",
    recentEvents,
    `السؤال المستلم: ${question}`,
  ].join("\n\n");
}
