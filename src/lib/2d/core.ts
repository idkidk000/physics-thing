/** biome-ignore-all lint/suspicious/useAdjacentOverloadSignatures: biome bug */

interface PointOrVectorLike {
  x: number;
  y: number;
}

export interface PointLike extends PointOrVectorLike {}

export interface VectorLike extends PointOrVectorLike {}

export interface LineLike {
  a: PointLike;
  b: PointLike;
}

export interface AABBLike {
  min: PointLike;
  max: PointLike;
}

export interface CircleLike {
  position: Point;
  radius: number;
  radius2: number;
}

export interface PolyLike {
  position: Point;
  aabb: AABBLike;
  points: PointLike[];
}

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
  toInterface(): Interface {
    return { x: this.x, y: this.y } as unknown as Interface;
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

export class Point extends PointOrVector<PointLike> implements PointLike {
  toVector(): Vector {
    return new Vector(this);
  }
}

export class Vector extends PointOrVector<VectorLike> implements VectorLike {
  unit(): Vector {
    return new Vector(Vector.unit(this));
  }
  rotate(...params: [radians: number] | [cos: number, sin: number]): Vector {
    return new Vector(Vector.rotate(this, ...params));
  }
  dot(other: VectorLike): number {
    return Vector.dot(this, other);
  }

  unitEq(): this {
    const { x, y } = Vector.unit(this);
    [this.x, this.y] = [x, y];
    return this;
  }
  rotateEq(...params: [radians: number] | [cos: number, sin: number]): this {
    const { x, y } = Vector.rotate(this, ...params);
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
    return result;
  }
  static rotate(item: VectorLike, ...params: [radians: number] | [cos: number, sin: number]): VectorLike {
    // https://www.geeksforgeeks.org/maths/rotation-matrix/
    const [cos, sin] = params.length === 1 ? [Math.cos(params[0]), Math.sin(params[0])] : params;
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

export class Line implements LineLike {
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

export class AABB implements AABBLike {
  min: PointLike;
  max: PointLike;
  constructor(...params: [minX: number, minY: number, maxX: number, maxY: number] | [object: AABBLike] | [points: PointLike[]]) {
    if (params.length === 4 && params.every((param) => typeof param === 'number')) {
      this.min = { x: params[0], y: params[1] };
      this.max = { x: params[2], y: params[3] };
    } else if (params.length === 1 && AABB.is(params[0])) {
      this.min = {
        x: params[0].min.x,
        y: params[0].min.y,
      };
      this.max = {
        x: params[0].max.x,
        y: params[0].max.y,
      };
    } else if (params.length && params.every((param) => Point.is(param))) {
      let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
      for (const point of params) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
      this.min = {
        x: minX,
        y: minY,
      };
      this.max = {
        x: maxX,
        y: maxY,
      };
    } else throw new Error('invalid constructor params');
  }
  intersects(other: AABBLike): boolean {
    return AABB.intersects(this, other);
  }
  contains(point: PointLike): boolean {
    return AABB.contains(this, point);
  }

  static contains(item: AABBLike, point: PointLike): boolean {
    return point.x <= item.max.x && point.x >= item.min.x && point.y <= item.max.y && point.y >= item.min.y;
  }
  static intersects(item: AABBLike, other: AABBLike): boolean {
    return item.min.x <= other.max.x && item.max.x >= other.min.x && item.min.y <= other.max.y && item.max.y >= other.min.y;
  }
  static is(item: unknown): item is AABBLike {
    return typeof item === 'object' && item !== null && 'min' in item && 'max' in item && Point.is(item.min) && Point.is(item.max);
  }
}
