import type { RefObject } from 'react';
import { type Config, ShadingType } from '@/hooks/config';
import { type AABB, Line, type LineLike, Point, type PointLike, type Rect, Vector, type VectorLike } from '@/lib/2d';
import { Utils } from '@/lib/utils';

export enum Hull {
  Circle,
  Square,
}

export abstract class Entity {
  #dragging = false;
  #hull: Hull;
  #fixed: boolean;
  #rotation: number;
  age = 0;
  #radius = 0;
  #mass = 0;
  constructor(
    public position: Point,
    public velocity: Vector,
    rotation: number,
    public hue: number,
    public opacity: number,
    hull: Hull,
    fixed: boolean,
    protected configRef: RefObject<Config>
  ) {
    this.#hull = hull;
    this.#fixed = fixed;
    this.#rotation = rotation;
  }
  set dragging(value: boolean) {
    this.#dragging = value;
    this.age = 0;
  }
  get dragging(): boolean {
    return this.#dragging;
  }
  get fixed(): boolean {
    return this.#fixed;
  }
  get hull(): Hull {
    return this.#hull;
  }
  set rotation(value: number) {
    this.#rotation = value;
  }
  get rotation(): number {
    return this.#rotation;
  }
  get radius(): number {
    return this.#radius;
  }
  set radius(value: number) {
    this.#radius = value;
    if (this.#hull === Hull.Circle) this.#mass = Math.PI * value ** 2;
    else if (this.#hull === Hull.Square) this.#mass = (value * 2) ** 2;
  }
  get mass(): number {
    return this.#mass;
  }
  abstract get aabb(): AABB;
  abstract get bb(): Rect;
  /** returns false or collision normal */
  intersects(other: Entity): false | Vector {
    if (this.aabb.min.x > other.aabb.max.x || this.aabb.max.x < other.aabb.min.x || this.aabb.min.y > other.aabb.max.y || this.aabb.max.y < other.aabb.min.y)
      return false;
    if (this.hull === Hull.Circle && other.hull === Hull.Circle) {
      const vec = Vector.sub(other.position, this.position);
      if (Vector.hypot2(vec) < (this.radius + other.radius) ** 2) return new Vector(vec).unitEq();
      return false;
    }
    if (this.hull === Hull.Circle && other.hull === Hull.Square) {
      /** adapted from https://stackoverflow.com/a/1879223 to handle rotated squares */
      /** closest point to us in other's aabb (not necessarily inside others bb) */
      const closest = Point.clamp(this.position, other.aabb.min, other.aabb.max);
      if (Vector.hypot2(Vector.sub(closest, this.position)) >= this.radius ** 2) return false;
      const lineToClosest: LineLike = { a: this.position, b: closest };
      // console.debug('circle => square', this.position, other.position, closest, lineToClosest);
      for (const otherLine of [
        { a: other.bb.a, b: other.bb.b },
        { a: other.bb.b, b: other.bb.c },
        { a: other.bb.c, b: other.bb.d },
        { a: other.bb.d, b: other.bb.a },
      ] satisfies LineLike[]) {
        /** intersection has to be tested with infinite length since closest is only guaranteed to be in aabb */
        const intersection = Line.intersection(lineToClosest, otherLine, true);
        // console.debug('circle => square', lineToClosest, otherLine, intersection);
        if (!intersection) continue;
        return new Vector(intersection).subEq(this.position).unitEq();
      }

      // const { a, b, c, d } = other.bb;
      // const { vecCorner, hypot2 } = [Vector.sub(a, this.position), Vector.sub(b, this.position), Vector.sub(c, this.position), Vector.sub(d, this.position)]
      //   .map((vec) => ({ vecCorner: vec, hypot2: Vector.hypot2(vec) }))
      //   .toSorted((a, b) => a.hypot2 - b.hypot2)[0];
      // if (hypot2 < this.radius ** 2) return new Vector(vecCorner).unitEq();
      // const vecCenter = Vector.sub(other.position, this.position);
      // if (Vector.hypot2(vecCenter) < (this.radius + other.radius) ** 2) return new Vector(vecCenter).unitEq();
      return false;
    }
    if (this.hull === Hull.Square && other.hull === Hull.Circle) {
      /** first half is the reverse of circle->square but we still get the same intersection in the line loop */
      /** closest point to other in our aabb */
      const closest = Point.clamp(other.position, this.aabb.min, this.aabb.max);
      if (Vector.hypot2(Vector.sub(other.position, closest)) >= other.radius ** 2) return false;
      const lineToClosest: LineLike = { a: other.position, b: closest };
      for (const thisLine of [
        { a: this.bb.a, b: this.bb.b },
        { a: this.bb.b, b: this.bb.c },
        { a: this.bb.c, b: this.bb.d },
        { a: this.bb.d, b: this.bb.a },
      ] satisfies LineLike[]) {
        /** intersection has to be tested with infinite length since closest is only guaranteed to be in aabb */
        const intersection = Line.intersection(lineToClosest, thisLine, true);
        if (!intersection) continue;
        return new Vector(intersection).subEq(this.position).unitEq();
      }

      // const { a, b, c, d } = this.bb;
      // const { vecCorner, hypot2 } = [Vector.sub(other.position, a), Vector.sub(other.position, b), Vector.sub(other.position, c), Vector.sub(other.position, d)]
      //   .map((vec) => ({ vecCorner: vec, hypot2: Vector.hypot2(vec) }))
      //   .toSorted((a, b) => a.hypot2 - b.hypot2)[0];
      // if (hypot2 < other.radius ** 2) return new Vector(vecCorner).unitEq();
      // const vecCenter = Vector.sub(other.position, this.position);
      // if (Vector.hypot2(vecCenter) < (this.radius + other.radius) ** 2) return new Vector(vecCenter).unitEq();
      return false;
    }
    if (this.hull === Hull.Square && other.hull === Hull.Square) {
      // quite cursed but the maths works https://www.geeksforgeeks.org/dsa/how-to-check-if-a-given-point-lies-inside-a-polygon/
      const thisBb = this.bb;
      const thisPoints = [thisBb.a, thisBb.b, thisBb.c, thisBb.d];
      const otherBb = other.bb;
      const otherPoints = [otherBb.a, otherBb.b, otherBb.c, otherBb.d];

      // find all bb points of other inside our bb
      const otherInsideThis = otherPoints
        .map((otherPoint) => {
          let inside = false;
          for (let p = 1; p <= thisPoints.length; ++p) {
            const thisPointA = thisPoints[p - 1];
            const thisPointB = thisPoints[p % thisPoints.length];
            if (otherPoint.y <= Math.min(thisPointA.y, thisPointB.y)) continue;
            if (otherPoint.y > Math.max(thisPointA.y, thisPointB.y)) continue;
            if (otherPoint.x > Math.max(thisPointA.x, thisPointB.x)) continue;
            const xIntersect = ((otherPoint.y - thisPointA.y) * (thisPointB.x - thisPointA.x)) / (thisPointB.y - thisPointA.y) + thisPointA.x;
            if (thisPointA.x === thisPointB.x || otherPoint.x <= xIntersect) inside = !inside;
          }
          return { point: otherPoint, inside };
        })
        .filter(({ inside }) => inside);

      // find all bb points of this inside other bb
      const thisInsideOther = thisPoints
        .map((thisPoint) => {
          let inside = false;
          for (let p = 1; p <= otherPoints.length; ++p) {
            const otherPointA = otherPoints[p - 1];
            const otherPointB = otherPoints[p % otherPoints.length];
            if (thisPoint.y <= Math.min(otherPointA.y, otherPointB.y)) continue;
            if (thisPoint.y > Math.max(otherPointA.y, otherPointB.y)) continue;
            if (thisPoint.x > Math.max(otherPointA.x, otherPointB.x)) continue;
            const xIntersect = ((thisPoint.y - otherPointA.y) * (otherPointB.x - otherPointA.x)) / (otherPointB.y - otherPointA.y) + otherPointA.x;
            if (otherPointA.x === otherPointB.x || thisPoint.x <= xIntersect) inside = !inside;
          }
          return { point: thisPoint, inside };
        })
        .filter(({ inside }) => inside);

      if (otherInsideThis.length === 0 && thisInsideOther.length === 0) return false;

      // return the average normal of all intersecting points
      return new Vector(
        [
          ...otherInsideThis.map(({ point }) => Vector.sub(point, this.position)),
          ...thisInsideOther.map(({ point }) => Vector.sub(other.position, point)),
        ].reduce((acc, item) => {
          acc.x += item.x;
          acc.y += item.y;
          return acc;
        })
      ).unitEq();
    }

    throw new Error(`cannot test intersection between ${this.hull} and ${other.hull}`);
  }
  collide(other: Entity): void {
    const collisionNormal = this.intersects(other);
    if (!collisionNormal) return;
    const normalVelocityDp = other.velocity.sub(this.velocity).dot(collisionNormal);

    if (normalVelocityDp > 0) return;

    const impulse = (-(1 + this.configRef.current.restitutionCoefficient) * normalVelocityDp) / (1 / this.mass + 1 / other.mass);
    const impulseVector = collisionNormal.mult(impulse);

    this.velocity.subEq(impulseVector.div(this.mass)).multEq(this.configRef.current.collideVelocityRatio);
    other.velocity.addEq(impulseVector.div(other.mass)).multEq(this.configRef.current.collideVelocityRatio);
  }
  step(millis: number, bounds: PointLike): void {
    const config = this.configRef.current;
    if (!this.#dragging) {
      this.velocity.addEq(Vector.mult(config.gravity, 0.003));
      this.position.addEq(this.velocity.mult(millis));
    }

    if (this.aabb.min.x < 0) {
      this.position.x -= this.aabb.min.x;
      this.velocity.x *= -config.collideVelocityRatio;
    } else if (this.aabb.max.x > bounds.x) {
      this.position.x -= this.aabb.max.x - bounds.x;
      this.velocity.x *= -config.collideVelocityRatio;
    }

    if (this.aabb.min.y < 0) {
      this.position.y -= this.aabb.min.y;
      this.velocity.y *= -config.collideVelocityRatio;
    } else if (this.aabb.max.y > bounds.y) {
      this.position.y -= this.aabb.max.y - bounds.y;
      this.velocity.y *= -config.collideVelocityRatio;
    }

    this.velocity.multEq(config.stepVelocityRatio);
  }
  abstract draw(context: CanvasRenderingContext2D, light: PointLike, maxLightDistance: number): void;
}

export class Circle extends Entity {
  constructor(position: Point, velocity: Vector, radius: number, hue: number, opacity: number, configRef: RefObject<Config>) {
    super(position, velocity, 0, hue, opacity, Hull.Circle, false, configRef);
    this.radius = radius;
  }
  get aabb(): AABB {
    return {
      min: {
        x: this.position.x - this.radius,
        y: this.position.y - this.radius,
      },
      max: {
        x: this.position.x + this.radius,
        y: this.position.y + this.radius,
      },
    };
  }
  get bb(): Rect {
    return {
      a: {
        x: this.position.x - this.radius,
        y: this.position.y - this.radius,
      },
      b: {
        x: this.position.x + this.radius,
        y: this.position.y - this.radius,
      },
      c: {
        x: this.position.x - this.radius,
        y: this.position.y + this.radius,
      },
      d: {
        x: this.position.x + this.radius,
        y: this.position.y + this.radius,
      },
    };
  }
  draw(context: CanvasRenderingContext2D, light: PointLike, maxLightDistance: number): void {
    const config = this.configRef.current;
    context.beginPath();
    context.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    context.closePath();
    if (config.drawBlur) {
      context.shadowBlur = 25;
      context.shadowColor = `hsl(${this.hue} 100 50 / ${this.opacity}%)`;
    }

    if (config.shadingType === ShadingType.TwoTone || config.shadingType === ShadingType.Gradient) {
      const lightOffset = Point.sub(this.position, light);
      const lightDistance = Point.hypot(lightOffset);
      const lightUnit = Point.div(lightOffset, lightDistance);
      const lightDistanceRatio = lightDistance / maxLightDistance;

      if (config.shadingType === ShadingType.Gradient) {
        const lightRatio = Utils.lerp(0.3, 0.1, 1, lightDistanceRatio);
        const shadowRatio = Utils.lerp(0.6, 0.9, 1, lightDistanceRatio);

        const gradientCenter = Point.sub(this.position, Point.mult(lightUnit, this.radius * (0.9 - lightRatio)));
        const gradient = context.createRadialGradient(gradientCenter.x, gradientCenter.y, 0, this.position.x, this.position.y, this.radius);
        gradient.addColorStop(lightRatio, `hsl(${this.hue} 100 ${Utils.lerp(80, 60, 1, lightDistanceRatio)} / ${this.opacity}%)`);
        gradient.addColorStop(shadowRatio, `hsl(${this.hue} 100 ${Utils.lerp(40, 25, 1, lightDistanceRatio)} / ${this.opacity}%)`);
        context.fillStyle = gradient;
        context.fill();
      }

      if (config.shadingType === ShadingType.TwoTone) {
        const shadowRatio = Utils.lerp(0.3, 0.9, 1, lightDistanceRatio);
        context.fillStyle = `hsl(${this.hue} 100 ${Utils.lerp(50, 25, 1, lightDistanceRatio)} / ${this.opacity}%)`;
        context.fill();

        const highlightCenter = Point.sub(this.position, Point.mult(lightUnit, this.radius * (1 - shadowRatio)));
        context.beginPath();
        context.arc(highlightCenter.x, highlightCenter.y, this.radius * shadowRatio, 0, Math.PI * 2);
        context.closePath();
        context.fillStyle = `hsl(${this.hue} 100 ${Utils.lerp(80, 50, 1, 1 - (1 - lightDistanceRatio) ** 2)} / ${this.opacity}%)`;
        context.fill();
      }
    } else {
      context.fillStyle = `hsl(${this.hue} 100 50 / ${this.opacity}%)`;
      context.fill();
    }

    if (context.shadowBlur) context.shadowBlur = 0;
  }
}

/** radius is origin to middle of a side, not corner */
export class Square extends Entity {
  #vTopLeft: VectorLike | null = null;
  constructor(position: Point, velocity: Vector, radius: number, rotation: number, hue: number, opacity: number, configRef: RefObject<Config>) {
    super(position, velocity, rotation, hue, opacity, Hull.Square, false, configRef);
    this.radius = radius;
  }
  override set radius(value: number) {
    super.radius = value;
    this.#vTopLeft = null;
  }
  override get radius(): number {
    return super.radius;
  }
  override set rotation(value: number) {
    super.rotation = value;
    this.#vTopLeft = null;
  }
  override get rotation(): number {
    return super.rotation;
  }
  get aabb(): AABB {
    const { a, b, c, d } = this.bb;
    return {
      min: {
        x: Math.min(a.x, b.x, c.x, d.x),
        y: Math.min(a.y, b.y, c.y, d.y),
      },
      max: {
        x: Math.max(a.x, b.x, c.x, d.x),
        y: Math.max(a.y, b.y, c.y, d.y),
      },
    };
  }
  get bb(): Rect {
    if (this.#vTopLeft === null) this.#vTopLeft = Vector.rotate({ x: -this.radius, y: -this.radius }, this.rotation);
    return {
      a: Point.add(this.position, this.#vTopLeft),
      b: Point.add(this.position, { x: -this.#vTopLeft.y, y: this.#vTopLeft.x }),
      c: Point.add(this.position, { x: -this.#vTopLeft.x, y: -this.#vTopLeft.y }),
      d: Point.add(this.position, { x: this.#vTopLeft.y, y: -this.#vTopLeft.x }),
    };
  }
  draw(context: CanvasRenderingContext2D, _light: PointLike, _maxLightDistance: number): void {
    const config = this.configRef.current;
    const { a, b, c, d } = this.bb;
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.lineTo(c.x, c.y);
    context.lineTo(d.x, d.y);
    context.closePath();
    if (config.drawBlur) {
      context.shadowBlur = 25;
      context.shadowColor = `hsl(${this.hue} 100 50 / ${this.opacity}%)`;
    }
    context.fillStyle = `hsl(${this.hue} 100 50 / ${this.opacity}%)`;
    context.fill();

    if (context.shadowBlur) context.shadowBlur = 0;
  }
  override step(millis: number, bounds: PointLike): void {
    this.rotation += 0.001;
    super.step(millis, bounds);
  }
}
