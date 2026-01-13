import type { RefObject } from 'react';
import { type Config, ShadingType } from '@/hooks/config';
import { type AABB, circleIntersectsPoly, Point, type PointLike, polyIntersectsPoly, Vector, type VectorLike } from '@/lib/2d';
import { Utils } from '@/lib/utils';

export enum Hull {
  Circle,
  Square,
}

export abstract class Entity {
  #radius;
  #radius2;

  #age: number;
  #dragging: boolean;
  // TODO: currently unhandled
  #fixed: boolean;
  #hue: number;
  #opacity: number;
  #position: Point;
  #rotation: number;
  // TODO: currently unhandled
  #rotationalVelocity: number;
  #velocity: Vector;

  constructor(
    protected configRef: RefObject<Config>,
    {
      age = 0,
      dragging = false,
      fixed = false,
      hue,
      opacity = 100,
      position,
      radius,
      rotation = 0,
      rotationalVelocity = 0,
      velocity,
    }: {
      age?: number;
      dragging?: boolean;
      fixed?: boolean;
      hue: number;
      opacity?: number;
      position: Point;
      radius: number;
      rotation?: number;
      rotationalVelocity?: number;
      velocity?: Vector;
    }
  ) {
    this.#age = age;
    this.#dragging = dragging;
    this.#fixed = fixed;
    this.#hue = hue;
    this.#opacity = opacity;
    this.#position = position;
    this.#rotation = rotation;
    this.#rotationalVelocity = rotationalVelocity;
    this.#velocity = velocity ?? new Vector(0, 0);
    // trying to use the radius setter from the constructor gives `can't access private field or method: object is not the right class` due to js's `this` shennanigens
    this.#radius = radius;
    this.#radius2 = radius ** 2;
  }

  set radius(value: number) {
    this.#radius = value;
    this.#radius2 = value ** 2;
  }
  get radius(): number {
    return this.#radius;
  }
  get radius2(): number {
    return this.#radius2;
  }
  set age(value: number) {
    this.#age = value;
  }
  get age(): number {
    return this.#age;
  }
  set dragging(value: boolean) {
    this.#dragging = value;
    this.#age = 0;
  }
  get dragging(): boolean {
    return this.#dragging;
  }
  set fixed(value: boolean) {
    this.#fixed = value;
  }
  get fixed(): boolean {
    return this.#fixed;
  }
  set hue(value: number) {
    this.#hue = value;
  }
  get hue(): number {
    return this.#hue;
  }
  set opacity(value: number) {
    this.#opacity = value;
  }
  get opacity(): number {
    return this.#opacity;
  }
  set position(value: Point) {
    this.#position = value;
  }
  get position(): Point {
    return this.#position;
  }
  set rotation(value: number) {
    this.#rotation = value;
  }
  get rotation(): number {
    return this.#rotation;
  }
  set rotationalVelocity(value: number) {
    this.#rotationalVelocity = value;
  }
  get rotationalVelocity(): number {
    return this.#rotationalVelocity;
  }
  set velocity(value: Vector) {
    this.#velocity = value;
  }
  get velocity(): Vector {
    return this.#velocity;
  }

  abstract get mass(): number;
  abstract get aabb(): AABB;
  abstract get points(): PointLike[];

  /** returns false or collision normal */
  intersects(other: Entity): false | Vector {
    if (this.aabb.min.x > other.aabb.max.x || this.aabb.max.x < other.aabb.min.x || this.aabb.min.y > other.aabb.max.y || this.aabb.max.y < other.aabb.min.y)
      return false;
    const vec = Vector.sub(other.position, this.position);
    if (this instanceof Circle && other instanceof Circle) {
      return Vector.hypot2(vec) < (this.radius + other.radius) ** 2 ? new Vector(vec).unitEq() : false;
    }
    if (this instanceof Circle && other instanceof Square) {
      return circleIntersectsPoly(this, other) ? new Vector(vec).unitEq() : false;
    }
    if (this instanceof Square && other instanceof Circle) {
      return circleIntersectsPoly(other, this) ? new Vector(vec).unitEq() : false;
    }
    if (this instanceof Square && other instanceof Square) {
      return polyIntersectsPoly(this, other) ? new Vector(vec).unitEq() : false;
    }
    throw new Error(`cannot test intersection between ${this.constructor.name} and ${other.constructor.name}`);
  }
  // /** returns false or collision normal */
  // intersectsOld(other: Entity): false | Vector {
  //   if (this.aabb.min.x > other.aabb.max.x || this.aabb.max.x < other.aabb.min.x || this.aabb.min.y > other.aabb.max.y || this.aabb.max.y < other.aabb.min.y)
  //     return false;

