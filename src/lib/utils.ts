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
}
