import type { Ingredient, ScaleMode } from '../domain/types';
import { newId } from '../domain/ids';

/** Common culinary units (metric + US). Order: longer aliases first. */
const UNIT_ALIASES: Array<{ unit: string; aliases: string[] }> = [
  { unit: 'tablespoon', aliases: ['tablespoons', 'tablespoon', 'tbsps', 'tbsp', 'tbs', 'T'] },
  { unit: 'teaspoon', aliases: ['teaspoons', 'teaspoon', 'tsps', 'tsp', 't'] },
  { unit: 'cup', aliases: ['cups', 'cup', 'c'] },
  { unit: 'fluid ounce', aliases: ['fluid ounces', 'fl oz', 'fl. oz.', 'floz'] },
  { unit: 'ounce', aliases: ['ounces', 'ounce', 'oz'] },
  { unit: 'pound', aliases: ['pounds', 'pound', 'lbs', 'lb'] },
  { unit: 'gram', aliases: ['grams', 'gram', 'g'] },
  { unit: 'kilogram', aliases: ['kilograms', 'kilogram', 'kg'] },
  { unit: 'milliliter', aliases: ['milliliters', 'millilitre', 'millilitres', 'ml'] },
  { unit: 'liter', aliases: ['liters', 'litre', 'litres', 'l'] },
  { unit: 'pint', aliases: ['pints', 'pint', 'pt'] },
  { unit: 'quart', aliases: ['quarts', 'quart', 'qt'] },
  { unit: 'gallon', aliases: ['gallons', 'gallon', 'gal'] },
  { unit: 'pinch', aliases: ['pinches', 'pinch'] },
  { unit: 'dash', aliases: ['dashes', 'dash'] },
  { unit: 'clove', aliases: ['cloves', 'clove'] },
  { unit: 'slice', aliases: ['slices', 'slice'] },
  { unit: 'piece', aliases: ['pieces', 'piece', 'pcs', 'pc'] },
  { unit: 'can', aliases: ['cans', 'can'] },
  { unit: 'package', aliases: ['packages', 'package', 'pkg'] },
];

const FIXED_HINTS =
  /\b(to taste|as needed|pinch|dash|garnish|optional|a little|handful|sprinkle)\b/i;

function parseQuantity(raw: string): { qty: number | null; rest: string } {
  const s = raw.trim();
  // mixed number: 1 1/2
  let m = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)\b(.*)$/);
  if (m) {
    const qty = parseInt(m[1], 10) + parseInt(m[2], 10) / parseInt(m[3], 10);
    return { qty, rest: m[4].trim() };
  }
  // simple fraction: 1/2
  m = s.match(/^(\d+)\s*\/\s*(\d+)\b(.*)$/);
  if (m) {
    const qty = parseInt(m[1], 10) / parseInt(m[2], 10);
    return { qty, rest: m[3].trim() };
  }
  // decimal / integer
  m = s.match(/^(\d+(?:\.\d+)?)\b(.*)$/);
  if (m) {
    return { qty: parseFloat(m[1]), rest: m[2].trim() };
  }
  return { qty: null, rest: s };
}

function parseUnit(rest: string): { unit: string | null; rest: string } {
  for (const { unit, aliases } of UNIT_ALIASES) {
    for (const alias of aliases) {
      const re = new RegExp(`^${escapeRegExp(alias)}\\b[. ]*(.*)$`, 'i');
      const m = rest.match(re);
      if (m) {
        return { unit, rest: m[1].trim() };
      }
    }
  }
  return { unit: null, rest };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function splitNote(foodPart: string): { food: string; note: string | null } {
  // "salt, preferably kosher" or "butter (softened)"
  const paren = foodPart.match(/^(.*?)\s*\((.+)\)\s*$/);
  if (paren) {
    return { food: paren[1].trim(), note: paren[2].trim() };
  }
  const comma = foodPart.indexOf(',');
  if (comma > 0) {
    return {
      food: foodPart.slice(0, comma).trim(),
      note: foodPart.slice(comma + 1).trim(),
    };
  }
  return { food: foodPart.trim(), note: null };
}

function inferScaleMode(raw: string, qty: number | null, unit: string | null): ScaleMode {
  if (FIXED_HINTS.test(raw)) return 'fixed';
  if (unit === 'pinch' || unit === 'dash') return 'fixed';
  if (qty === null) return 'fixed';
  return 'linear';
}

/**
 * Parse a single ingredient line into structured fields.
 * Unparsed / heuristic failures leave quantity null and scaleMode fixed.
 */
export function parseIngredientLine(line: string, id?: string): Ingredient {
  const raw = line.trim();
  if (!raw) {
    return {
      id: id ?? newId(),
      raw: '',
      quantity: null,
      unit: null,
      food: '',
      note: null,
      scaleMode: 'fixed',
    };
  }

  // Strip leading bullets
  const cleaned = raw.replace(/^[-*•]\s*/, '');
  const { qty, rest: afterQty } = parseQuantity(cleaned);
  const { unit, rest: afterUnit } = parseUnit(afterQty);
  // "of" after unit: "2 cups of flour"
  const foodPart = afterUnit.replace(/^of\s+/i, '');
  const { food, note } = splitNote(foodPart);

  return {
    id: id ?? newId(),
    raw,
    quantity: qty,
    unit,
    food: food || cleaned,
    note,
    scaleMode: inferScaleMode(raw, qty, unit),
  };
}

export function parseIngredientLines(text: string): Ingredient[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => parseIngredientLine(l));
}

/** Format ingredient for display (respecting current qty/unit after scaling). */
export function formatIngredient(ing: Ingredient): string {
  const parts: string[] = [];
  if (ing.quantity != null) {
    parts.push(formatQty(ing.quantity));
  }
  if (ing.unit) parts.push(ing.unit);
  if (ing.food) parts.push(ing.food);
  let s = parts.join(' ');
  if (ing.note) s += `, ${ing.note}`;
  return s || ing.raw;
}

function formatQty(n: number): string {
  if (Number.isInteger(n)) return String(n);
  // common fractions
  const frac: Record<string, string> = {
    '0.25': '1/4',
    '0.5': '1/2',
    '0.75': '3/4',
    '0.333': '1/3',
    '0.667': '2/3',
    '0.125': '1/8',
  };
  const key = n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  // try exact-ish match
  for (const [k, v] of Object.entries(frac)) {
    if (Math.abs(n - parseFloat(k)) < 0.02) {
      const whole = Math.floor(n);
      if (whole >= 1 && Math.abs(n - whole - parseFloat(k)) < 0.02) {
        return `${whole} ${v}`;
      }
      if (whole === 0) return v;
    }
  }
  return Number(n.toFixed(2)).toString();
}
