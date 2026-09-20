/**
 * Unit tables: common metric / US. Convert only within the same dimension.
 */

export type Dimension = 'volume' | 'mass' | 'count' | 'other';

interface UnitDef {
  id: string;
  dimension: Dimension;
  /** Factor to canonical unit within dimension (ml for volume, g for mass, 1 for count) */
  toCanonical: number;
}

const UNITS: Record<string, UnitDef> = {
  milliliter: { id: 'milliliter', dimension: 'volume', toCanonical: 1 },
  liter: { id: 'liter', dimension: 'volume', toCanonical: 1000 },
  teaspoon: { id: 'teaspoon', dimension: 'volume', toCanonical: 4.92892 },
  tablespoon: { id: 'tablespoon', dimension: 'volume', toCanonical: 14.7868 },
  'fluid ounce': { id: 'fluid ounce', dimension: 'volume', toCanonical: 29.5735 },
  cup: { id: 'cup', dimension: 'volume', toCanonical: 236.588 },
  pint: { id: 'pint', dimension: 'volume', toCanonical: 473.176 },
  quart: { id: 'quart', dimension: 'volume', toCanonical: 946.353 },
  gallon: { id: 'gallon', dimension: 'volume', toCanonical: 3785.41 },
  gram: { id: 'gram', dimension: 'mass', toCanonical: 1 },
  kilogram: { id: 'kilogram', dimension: 'mass', toCanonical: 1000 },
  ounce: { id: 'ounce', dimension: 'mass', toCanonical: 28.3495 },
  pound: { id: 'pound', dimension: 'mass', toCanonical: 453.592 },
  pinch: { id: 'pinch', dimension: 'other', toCanonical: 1 },
  dash: { id: 'dash', dimension: 'other', toCanonical: 1 },
  clove: { id: 'clove', dimension: 'count', toCanonical: 1 },
  slice: { id: 'slice', dimension: 'count', toCanonical: 1 },
  piece: { id: 'piece', dimension: 'count', toCanonical: 1 },
  can: { id: 'can', dimension: 'count', toCanonical: 1 },
  package: { id: 'package', dimension: 'count', toCanonical: 1 },
};

export function getUnit(id: string | null | undefined): UnitDef | null {
  if (!id) return null;
  return UNITS[id.toLowerCase()] ?? null;
}

export function sameDimension(a: string | null, b: string | null): boolean {
  const ua = getUnit(a);
  const ub = getUnit(b);
  if (!ua || !ub) return false;
  if (ua.dimension === 'other' || ub.dimension === 'other') return false;
  return ua.dimension === ub.dimension;
}

/**
 * Convert quantity between units of the same dimension.
 * Returns null if conversion is not possible.
 */
export function convertQuantity(
  qty: number,
  fromUnit: string,
  toUnit: string
): number | null {
  const from = getUnit(fromUnit);
  const to = getUnit(toUnit);
  if (!from || !to) return null;
  if (from.dimension !== to.dimension) return null;
  if (from.dimension === 'other') return null;
  if (from.dimension === 'count' && from.id !== to.id) return null;
  const canonical = qty * from.toCanonical;
  return canonical / to.toCanonical;
}

export function listUnits(dimension?: Dimension): string[] {
  return Object.values(UNITS)
    .filter((u) => !dimension || u.dimension === dimension)
    .map((u) => u.id);
}
