/**
 * Joi validation for `CreateOrderRequest`.
 *
 * Every rule mirrors CONTRACT.md's validation table exactly. Joi messages
 * are concise, they surface verbatim in the `errors[].message` field.
 */
import Joi from 'joi';
import type {
  CreateOrderRequest,
  DeckGraphic,
  WheelColor,
  TruckColor,
  GripPattern,
  Governorate,
} from '@pocketdeck/types';

const DECKS: DeckGraphic[] = ['noir', 'sunburst', 'circuit', 'gold-leaf'];
const WHEELS: WheelColor[] = ['bone', 'ember', 'midnight', 'lagoon', 'chrome'];
const TRUCKS: TruckColor[] = ['silver', 'gunmetal', 'rose-gold'];
const GRIPS: GripPattern[] = ['classic', 'tiger', 'topo'];
const GOVERNORATES: Governorate[] = [
  'Cairo',
  'Giza',
  'Alexandria',
  'Qalyubia',
  'Sharqia',
  'Dakahlia',
  'Gharbia',
  'Monufia',
  'Beheira',
  'Kafr El Sheikh',
  'Damietta',
  'Port Said',
  'Ismailia',
  'Suez',
  'North Sinai',
  'South Sinai',
  'Faiyum',
  'Beni Suef',
  'Minya',
  'Asyut',
  'Sohag',
  'Qena',
  'Luxor',
  'Aswan',
  'Red Sea',
  'New Valley',
  'Matrouh',
];

const PHONE_REGEX = /^01[0-2,5]\d{8}$/;

export const createOrderSchema = Joi.object<CreateOrderRequest>({
  productSlug: Joi.string()
    .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .min(3)
    .max(40)
    .required()
    .messages({
      'string.pattern.base': 'productSlug must be lowercase and hyphen-separated.',
      'string.min': 'productSlug must be at least 3 characters.',
      'string.max': 'productSlug must be at most 40 characters.',
      'any.required': 'productSlug is required.',
    }),
  selection: Joi.object({
    deck: Joi.string()
      .valid(...DECKS)
      .required()
      .messages({
        'any.only': 'Invalid deck selection.',
        'any.required': 'Deck is required.',
      }),
    wheel: Joi.string()
      .valid(...WHEELS)
      .required()
      .messages({
        'any.only': 'Invalid wheel selection.',
        'any.required': 'Wheel is required.',
      }),
    truck: Joi.string()
      .valid(...TRUCKS)
      .required()
      .messages({
        'any.only': 'Invalid truck selection.',
        'any.required': 'Truck is required.',
      }),
    grip: Joi.string()
      .valid(...GRIPS)
      .required()
      .messages({
        'any.only': 'Invalid grip selection.',
        'any.required': 'Grip is required.',
      }),
  })
    .required()
    .messages({ 'any.required': 'Selection is required.' }),
  quantity: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .required()
    .messages({
      'number.base': 'Quantity must be a number.',
      'number.integer': 'Quantity must be an integer.',
      'number.min': 'Quantity must be at least 1.',
      'number.max': 'Quantity must be at most 5.',
      'any.required': 'Quantity is required.',
    }),
  customer: Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(80)
      .required()
      .messages({
        'string.empty': 'Name is required.',
        'string.min': 'Name must be at least 2 characters.',
        'string.max': 'Name must be at most 80 characters.',
        'any.required': 'Name is required.',
      }),
    phone: Joi.string()
      .pattern(PHONE_REGEX)
      .required()
      .messages({
        'string.pattern.base':
          'Phone must be a valid Egyptian mobile number.',
        'string.empty': 'Phone is required.',
        'any.required': 'Phone is required.',
      }),
    address: Joi.string()
      .trim()
      .min(5)
      .max(200)
      .required()
      .messages({
        'string.empty': 'Address is required.',
        'string.min': 'Address must be at least 5 characters.',
        'string.max': 'Address must be at most 200 characters.',
        'any.required': 'Address is required.',
      }),
    governorate: Joi.string()
      .valid(...GOVERNORATES)
      .required()
      .messages({
        'any.only': 'Invalid governorate.',
        'any.required': 'Governorate is required.',
      }),
  })
    .required()
    .messages({ 'any.required': 'Customer details are required.' }),
});
