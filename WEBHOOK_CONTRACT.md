# Webhook Ingestion Contract

يستقبل التطبيق أحداث العملاء عبر إجراء tRPC: `webhooks.ingest`. في بيئة التطبيق، يمر الإجراء عبر مسار tRPC القياسي `/api/trpc/webhooks.ingest`؛ ويجب استدعاؤه وفق ترميز عميل tRPC أو عبر طبقة تكامل داخلية موثوقة.

## Authentication

يجب تمرير قيمة `secret` المطابقة تمامًا لقيمة الخادم `WEBHOOK_INGEST_SECRET`. لا تُرسل القيمة إلى المتصفح أو سجلات العميل. يفشل الطلب بخطأ `UNAUTHORIZED` إذا كانت القيمة مفقودة أو غير صحيحة.

## Payload

```json
{
  "secret": "<WEBHOOK_INGEST_SECRET>",
  "customer_id": 42,
  "event_type": "payment_received",
  "description": "Invoice INV-1042 was paid successfully.",
  "metadata": "{\"amount\": 120, \"currency\": \"USD\", \"source\": \"n8n\"}"
}
```

| Field | Required | Validation |
|---|---:|---|
| `secret` | Yes | Non-empty and exactly equal to server secret |
| `customer_id` | Yes | Positive integer that references an existing customer |
| `event_type` | Yes | Text between 2 and 100 characters |
| `description` | Yes | Text between 3 and 4,000 characters |
| `metadata` | No | JSON string, maximum 5,000 characters |

## Responses

نجاح الإدخال يعيد الحدث الذي تم إنشاؤه، ويكتب سجل تدقيق باسم `webhook.ingest`. البيانات غير الصحيحة تنتج `BAD_REQUEST`، والعميل غير الموجود ينتج `NOT_FOUND`، والسر غير الصحيح ينتج `UNAUTHORIZED`.

> لا تعتمد على هذا العقد لنقل بيانات حساسة دون طبقة HTTPS وتدوير دوري للسر وحدود معدل مناسبة. هذا الـDemo يوضح التحقق من السر والتدقيق، وليس بوابة تكامل مؤسسية كاملة.
