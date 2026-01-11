/** biome-ignore-all lint/complexity/noStaticOnlyClass: no */

export abstract class Utils {
  static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(min, value), max);
  }
  static modP(value: number, mod: number): number {
    const intermediate = value % mod;
    return intermediate + ((mod > 0 && intermediate < 0) || (mod < 0 && intermediate > 0) ? mod : 0);
  }
  static roundTo(value: number, digits: number): number {
    const multiplier = 10 ** digits;
    return Math.round(value * multiplier) / multiplier;
  }
  static lerp(left: number, right: number, steps: number, step: number): number {
    return left + ((right - left) / steps) * step;
  }
  static omit<Item extends object, Key extends Extract<keyof Item, string>, Return extends Omit<Item, Key>>(item: Item, keys: Key[]): Return {
    return Object.fromEntries(Object.entries(item).filter(([key]) => !keys.includes(key as Key))) as Return;
  }
  static pick<Item extends object, Key extends Extract<keyof Item, string>, Return extends Pick<Item, Key>>(item: Item, keys: Key[]): Return {
    return Object.fromEntries(Object.entries(item).filter(([key]) => keys.includes(key as Key))) as Return;
  }
}
