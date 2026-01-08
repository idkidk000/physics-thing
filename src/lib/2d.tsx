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
  // actually return ThisType<Interface> but it doesn't simplify to Point or Vector
  #typedConstructor = this.constructor as new (...params: ConstructorParameters<typeof PointOrVector<PointOrVectorLike>>) => this;
  constructor(...params: [x: number, y: number] | [object: PointOrVectorLike]) {
    if (params.length === 2 && typeof params[0] === 'number' && typeof params[1] === 'number') {
      this.x = params[0];
      this.y = params[1];
    } else if (params.length === 1 && typeof params[0] === 'object' && params[0] !== null && 'x' in params[0] && 'y' in params[0]) {
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
  mult(value: number): this {
    return new this.#typedConstructor(PointOrVector.mult(this, value));
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
  multEq(value: number): this {
    const { x, y } = PointOrVector.mult(this, value);
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

  hypot2(): number {
    return PointOrVector.hypot2(this);
  }
  hypot(): number {
    return PointOrVector.hypot(this);
  }
  eq(other: Interface): boolean {
    return PointOrVector.eq(this, other);
  }

  static add(item: PointOrVectorLike, other: PointOrVectorLike): PointOrVectorLike {
    return { x: item.x + other.x, y: item.y + other.y };
  }
  static sub(item: PointOrVectorLike, other: PointOrVectorLike): PointOrVectorLike {
    return { x: item.x - other.x, y: item.y - other.y };
  }
  static mult(item: PointOrVectorLike, value: number): PointOrVectorLike {
    return { x: item.x * value, y: item.y * value };
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
  static hypot2(item: PointOrVectorLike): number {
    return item.x ** 2 + item.y ** 2;
  }
  static hypot(item: PointOrVectorLike): number {
    return Math.sqrt(PointOrVector.hypot2(item));
  }
  static eq(item: PointOrVectorLike, other: PointOrVectorLike): boolean {
    return item.x === other.x && item.y === other.y;
  }
}

export class Point extends PointOrVector<PointLike> {}

export class Vector extends PointOrVector<VectorLike> {
  unit(): Vector {
    return new Vector(Vector.unit(this));
  }
  static unit(item: PointOrVectorLike): PointOrVectorLike {
    const hypot = PointOrVector.hypot(item);
    return { x: item.x / hypot, y: item.y / hypot };
  }
}