  //   if (this.hull === Hull.Circle && other.hull === Hull.Circle) {
  //     const vec = Vector.sub(other.position, this.position);
  //     if (Vector.hypot2(vec) < (this.radius + other.radius) ** 2) return new Vector(vec).unitEq();
  //     return false;
  //   }

  //   if (this.hull === Hull.Circle && other.hull === Hull.Square) {
  //     return Entity.#circleIntersectsPoly(this, other) ? new Vector(other.position).subEq(this.position).unitEq() : false;

  //     // // clamping this.position to other's aabb is from here https://stackoverflow.com/a/1879223
  //     // /** closest point to us in other's aabb (not necessarily inside others bb) */
  //     // const ptOtherAabbClosest = Point.clamp(this.position, other.aabb.min, other.aabb.max);
  //     // const vecOtherAabbClosest = Vector.sub(ptOtherAabbClosest, this.position);

  //     // // simulation.step has already tested the aabbs overlap. return early if closest point to us in other's aabb is outside our radius
  //     // if (Vector.hypot2(vecOtherAabbClosest) > this.radius2) return false;

  //     // // test for other's corners inside our radius
  //     // for (const otherPoint of [other.bb.a, other.bb.b, other.bb.c, other.bb.d]) {
  //     //   const inside = Vector.hypot2(Vector.sub(otherPoint, this.position)) < this.radius2;
  //     //   if (inside) return new Vector(other.position).subEq(this.position).unitEq();
  //     // }

  //     // /** closest point to other's aabb on our circumference */
  //     // const ptThisClosest = Point.add(this.position, Vector.mult(Vector.unit(vecOtherAabbClosest), this.radius));
  //     // const lineToClosest: LineLike = { a: this.position, b: ptThisClosest };

  //     // // test for line from this.position to ptThisClosest intersecting any line of other
  //     // for (const otherLine of [
  //     //   { a: other.bb.a, b: other.bb.b },
  //     //   { a: other.bb.b, b: other.bb.c },
  //     //   { a: other.bb.c, b: other.bb.d },
  //     //   { a: other.bb.d, b: other.bb.a },
  //     // ] satisfies LineLike[]) {
  //     //   const intersection = Line.intersection(lineToClosest, otherLine, false);
  //     //   if (intersection) return new Vector(other.position).subEq(this.position).unitEq();
  //     // }

  //     // // // test for other's corners inside our radius
  //     // // let countCornersInside = 0;
  //     // // const totalCornerCollisionVector: VectorLike = { x: 0, y: 0 };
  //     // // for (const otherPoint of [other.bb.a, other.bb.b, other.bb.c, other.bb.d]) {
  //     // //   const vec = Vector.sub(otherPoint, this.position);
  //     // //   const inside = Vector.hypot2(vec) < this.radius2;
  //     // //   if (!inside) continue;
  //     // //   ++countCornersInside;
  //     // //   totalCornerCollisionVector.x += vec.x;
  //     // //   totalCornerCollisionVector.y += vec.y;
  //     // // }

  //     // // // if corners inside, return avg collision normal. invert if one entity encloses the other (may need to revisit)
  //     // // if (countCornersInside) {
  //     // //   const enclosed = Vector.hypot2(Vector.sub(other.position, this.position)) < Math.min(this.radius2, other.radius2);
  //     // //   const normal = new Vector(totalCornerCollisionVector).unitEq();
  //     // //   if (enclosed) return normal.multEq(-1);
  //     // //   return normal;
  //     // // }

