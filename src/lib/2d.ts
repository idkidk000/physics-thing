/** biome-ignore-all lint/suspicious/useAdjacentOverloadSignatures: biome bug */

interface PointOrVectorLike {
  x: number;
  y: number;
}

export interface PointLike extends PointOrVectorLike {}

export interface VectorLike extends PointOrVectorLike {}

abstract class PointOrVector<Interface extends PointOrVectorLike> {
  x: number;
  y: number;
  // actually returns ThisType<Interface> but it doesn't simplify to Point or Vector
  #typedConstructor = this.constructor as new (...params: ConstructorParameters<typeof PointOrVector<PointOrVectorLike>>) => this;
  constructor(...params: [x: number, y: number] | [object: PointOrVectorLike]) {
    if (params.length === 2 && typeof params[0] === 'number' && typeof params[1] === 'number') {
      this.x = params[0];
      this.y = params[1];
    } else if (params.length === 1 && PointOrVector.is(params[0])) {
      this.x = params[0].x;
      this.y = params[0].y;
    } else throw new Error('invalid constructor params');
  }

  add(other: Interface): this {
    return new this.#typedConstructor(PointOrVector.add(this, other));
  }
  sub(other: Interface): this {
    return new this.#typedConstructor(PointOrVector.sub(this, other));
  }
  mult(...[param]: [value: number] | [other: Interface]): this {
    return new this.#typedConstructor(PointOrVector.mult(...([this, param] as [PointOrVectorLike, PointOrVectorLike] | [PointOrVectorLike, number])));
  }
  div(value: number): this {
    return new this.#typedConstructor(PointOrVector.div(this, value));
  }
  floor(): this {
    return new this.#typedConstructor(PointOrVector.floor(this));
  }
  ceil(): this {
    return new this.#typedConstructor(PointOrVector.ceil(this));
  }
  round(): this {
    return new this.#typedConstructor(PointOrVector.round(this));
  }
  trunc(): this {
    return new this.#typedConstructor(PointOrVector.trunc(this));
  }
  clamp(min: Interface, max: Interface): this {
    return new this.#typedConstructor(PointOrVector.clamp(this, min, max));
  }
  roundTo(digits: number): this {
    return new this.#typedConstructor(PointOrVector.roundTo(this, digits));
  }

  addEq(other: Interface): this {
    const { x, y } = PointOrVector.add(this, other);
    [this.x, this.y] = [x, y];
    return this;
  }
  subEq(other: Interface): this {
    const { x, y } = PointOrVector.sub(this, other);
    [this.x, this.y] = [x, y];
    return this;
  }
  multEq(...[param]: [value: number] | [other: Interface]): this {
    const { x, y } = PointOrVector.mult(...([this, param] as [PointOrVectorLike, PointOrVectorLike] | [PointOrVectorLike, number]));
    [this.x, this.y] = [x, y];
    return this;
  }
  divEq(value: number): this {
    const { x, y } = PointOrVector.div(this, value);
    [this.x, this.y] = [x, y];
    return this;
  }
  floorEq(): this {
    const { x, y } = PointOrVector.floor(this);
    [this.x, this.y] = [x, y];
    return this;
  }
  ceilEq(): this {
    const { x, y } = PointOrVector.ceil(this);
    [this.x, this.y] = [x, y];
    return this;
  }
  roundEq(): this {
    const { x, y } = PointOrVector.round(this);
    [this.x, this.y] = [x, y];
    return this;
  }
  truncEq(): this {
    const { x, y } = PointOrVector.trunc(this);
    [this.x, this.y] = [x, y];
    return this;
  }
  clampEq(min: Interface, max: Interface): this {
    const { x, y } = PointOrVector.clamp(this, min, max);
    [this.x, this.y] = [x, y];
    return this;
  }
  roundToEq(digits: number): this {
    const { x, y } = PointOrVector.roundTo(this, digits);
    [this.x, this.y] = [x, y];
    return this;
  }

  hypot2(other?: Interface): number {
    return other ? PointOrVector.hypot2(this, other) : PointOrVector.hypot2(this);
  }
  hypot(other?: Interface): number {
    return other ? PointOrVector.hypot(this, other) : PointOrVector.hypot(this);
  }
  eq(other: Interface): boolean {
    return PointOrVector.eq(this, other);
  }
  inspect(): string {
    return PointOrVector.inspect(this);
  }

