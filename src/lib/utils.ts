export function omit<Item extends object, Key extends Extract<keyof Item, string>, Return extends Omit<Item, Key>>(item: Item, keys: Key[]): Return {
  return Object.fromEntries(Object.entries(item).filter(([key]) => !keys.includes(key as Key))) as Return;
}

export function pick<Item extends object, Key extends Extract<keyof Item, string>, Return extends Pick<Item, Key>>(item: Item, keys: Key[]): Return {
  return Object.fromEntries(Object.entries(item).filter(([key]) => keys.includes(key as Key))) as Return;
}

export type Obj = Record<string | number | symbol, unknown>;

export function objectIsEqual(a: Obj, b: Obj): boolean {
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (!Object.hasOwn(a, key) || !Object.hasOwn(b, key)) return false;
    if (typeof a[key] !== typeof b[key]) return false;
    if (typeof a[key] === 'object') {
      if (a[key] === null && b[key] === null) continue;
      if (a[key] === null || b[key] === null) return false;
      if (!objectIsEqual(a[key] as Obj, b[key] as Obj)) return false;
    } else if (a[key] !== b[key]) return false;
  }
  return true;
}

/** converts points to an svg path. not even close to optimal */
export function pointsToPath(points: [x: number, y: number][]): string {
  return points
    .map(([x, y], i, arr) => {
      const prev = arr[i - 1];
      // https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/d#path_commands
      if (prev) return `m${x - prev[0]},${y - prev[1]}h0`;
      return `M${x},${y}h0`;
    })
    .join('');
}

export function enumValues<Item extends Record<string, number | string>>(item: Item) {
  return Object.entries(item).filter(([key]) => Number.isNaN(Number(key))) as [string, number][];
}

export function lerp(left: number, right: number, steps: number, step: number): number {
  return left + ((right - left) / steps) * step;
}

export function modP(value: number, mod: number): number {
  const intermediate = value % mod;
  return intermediate + ((mod > 0 && intermediate < 0) || (mod < 0 && intermediate > 0) ? mod : 0);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export interface Point {
  x: number;
  y: number;
}
export interface Vector {
  x: number;
  y: number;
}
export interface Line {
  a: Point;
  b: Point;
}

export function lineIntersect(
  { a: { x: x0, y: y0 }, b: { x: x1, y: y1 } }: Line,
  { a: { x: x2, y: y2 }, b: { x: x3, y: y3 } }: Line,
  infinite: boolean = false
): Point | undefined {
  const denominator = (x0 - x1) * (y2 - y3) - (y0 - y1) * (x2 - x3);
  // console.debug('lineIntersect', denominator);
  if (denominator === 0) return;
  const lengthA = ((x0 - x2) * (y2 - y3) - (y0 - y2) * (x2 - x3)) / denominator;
  const lengthB = ((x0 - x2) * (y0 - y1) - (y0 - y2) * (x0 - x1)) / denominator;
  const result =
    infinite || (lengthA >= 0 && lengthA <= 1 && lengthB >= 0 && lengthB <= 1) ? { x: x0 + lengthA * (x1 - x0), y: y0 + lengthA * (y1 - y0) } : undefined;
  // console.debug('lineIntersect', denominator, lengthA, lengthB, result);
  return result;
}

export function normalVector({ x, y }: Vector): Vector {
  const dist = Math.sqrt(x ** 2 + y ** 2);
  return { x: x / dist, y: y / dist };
}

export function pointMult({ x, y }: Point, value: number): Point {
  return { x: x * value, y: y * value };
}

export function pointAdd(...points: Point[]): Point {
  return points.reduce(
    (acc, item) => {
      acc.x += item.x;
      acc.y += item.y;
      return acc;
    },
    { x: 0, y: 0 }
  );
}

/** rotate 90deg clockwise */
export function vecRotate({ x, y }: Vector): Vector {
  return { x: y, y: -x };
}

export function pointsToVector(a: Point, b: Point): Vector {
  return { x: b.x - a.x, y: b.y - a.y };
}

export function pointRound({ x, y }: Point): Point {
  return { x: Math.round(x), y: Math.round(y) };
}
