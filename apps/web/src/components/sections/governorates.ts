/**
 * Egyptian governorate list, mirrors the `Governorate` union in
 * @pocketdeck/types. Listed here as a runtime value because string-literal
 * unions have no runtime presence. The `satisfies` clause guarantees this
 * stays in sync with the type at compile time.
 */
import type { Governorate } from '@pocketdeck/types';

export const GOVERNORATES = [
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
] as const satisfies readonly Governorate[];
