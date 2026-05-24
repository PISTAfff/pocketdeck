/**
 * Document → wire-shape serializers.
 *
 * Mongoose documents need a deliberate JSON conversion before they leave
 * the API: `_id` becomes `id`, `__v` is stripped, and the type is
 * narrowed to the public `@pocketdeck/types` surface. Routes used to do
 * `doc.toJSON() as unknown as OrderT` everywhere — this module is the
 * single place where the cast lives, so any future shape drift surfaces
 * in one file instead of six.
 */
import type { Order as OrderT } from '@pocketdeck/types';
import type { OrderDoc } from '../models/Order.js';

export function serializeOrder(doc: OrderDoc): OrderT {
  return doc.toJSON() as unknown as OrderT;
}