  //     // // /** closest point to other's aabb on our circumference */
  //     // // const ptThisClosest = Point.add(this.position, Vector.mult(Vector.unit(vecOtherAabbClosest), this.radius));
  //     // // const lineToClosest: LineLike = { a: this.position, b: ptThisClosest };
  //     // // for (const otherLine of [
  //     // //   { a: other.bb.a, b: other.bb.b },
  //     // //   { a: other.bb.b, b: other.bb.c },
  //     // //   { a: other.bb.c, b: other.bb.d },
  //     // //   { a: other.bb.d, b: other.bb.a },
  //     // // ] satisfies LineLike[]) {
  //     // //   const intersection = Line.intersection(lineToClosest, otherLine, false);
  //     // //   if (!intersection) continue;
  //     // //   // no corners are in our radius so there can only be one intersecting line
  //     // //   // return new Vector(intersection).subEq(this.position).unitEq();
  //     // //   return new Vector(other.position).subEq(this.position).unitEq();
  //     // // }

  //     // return false;
  //   }

  //   if (this.hull === Hull.Square && other.hull === Hull.Circle) {
  //     return Entity.#circleIntersectsPoly(other, this) ? new Vector(other.position).subEq(this.position).unitEq() : false;
  //     // /** closest point to other in our aabb (nor neccessarily inside our bb) */
  //     // const ptThisAabbClosest = Point.clamp(other.position, this.aabb.min, this.aabb.max);
  //     // const vecThisAabbClosest = Vector.sub(ptThisAabbClosest, other.position);

  //     // // simulation.step has already tested the aabbs overlap. return early if closest point to other in our aabb is outside other's radius
  //     // if (Vector.hypot2(vecThisAabbClosest) > other.radius2) return false;

  //     // // test for our corners inside other's radius
  //     // for (const thisPoint of [this.bb.a, this.bb.b, this.bb.c, this.bb.d]) {
  //     //   const inside = Vector.hypot2(Vector.sub(other.position, thisPoint)) < other.radius2;
  //     //   if (inside) return new Vector(other.position).subEq(this.position).unitEq();
  //     // }

  //     // /** closest point to our aabb on other's circumference */
  //     // const ptOtherClosest = Point.add(other.position, Vector.mult(Vector.unit(vecThisAabbClosest), other.radius));
  //     // const lineToClosest: LineLike = { a: this.position, b: ptOtherClosest };

  //     // // test for line from this.position to ptThisClosest intersecting any line of other
  //     // for (const thisLine of [
  //     //   { a: this.bb.a, b: this.bb.b },
  //     //   { a: this.bb.b, b: this.bb.c },
  //     //   { a: this.bb.c, b: this.bb.d },
  //     //   { a: this.bb.d, b: this.bb.a },
  //     // ] satisfies LineLike[]) {
  //     //   const intersection = Line.intersection(lineToClosest, thisLine, false);
  //     //   if (intersection) return new Vector(other.position).subEq(this.position).unitEq();
  //     // }

  //     // // // test for our corners inside others radius
  //     // // let countCornersInside = 0;
  //     // // const totalCornerCollisionVector: VectorLike = { x: 0, y: 0 };
  //     // // for (const thisPoint of [this.bb.a, this.bb.b, this.bb.c, this.bb.d]) {
  //     // //   // flipped compared to circle->square
  //     // //   const vec = Vector.sub(other.position, thisPoint);
  //     // //   const inside = Vector.hypot2(vec) < other.radius2;
  //     // //   if (!inside) continue;
  //     // //   ++countCornersInside;
  //     // //   totalCornerCollisionVector.x += vec.x;
  //     // //   totalCornerCollisionVector.y += vec.y;
  //     // // }

  //     // // // if corners inside, return avg collision normal. invert if one entity encloses the other (may need to revisit)
  //     // // if (countCornersInside) {
  //     // //   const enclosed = Vector.hypot2(Vector.sub(other.position, this.position)) < Math.min(this.radius2, other.radius2);
  //     // //   const normal = new Vector(totalCornerCollisionVector).unitEq();
  //     // //   if (enclosed) return normal.multEq(-1);
  //     // //   return normal;(2 * value) ** 2
  //     // // }

