# PocketDeck — API Contract

Authoritative wire contract between `@pocketdeck/web` (Next.js client) and
`@pocketdeck/api` (Express server). The TypeScript surface lives in
`packages/types` and MUST be imported by both sides — do not duplicate the
shapes. If a downstream change is required, **edit this file and the types
package together**, then notify the integration agent.

All payloads are JSON. Encoding is UTF-8. Prices are integers in EGP.
Dates are ISO-8601 strings.

---

## Base

- Dev base URL (browser): `/api` — proxied by Next.js to `http://localhost:4000`.
- Direct API base URL: `http://localhost:4000`.
- CORS is locked to the web app origin (`http://localhost:3000` in dev,
  `WEB_ORIGIN` in production).
- All routes are prefixed with `/api`.

## Response envelopes

Every successful response:

```json
{ "data": <payload> }
```

Every error response (non-2xx):

```json
{
  "error": {
    "code": "string",
    "message": "Human-readable summary.",
    "errors": [{ "field": "customer.phone", "message": "Phone is required." }]
  }
}
```

- `errors[]` is only populated when `code === "VALIDATION_ERROR"` (HTTP 422).
- All other errors (`NOT_FOUND`, `OUT_OF_STOCK`, `RATE_LIMITED`, `INTERNAL`)
  omit `errors[]`.

## Status codes

| Code | When                                                              |
| ---- | ----------------------------------------------------------------- |
| 200  | Successful GET                                                    |
| 201  | Successful resource creation                                      |
| 400  | Malformed request (bad JSON, wrong content type)                  |
| 404  | Resource not found                                                |
| 409  | Conflict (e.g. out of stock)                                      |
| 422  | Validation error — body failed Joi check, `errors[]` is present   |
| 429  | Rate-limited (POST routes only)                                   |
| 500  | Unhandled server error                                            |

---

## Endpoints

### `GET /api/health`

No body. Always 200.

```ts
ApiSuccessResponse<HealthResponse>
// { data: { status: "ok", service: "pocketdeck-api", uptimeSeconds: 12.3, timestamp: "..." } }
```

### `GET /api/products/:slug`

Returns the full product including `variants[]` (so the configurator has
stock counts).

- `200` → `GetProductResponse`
- `404` → `{ error: { code: "NOT_FOUND", message: "Product not found." } }`

### `POST /api/orders`

Creates a new order and decrements stock for the matching SKU. Rate-limited.

Body — `CreateOrderRequest`:

```ts
{
  productSlug: "pocketdeck",
  selection: { deck, wheel, truck, grip },
  quantity: 1,            // integer >= 1, <= 5
  customer: {
    name: "string, 2..80",
    phone: "Egyptian mobile, /^01[0-2,5]\\d{8}$/",
    address: "string, 5..200",
    governorate: "<Governorate>"
  }
}
```

- `201` → `CreateOrderResponse` (the created order including `id` and `totalEGP`).
- `422` → validation error with `errors[]` listing offending fields.
- `404` → product slug not found.
- `409` → `{ code: "OUT_OF_STOCK", message: "Selected configuration is out of stock." }`.
- `429` → `{ code: "RATE_LIMITED", message: "Too many orders from this IP." }`.

### `GET /api/orders/:id`

Returns the order. 24-character hex Mongo id.

- `200` → `GetOrderResponse`
- `404` → `NOT_FOUND`

### `POST /api/subscribers`

Newsletter signup. Idempotent — submitting the same email twice returns
`201` with the existing record.

Body — `CreateSubscriberRequest`:

```ts
{ email: "valid email, max 120 chars" }
```

- `201` → `CreateSubscriberResponse`
- `422` → validation error.
- `429` → rate-limited.

---

## Validation rules (Joi summary)

| Field                     | Rule                                               |
| ------------------------- | -------------------------------------------------- |
| `productSlug`             | string, lowercase, hyphen-separated, 3..40 chars   |
| `selection.deck`          | one of the `DeckGraphic` literals                  |
| `selection.wheel`         | one of the `WheelColor` literals                   |
| `selection.truck`         | one of the `TruckColor` literals                   |
| `selection.grip`          | one of the `GripPattern` literals                  |
| `quantity`                | integer, 1..5                                      |
| `customer.name`           | string, 2..80, trimmed                             |
| `customer.phone`          | `/^01[0-2,5]\d{8}$/`                               |
| `customer.address`        | string, 5..200, trimmed                            |
| `customer.governorate`    | one of the `Governorate` literals                  |
| `email`                   | RFC email, max 120 chars, lowercased before save   |

Servers MUST trim whitespace and lowercase emails before persisting.

---

## Rate limiting

- POST routes: 10 requests / minute / IP (configurable via `RATE_LIMIT_MAX`).
- GET routes: unrestricted (cached at the edge later).
- Returns `429` with `RATE_LIMITED` code.

## Pricing

`totalEGP = (basePrice + deckModifier) * quantity`.

The server is authoritative — the client sends only the `selection` and
`quantity`. The server recomputes the price from the product document.
Clients displaying a price MUST mirror the same calculation but may not
send their own total in the request.

## Stock

Stock is decremented atomically when an order is created. If the variant
has `stock <= 0` (or `< quantity`), the server returns `409 OUT_OF_STOCK`.
There is no reservation/hold — first POST wins.

## Versioning

This is `v0`. Breaking changes require:

1. Edit this file.
2. Edit `packages/types/src/index.ts`.
3. Note the change in commit message under `BREAKING CHANGE:`.
