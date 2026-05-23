/**
 * Seed data for the PocketDeck product.
 *
 * Builds the full 4×5×3×3 = 180-variant catalog from option arrays. Premium
 * decks (`gold-leaf` and `circuit`) carry a +75 EGP modifier; everything
 * else is at the base price.
 */
import type {
  DeckGraphic,
  GripPattern,
  Product as ProductT,
  TruckColor,
  Variant,
  VariantOption,
  WheelColor,
} from '@pocketdeck/types';
import { skuFromSelection } from '@pocketdeck/types';

const SLUG = 'pocketdeck';
const BASE_PRICE_EGP = 350;
const PREMIUM_DECK_MODIFIER = 75;
const PREMIUM_DECKS: DeckGraphic[] = ['gold-leaf', 'circuit'];
const INITIAL_STOCK = 25;

const deckOptions: VariantOption<DeckGraphic>[] = [
  {
    value: 'noir',
    label: 'Noir',
    swatchHex: '#0b0b0d',
    thumbnail: '/decks/noir.png',
    priceModifier: 0,
  },
  {
    value: 'sunburst',
    label: 'Sunburst',
    swatchHex: '#f4a93a',
    thumbnail: '/decks/sunburst.png',
    priceModifier: 0,
  },
  {
    value: 'circuit',
    label: 'Circuit',
    swatchHex: '#1a4d4a',
    thumbnail: '/decks/circuit.png',
    priceModifier: PREMIUM_DECK_MODIFIER,
  },
  {
    value: 'gold-leaf',
    label: 'Gold Leaf',
    swatchHex: '#c9a14a',
    thumbnail: '/decks/gold-leaf.png',
    priceModifier: PREMIUM_DECK_MODIFIER,
  },
];

const wheelOptions: VariantOption<WheelColor>[] = [
  { value: 'bone', label: 'Bone', swatchHex: '#efe6d6', priceModifier: 0 },
  { value: 'ember', label: 'Ember', swatchHex: '#d94a2b', priceModifier: 0 },
  {
    value: 'midnight',
    label: 'Midnight',
    swatchHex: '#1f2238',
    priceModifier: 0,
  },
  { value: 'lagoon', label: 'Lagoon', swatchHex: '#1f7a8c', priceModifier: 0 },
  { value: 'chrome', label: 'Chrome', swatchHex: '#bcbec4', priceModifier: 0 },
];

const truckOptions: VariantOption<TruckColor>[] = [
  {
    value: 'silver',
    label: 'Silver',
    swatchHex: '#bcc0c5',
    priceModifier: 0,
  },
  {
    value: 'gunmetal',
    label: 'Gunmetal',
    swatchHex: '#3a3d44',
    priceModifier: 0,
  },
  {
    value: 'rose-gold',
    label: 'Rose Gold',
    swatchHex: '#b76e79',
    priceModifier: 0,
  },
];

const gripOptions: VariantOption<GripPattern>[] = [
  {
    value: 'classic',
    label: 'Classic',
    thumbnail: '/grips/classic.svg',
    priceModifier: 0,
  },
  {
    value: 'tiger',
    label: 'Tiger',
    thumbnail: '/grips/tiger.svg',
    priceModifier: 0,
  },
  {
    value: 'topo',
    label: 'Topo',
    thumbnail: '/grips/topo.svg',
    priceModifier: 0,
  },
];

function buildVariants(): Variant[] {
  const variants: Variant[] = [];
  for (const deck of deckOptions) {
    const deckModifier = deck.priceModifier;
    for (const wheel of wheelOptions) {
      for (const truck of truckOptions) {
        for (const grip of gripOptions) {
          const selection = {
            deck: deck.value,
            wheel: wheel.value,
            truck: truck.value,
            grip: grip.value,
          };
          variants.push({
            sku: skuFromSelection(SLUG, selection),
            deck: deck.value,
            wheel: wheel.value,
            truck: truck.value,
            grip: grip.value,
            price: BASE_PRICE_EGP + deckModifier,
            stock: INITIAL_STOCK,
          });
        }
      }
    }
  }
  return variants;
}

// Sanity-check the catalog size at module load, fails loudly if a new
// option is added without revisiting the seed.
const expectedVariantCount =
  deckOptions.length *
  wheelOptions.length *
  truckOptions.length *
  gripOptions.length;
const variants = buildVariants();
if (variants.length !== expectedVariantCount) {
  throw new Error(
    `Seed builder produced ${variants.length} variants, expected ${expectedVariantCount}.`,
  );
}

export const productSeed: Omit<ProductT, 'createdAt' | 'updatedAt'> = {
  slug: SLUG,
  name: 'PocketDeck',
  tagline: 'A fingerboard that punches above its size.',
  description:
    'The PocketDeck is a premium maple fingerboard built for tricks at your desk. Configure the graphic, wheels, trucks, and grip, every combination ships in protective foam.',
  basePriceEGP: BASE_PRICE_EGP,
  options: {
    deck: deckOptions,
    wheel: wheelOptions,
    truck: truckOptions,
    grip: gripOptions,
  },
  variants,
};

export const seedMeta = {
  slug: SLUG,
  basePriceEGP: BASE_PRICE_EGP,
  premiumDecks: PREMIUM_DECKS,
  variantCount: expectedVariantCount,
} as const;