  //     // // /** closest point to this aabb on others circumference */
  //     // // const ptOtherClosest = Point.add(this.position, Vector.mult(Vector.unit(vecThisAabbClosest), other.radius));
  //     // // const lineToClosest: LineLike = { a: other.position, b: ptOtherClosest };
  //     // // for (const thisLine of [
  //     // //   { a: this.bb.a, b: this.bb.b },
  //     // //   { a: this.bb.b, b: this.bb.c },
  //     // //   { a: this.bb.c, b: this.bb.d },
  //     // //   { a: this.bb.d, b: this.bb.a },
  //     // // ] satisfies LineLike[]) {
  //     // //   const intersection = Line.intersection(lineToClosest, thisLine, false);
  //     // //   if (!intersection) continue;
  //     // //   // no corners are in others radius so there can only be one intersecting line
  //     // //   // return new Vector(intersection).subEq(this.position).unitEq().multEq(-1);
  //     // //   return new Vector(other.position).subEq(this.position).unitEq();
  //     // // }

  //     // return false;
  //   }

  //   if (this.hull === Hull.Square && other.hull === Hull.Square) {
  //     return Entity.#polyIntersectsPoly(this, other) ? new Vector(other.position).subEq(this.position).unitEq() : false;
  //     // // quite cursed but the maths works https://www.geeksforgeeks.org/dsa/how-to-check-if-a-given-point-lies-inside-a-polygon/
  //     // const thisBb = this.bb;
  //     // const thisPoints = [thisBb.a, thisBb.b, thisBb.c, thisBb.d];
  //     // const otherBb = other.bb;
  //     // const otherPoints = [otherBb.a, otherBb.b, otherBb.c, otherBb.d];

  //     // // find all bb points of other inside our bb
  //     // const otherInsideThis = otherPoints
  //     //   .map((otherPoint) => {
  //     //     let inside = false;
  //     //     for (let p = 1; p <= thisPoints.length; ++p) {
  //     //       const thisPointA = thisPoints[p - 1];
  //     //       const thisPointB = thisPoints[p % thisPoints.length];
  //     //       if (otherPoint.y <= Math.min(thisPointA.y, thisPointB.y)) continue;
  //     //       if (otherPoint.y > Math.max(thisPointA.y, thisPointB.y)) continue;
  //     //       if (otherPoint.x > Math.max(thisPointA.x, thisPointB.x)) continue;
  //     //       const xIntersect = ((otherPoint.y - thisPointA.y) * (thisPointB.x - thisPointA.x)) / (thisPointB.y - thisPointA.y) + thisPointA.x;
  //     //       if (thisPointA.x === thisPointB.x || otherPoint.x <= xIntersect) inside = !inside;
  //     //     }
  //     //     return { point: otherPoint, inside };
  //     //   })
  //     //   .filter(({ inside }) => inside);

  //     // // find all bb points of this inside other bb
  //     // const thisInsideOther = thisPoints
  //     //   .map((thisPoint) => {
  //     //     let inside = false;
  //     //     for (let p = 1; p <= otherPoints.length; ++p) {
  //     //       const otherPointA = otherPoints[p - 1];
  //     //       const otherPointB = otherPoints[p % otherPoints.length];
  //     //       if (thisPoint.y <= Math.min(otherPointA.y, otherPointB.y)) continue;
  //     //       if (thisPoint.y > Math.max(otherPointA.y, otherPointB.y)) continue;
  //     //       if (thisPoint.x > Math.max(otherPointA.x, otherPointB.x)) continue;
  //     //       const xIntersect = ((thisPoint.y - otherPointA.y) * (otherPointB.x - otherPointA.x)) / (otherPointB.y - otherPointA.y) + otherPointA.x;
  //     //       if (otherPointA.x === otherPointB.x || thisPoint.x <= xIntersect) inside = !inside;
  //     //     }
  //     //     return { point: thisPoint, inside };
  //     //   })
  //     //   .filter(({ inside }) => inside);

  //     // if (otherInsideThis.length === 0 && thisInsideOther.length === 0) return false;

  //     // // // return the average normal of all intersecting points
  //     // // return new Vector(
  //     // //   [
  //     // //     ...otherInsideThis.map(({ point }) => Vector.sub(point, this.position)),
  //     // //     ...thisInsideOther.map(({ point }) => Vector.sub(other.position, point)),
  //     // //   ].reduce((acc, item) => {
  //     // //     acc.x += item.x;
  //     // //     acc.y += item.y;
  //     // //     return acc;
  //     // //   })
  //     // // ).unitEq();

