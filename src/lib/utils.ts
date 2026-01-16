export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(min, value), max);
}

export function modP(value: number, mod: number): number {
  const intermediate = value % mod;
  return intermediate + ((mod > 0 && intermediate < 0) || (mod < 0 && intermediate > 0) ? mod : 0);
}

export function roundTo(value: number, digits: number): number {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

export function lerp(left: number, right: number, steps: number, step: number): number {
  return left + ((right - left) / steps) * step;
}

export function omit<Item extends object, Key extends Extract<keyof Item, string>, Return extends Omit<Item, Key>>(item: Item, keys: Key[]): Return {
  return Object.fromEntries(Object.entries(item).filter(([key]) => !keys.includes(key as Key))) as Return;
}

export function pick<Item extends object, Key extends Extract<keyof Item, string>, Return extends Pick<Item, Key>>(item: Item, keys: Key[]): Return {
  return Object.fromEntries(Object.entries(item).filter(([key]) => keys.includes(key as Key))) as Return;
}

export function enumEntries<Value extends number | bigint | boolean>(enumObject: Record<string, Value | string>): [key: string, value: Value][] {
  return Object.entries(enumObject).filter(([, val]) => typeof val !== 'string') as [key: string, value: Value][];
}

export function pascalToSentenceCase(value: string): string {
  return value
    .split(/([A-Z][^A-Z]+)/)
    .filter((token) => token.length)
    .map((token, i) => (i > 0 && !/[A-Z]/.exec(token[token.length - 1]) ? token.toLocaleLowerCase() : token))
    .join(' ');
}

export function pascalToTitleCase(value: string): string {
  return value
    .split(/([A-Z][^A-Z]+)/)
    .filter((token) => token.length)
    .join(' ');
}
