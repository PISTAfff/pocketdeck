/**
 * @pocketdeck/types
 *
 * Shared types between the Next.js web app and the Express API.
 * The shape of the wire contract — kept in sync with /CONTRACT.md.
 *
 * Frontend imports these via `@pocketdeck/types`. Backend uses them as the
 * source of truth for Mongoose models and Joi schemas.
 */

// --- Variant axes ---------------------------------------------------------

/** Deck graphic options. Premium decks add a surcharge. */
export type DeckGraphic = 'noir' | 'sunburst' | 'circuit' | 'gold-leaf';

/** Wheel color options. */
export type WheelColor =
  | 'bone'
  | 'ember'
  | 'midnight'
  | 'lagoon'
  | 'chrome';

/** Truck color options. */
export type TruckColor = 'silver' | 'gunmetal' | 'rose-gold';

/** Grip tape pattern options. */
export type GripPattern = 'classic' | 'tiger' | 'topo';

/** Egyptian governorate (subset commonly used for shipping). */
export type Governorate =
  | 'Cairo'
  | 'Giza'
  | 'Alexandria'
  | 'Qalyubia'
  | 'Sharqia'
  | 'Dakahlia'
  | 'Gharbia'
  | 'Monufia'
  | 'Beheira'
  | 'Kafr El Sheikh'
  | 'Damietta'
  | 'Port Said'
  | 'Ismailia'
  | 'Suez'
  | 'North Sinai'
  | 'South Sinai'
  | 'Faiyum'
  | 'Beni Suef'
  | 'Minya'
  | 'Asyut'
  | 'Sohag'
  | 'Qena'
  | 'Luxor'
  | 'Aswan'
  | 'Red Sea'
  | 'New Valley'
  | 'Matrouh';

// --- Product --------------------------------------------------------------

/** A single configurable axis on the product. */
export interface VariantOption<T extends string = string> {
  /** Stable id used by the configurator. */
  value: T;
  /** Display label. */
  label: string;
  /** Hex color for UI swatches. Undefined for graphics/patterns that use a thumbnail. */
  swatchHex?: string;
  /** Optional thumbnail asset path (relative to /public). */
  thumbnail?: string;
  /** Price modifier in EGP (positive or zero). */
  priceModifier: number;
}

/**
 * A specific configuration of the product mapped to a SKU.
 * Stock is tracked per SKU.
 */
export interface Variant {
  /** Stable SKU id. */
  sku: string;
  deck: DeckGraphic;
  wheel: WheelColor;
  truck: TruckColor;
  grip: GripPattern;
  /** Total price in EGP after modifiers (base + deck modifier). */
  price: number;
  /** Available stock. Decremented on order. */
  stock: number;
}

/**
 * The full product document. There is one product (PocketDeck) but the
 * type is generic enough to support a catalog later.
 */
export interface Product {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  basePriceEGP: number;
  /** Available options for each axis. */
  options: {
    deck: VariantOption<DeckGraphic>[];
    wheel: VariantOption<WheelColor>[];
    truck: VariantOption<TruckColor>[];
    grip: VariantOption<GripPattern>[];
  };
  variants: Variant[];
  createdAt: string;
  updatedAt: string;
}

// --- Order ----------------------------------------------------------------

/** The selection a customer made in the configurator. */
export interface ConfigurationSelection {
  deck: DeckGraphic;
  wheel: WheelColor;
  truck: TruckColor;
  grip: GripPattern;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderCustomer {
  name: string;
  phone: string;
  address: string;
  governorate: Governorate;
}

export interface Order {
  id: string;
  productSlug: string;
  selection: ConfigurationSelection;
  sku: string;
  quantity: number;
  totalEGP: number;
  customer: OrderCustomer;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

// --- Subscriber -----------------------------------------------------------

export interface Subscriber {
  id: string;
  email: string;
  createdAt: string;
}

// --- API request / response shapes ---------------------------------------

/** Structured field-level validation error. */
export interface ApiFieldError {
  field: string;
  message: string;
}

/** Envelope for any API failure. `errors` is populated for 422 validations. */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    errors?: ApiFieldError[];
  };
}

export interface ApiSuccessResponse<T> {
  data: T;
}

// GET /api/products/:slug
export type GetProductResponse = ApiSuccessResponse<Product>;

// POST /api/orders
export interface CreateOrderRequest {
  productSlug: string;
  selection: ConfigurationSelection;
  quantity: number;
  customer: OrderCustomer;
}
export type CreateOrderResponse = ApiSuccessResponse<Order>;

// GET /api/orders/:id
export type GetOrderResponse = ApiSuccessResponse<Order>;

// POST /api/subscribers
export interface CreateSubscriberRequest {
  email: string;
}
export type CreateSubscriberResponse = ApiSuccessResponse<Subscriber>;

// GET /api/health
export interface HealthResponse {
  status: 'ok';
  service: 'pocketdeck-api';
  uptimeSeconds: number;
  timestamp: string;
}

// --- Helpers --------------------------------------------------------------

/** Compose a deterministic SKU from a selection. Used by both web and api. */
export function skuFromSelection(slug: string, s: ConfigurationSelection): string {
  return `${slug}-${s.deck}-${s.wheel}-${s.truck}-${s.grip}`.toLowerCase();
}