  //     // return new Vector(other.position).subEq(this.position).unitEq();
  //   }

  //   throw new Error(`cannot test intersection between ${this.hull} and ${other.hull}`);
  // }
  collide(other: Entity): void {
    const collisionNormal = this.intersects(other);
    if (!collisionNormal) return;
    const normalVelocityDp = other.velocity.sub(this.velocity).dot(collisionNormal);

    if (normalVelocityDp > 0) return;

    const impulse = Math.max(
      this.configRef.current.minImpulse,
      (-(1 + this.configRef.current.restitutionCoefficient) * normalVelocityDp) / (1 / this.mass + 1 / other.mass)
    );
    const impulseVector = collisionNormal.mult(impulse);

    this.velocity.subEq(impulseVector.div(this.mass)).multEq(this.configRef.current.collideVelocityRatio);
    other.velocity.addEq(impulseVector.div(other.mass)).multEq(this.configRef.current.collideVelocityRatio);

    //TODO: doing this properly requires the vector of the collision point. `intersects` currently returns the normal of other.pos-this.pos since that gives more stable results for position
    this.rotationalVelocity += Math.sqrt(impulse / other.mass) * Math.round(Math.random() * 2 - 1);
    this.rotationalVelocity += Math.sqrt(impulse / this.mass) * Math.round(Math.random() * 2 - 1);
  }
  step(millis: number, bounds: PointLike): void {
    const config = this.configRef.current;
    if (!this.#dragging) {
      this.velocity.addEq(Vector.mult(config.gravity, 0.003));
      this.position.addEq(this.velocity.mult(millis));
      this.rotation += this.rotationalVelocity * 0.01;
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
    this.rotationalVelocity *= config.rotationalVelocityRatio;
  }
  abstract draw(context: CanvasRenderingContext2D, light: PointLike, maxLightDistance: number): void;
}

export class Circle extends Entity {
  #mass = 0;
  constructor(...params: ConstructorParameters<typeof Entity>) {
    super(...params);
    this.radius = super.radius;
  }
  override set radius(value: number) {
    super.radius = value;
    this.#mass = Math.PI * value ** 2;
  }
  override get radius() {
    return super.radius;
  }
  get mass(): number {
    return this.#mass;
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
  get points(): PointLike[] {
    return [];
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
  #mass = 0;
  #vTopLeft: VectorLike | null = null;
  constructor(...params: ConstructorParameters<typeof Entity>) {
    super(...params);
    this.radius = super.radius;
  }
  get mass(): number {
    return this.#mass;
  }
  override set radius(value: number) {
    super.radius = value;
    this.#mass = 4 * value ** 2;
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
    const points = this.points;
    let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const point of points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
    return {
      min: { x: minX, y: minY },
      max: { x: maxX, y: maxY },
    };
  }
  get points(): PointLike[] {
    if (this.#vTopLeft === null) this.#vTopLeft = Vector.rotate({ x: -this.radius, y: -this.radius }, this.rotation);
    return [
      Point.add(this.position, this.#vTopLeft),
      Point.add(this.position, { x: -this.#vTopLeft.y, y: this.#vTopLeft.x }),
      Point.add(this.position, { x: -this.#vTopLeft.x, y: -this.#vTopLeft.y }),
      Point.add(this.position, { x: this.#vTopLeft.y, y: -this.#vTopLeft.x }),
    ];
  }
  draw(context: CanvasRenderingContext2D, _light: PointLike, _maxLightDistance: number): void {
    const config = this.configRef.current;
    const [start, ...points] = this.points;
    context.beginPath();
    context.moveTo(start.x, start.y);
    for (const point of points) context.lineTo(point.x, point.y);
    context.closePath();
    if (config.drawBlur) {
      context.shadowBlur = 25;
      context.shadowColor = `hsl(${this.hue} 100 50 / ${this.opacity}%)`;
    }
    context.fillStyle = `hsl(${this.hue} 100 50 / ${this.opacity}%)`;
    context.fill();

    if (context.shadowBlur) context.shadowBlur = 0;
  }
}