  static add(item: PointOrVectorLike, other: PointOrVectorLike): PointOrVectorLike {
    return { x: item.x + other.x, y: item.y + other.y };
  }
  static sub(item: PointOrVectorLike, other: PointOrVectorLike): PointOrVectorLike {
    return { x: item.x - other.x, y: item.y - other.y };
  }
  static mult(...[item, param]: [item: PointOrVectorLike, value: number] | [item: PointOrVectorLike, other: PointOrVectorLike]): PointOrVectorLike {
    return PointOrVector.is(param) ? { x: item.x * param.x, y: item.y * param.y } : { x: item.x * param, y: item.y * param };
  }
  static div(item: PointOrVectorLike, value: number): PointOrVectorLike {
    return { x: item.x / value, y: item.y / value };
  }
  static floor(item: PointOrVectorLike): PointOrVectorLike {
    return { x: Math.floor(item.x), y: Math.floor(item.y) };
  }
  static ceil(item: PointOrVectorLike): PointOrVectorLike {
    return { x: Math.ceil(item.x), y: Math.ceil(item.y) };
  }
  static round(item: PointOrVectorLike): PointOrVectorLike {
    return { x: Math.round(item.x), y: Math.round(item.y) };
  }
  static trunc(item: PointOrVectorLike): PointOrVectorLike {
    return { x: Math.trunc(item.x), y: Math.trunc(item.y) };
  }
  static clamp(item: PointOrVectorLike, min: PointOrVectorLike, max: PointOrVectorLike): PointOrVectorLike {
    return { x: Math.min(Math.max(min.x, item.x), max.x), y: Math.min(Math.max(min.y, item.y), max.y) };
  }
  static roundTo(item: PointOrVectorLike, digits: number): PointOrVectorLike {
    const multiplier = 10 ** digits;
    return { x: Math.round(item.x * multiplier) / multiplier, y: Math.round(item.y * multiplier) / multiplier };
  }

  static hypot2(...params: [item: PointOrVectorLike] | [item: PointOrVectorLike, other: PointOrVectorLike]): number {
    if (params.length === 1) return params[0].x ** 2 + params[0].y ** 2;
    if (params.length === 2) return (params[1].x - params[0].x) ** 2 + (params[1].y - params[0].y) ** 2;
    throw new Error('invalid params');
  }
  static hypot(...params: [item: PointOrVectorLike] | [item: PointOrVectorLike, other: PointOrVectorLike]): number {
    if (params.length === 1) return Math.sqrt(params[0].x ** 2 + params[0].y ** 2);
    if (params.length === 2) return Math.sqrt((params[1].x - params[0].x) ** 2 + (params[1].y - params[0].y) ** 2);
    throw new Error('invalid params');
  }
  static eq(item: PointOrVectorLike, other: PointOrVectorLike): boolean {
    return item.x === other.x && item.y === other.y;
  }
  // no inspect.custom in the browser
  static inspect(item: PointOrVectorLike): string {
    return `{x: ${item.x.toFixed(2)}, y: ${item.y.toFixed(2)}}`;
  }

  static is(item: unknown): item is PointOrVectorLike {
    return typeof item === 'object' && item !== null && 'x' in item && 'y' in item && typeof item.x === 'number' && typeof item.y === 'number';
  }
}

export class Point extends PointOrVector<PointLike> {
  toVector(): Vector {
    return new Vector(this);
  }
}

export class Vector extends PointOrVector<VectorLike> {
  unit(): Vector {
    return new Vector(Vector.unit(this));
  }
  rotate(radians: number): Vector {
    return new Vector(Vector.rotate(this, radians));
  }
  dot(other: VectorLike): number {
    return Vector.dot(this, other);
  }

  unitEq(): this {
    const { x, y } = Vector.unit(this);
    [this.x, this.y] = [x, y];
    return this;
  }
  rotateEq(radians: number): this {
    const { x, y } = Vector.rotate(this, radians);
    [this.x, this.y] = [x, y];
    return this;
  }

  toPoint(): Point {
    return new Point(this);
  }
  toRadians(): number {
    return Vector.toRadians(this);
  }
  toDegrees(): number {
    return Vector.toDegrees(this);
  }

  static unit(item: VectorLike): VectorLike {
    const hypot = PointOrVector.hypot(item);
    const result = { x: item.x / (hypot || 1), y: item.y / (hypot || 1) };
    let hasNaN = false;
    if (Number.isNaN(result.x)) {
      result.x = 0;
      hasNaN = true;
    }
    if (Number.isNaN(result.y)) {
      result.y = 0;
      hasNaN = true;
    }
    if (hasNaN) console.error('Vector.unit NaN', 'item', Vector.inspect(item), 'fixed result', Vector.inspect(result));
    return result;
  }
  static rotate(item: VectorLike, radians: number): VectorLike {
    // https://www.geeksforgeeks.org/maths/rotation-matrix/
    const [cos, sin] = [Math.cos(radians), Math.sin(radians)];
    return {
      x: cos * item.x - sin * item.y,
      y: sin * item.x + cos * item.y,
    };
  }
  static dot(item: VectorLike, other: VectorLike): number {
    return item.x * other.x + item.y * other.y;
  }
  static toRadians(item: VectorLike): number {
    return Math.atan2(item.y, item.x);
  }
  static toDegrees(item: VectorLike): number {
    const intermediate = ((Math.atan2(item.y, item.x) / (Math.PI * 2)) * 360 + 90) % 360;
    return intermediate < 0 ? intermediate + 360 : intermediate;
  }
}

export interface LineLike {
  a: PointLike;
  b: PointLike;
}

export class Line {
  a: PointLike;
  b: PointLike;
  constructor(...params: [x0: number, y0: number, x1: number, y1: number] | [a: PointLike, b: PointLike] | [object: LineLike]) {
    if (params.length === 4 && params.every((param) => typeof param === 'number')) {
      this.a = {
        x: params[0],
        y: params[1],
      };
      this.b = {
        x: params[2],
        y: params[3],
      };
    } else if (params.length === 2 && params.every((param) => PointOrVector.is(param))) {
      this.a = {
        x: params[0].x,
        y: params[0].y,
      };
      this.b = {
        x: params[1].x,
        y: params[1].y,
      };
    } else if (params.length === 1 && Line.is(params[0])) {
      this.a = {
        x: params[0].a.x,
        y: params[0].a.y,
      };
      this.b = {
        x: params[0].b.x,
        y: params[0].b.y,
      };
    } else throw new Error('invalid constructor params');
  }

  intersection(other: LineLike, infinite?: boolean): PointLike | undefined {
    return Line.intersection(this, other, infinite);
  }

  static intersection(item: LineLike, other: LineLike, infinite?: boolean): PointLike | undefined {
    const denominator = (item.a.x - item.b.x) * (other.a.y - other.b.y) - (item.a.y - item.b.y) * (other.a.x - other.b.x);
    if (denominator === 0) return;
    const lengthA = ((item.a.x - other.a.x) * (other.a.y - other.b.y) - (item.a.y - other.a.y) * (other.a.x - other.b.x)) / denominator;
    const lengthB = ((item.a.x - other.a.x) * (item.a.y - item.b.y) - (item.a.y - other.a.y) * (item.a.x - item.b.x)) / denominator;
    return infinite || (lengthA >= 0 && lengthA <= 1 && lengthB >= 0 && lengthB <= 1)
      ? { x: item.a.x + lengthA * (item.b.x - item.a.x), y: item.a.y + lengthA * (item.b.y - item.a.y) }
      : undefined;
  }

  static is(item: unknown): item is Line {
    return typeof item === 'object' && item !== null && 'a' in item && 'b' in item && PointOrVector.is(item.a) && PointOrVector.is(item.b);
  }
}

export interface AABB {
  min: PointLike;
  max: PointLike;
}

export interface CircleLike {
  position: Point;
  radius: number;
  radius2: number;
}

export interface SquareLike {
  radius2: number;
  position: Point;
  aabb: AABB;
  points: PointLike[];
}

export function circleIntersectsPoly(circle: CircleLike, poly: SquareLike): boolean {
  // clamping circle.position to poly's aabb is from here https://stackoverflow.com/a/1879223
  /** closest point to circle in poly's aabb (not necessarily inside poly's bb) */
  const polyAabb = poly.aabb;
  const ptOtherAabbClosest = Point.clamp(circle.position, polyAabb.min, polyAabb.max);
  const vecOtherAabbClosest = Vector.sub(ptOtherAabbClosest, circle.position);

  // simulation.step has already tested the aabbs overlap. return early if closest point to circle in poly's aabb is outside our radius
  if (Vector.hypot2(vecOtherAabbClosest) > circle.radius2) return false;

  // // test for hypot2(circle.pos,poly.pos)<min(circle.r2,poly.r2)
  // // this shouldn't be necessary
  // if (Vector.hypot2(Vector.sub(poly.position, circle.position)) < Math.min(circle.radius2, poly.radius2)) return true;

  // test for poly's corners inside circle's radius
  const polyPoints = poly.points;
  for (const polyPoint of polyPoints) {
    const inside = Vector.hypot2(Vector.sub(polyPoint, circle.position)) < circle.radius2;
    if (inside) return true;
  }

  /** closest point to poly's aabb on circle's circumference */
  const ptThisClosest = Point.add(circle.position, Vector.mult(Vector.unit(vecOtherAabbClosest), circle.radius));
  const lineToClosest: LineLike = { a: circle.position, b: ptThisClosest };

  // test for line from circle.position to ptThisClosest intersecting any line of poly
  for (let p = 1; p <= polyPoints.length; ++p) {
    const intersection = Line.intersection(lineToClosest, { a: polyPoints[p - 1], b: polyPoints[p % polyPoints.length] });
    if (intersection) return true;
  }

  return false;
}

export function polyIntersectsPoly(a: SquareLike, b: SquareLike): boolean {
  const aPoints = a.points;
  const bPoints = b.points;

  for (let ap = 1; ap <= aPoints.length; ++ap) {
    const aLine: LineLike = { a: aPoints[ap - 1], b: aPoints[ap % aPoints.length] };
    for (let bp = 1; bp <= bPoints.length; ++bp) {
      if (Line.intersection(aLine, { a: bPoints[bp - 1], b: bPoints[bp % bPoints.length] })) return true;
    }
  }

  return false;
}
