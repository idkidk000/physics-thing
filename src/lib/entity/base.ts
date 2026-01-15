/** biome-ignore-all lint/suspicious/useAdjacentOverloadSignatures: biome bug */
import type { RefObject } from 'react';
import type { Config } from '@/hooks/config';
import { AABB, type AABBLike, Point, type PointLike, Vector, type VectorLike } from '@/lib/2d/core';
import { circleIntersectsCircle, circleIntersectsPoly, pointInCircle, pointInPoly, polyIntersectsPoly } from '@/lib/2d/helpers';

const localeCfg = [undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 }] as const;

export abstract class Entity {
  #radius;
  #radius2;
  #age: number;
  #dragging: boolean;
  #fixed: boolean;
  #hue: number;
  #opacity: number;
  #position: Point;
  #rotation: number;
  #rotationalVelocity: number;
  #velocity: Vector;
  #cos: number | null = null;
  #sin: number | null = null;
  #collisions: { at: number; colllision: VectorLike; velocity: VectorLike }[] = [];
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: biome bug
  #collisionTime = 0;

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
    // trying to use the radius setter from the constructor gives `can't access private field or method: object is not the right class` due to js's `this` shenanigans
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
    this.#cos = null;
    this.#sin = null;
  }
  get rotation(): number {
    return this.#rotation;
  }
  get cos(): number {
    if (this.#cos === null) this.#cos = Math.cos(this.rotation);
    return this.#cos;
  }
  get sin(): number {
    if (this.#sin === null) this.#sin = Math.sin(this.rotation);
    return this.#sin;
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
  abstract get aabb(): AABBLike;
  abstract get points(): PointLike[];
  /** `static abstract` isn't valid syntax, but implement a `static` draw method and call it from an instanced method of the same name */
  abstract draw(context: CanvasRenderingContext2D, light: PointLike, maxLightDistance: number): void;
  /** an extremely grim workaround to simplify abstract points and aabb cached getters. but it's very good for performance and hooking `Point` would be worse
   *
   * **MUST BE CALLED AFTER UPDATING POSITION**
   *
   * rotation and radius are hooked already since they're just plain number properties
   */
  abstract invalidatePoints(): void;

  contains(point: PointLike): boolean {
    return Entity.contains(this, point);
  }
  intersects(other: Entity): false | PointLike {
    return Entity.intersects(this, other);
  }
  collide(other: Entity): void {
    Entity.collide(this, other);
  }
  step(millis: number, bounds: PointLike): void {
    Entity.step(this, millis, bounds);
  }
  drawDebug(context: CanvasRenderingContext2D): void {
    Entity.drawDebug(this, context);
  }
  zero() {
    Entity.zero(this);
  }
  clearDebug(age: number = 5) {
    if (this.#collisions.length) this.#collisions = this.#collisions.filter((item) => this.#age - item.at >= age);
  }

  static contains(item: Entity, point: PointLike): boolean {
    return AABB.contains(item.aabb, point) && (item.points.length ? pointInPoly(point, item) : pointInCircle(point, item));
  }
  static intersects(item: Entity, other: Entity): false | PointLike {
    // AABB intersection has already been tested by simulation.step
    // if (!AABB.intersects(this.aabb, other.aabb)) return false;
    const itemPoints = item.points;
    const otherPoints = other.points;
    if (itemPoints.length && otherPoints.length) return polyIntersectsPoly(item, other);
    if (itemPoints.length) return circleIntersectsPoly(other, item);
    if (otherPoints.length) return circleIntersectsPoly(item, other);
    return circleIntersectsCircle(item, other);
  }
  static collide(item: Entity, other: Entity): void {
    const started = performance.now();
    // the first found intersecting point. not ideal but hopefully good enough for rotational velocity
    const collisionPoint = item.intersects(other);
    if (!collisionPoint) {
      item.#collisionTime += performance.now() - started;
      return;
    }

    const collisionVector = Vector.sub(Point.eq(collisionPoint, item.position) ? other.position : collisionPoint, item.position);
    const collisionNormal = Vector.unit(collisionVector);
    const velocityVector = Vector.sub(other.velocity, item.velocity);
    const collisionVelocityDp = Vector.dot(velocityVector, collisionNormal);

    // if (normalVelocityDp > 0) return;

    if (item.configRef.current.showDebug) item.#collisions.push({ at: item.#age, colllision: collisionVector, velocity: velocityVector });

    const impulse = Math.max(
      item.configRef.current.minImpulse,
      (-(1 + item.configRef.current.restitutionCoefficient) * collisionVelocityDp) / (1 / item.mass + 1 / other.mass)
    );
    const impulseVector = Vector.mult(collisionNormal, impulse);

    if (!item.fixed) item.velocity.subEq(Vector.div(impulseVector, item.mass)).multEq(item.configRef.current.collideVelocityRatio);
    if (!other.fixed) other.velocity.addEq(Vector.div(impulseVector, other.mass)).multEq(item.configRef.current.collideVelocityRatio);

    // actively move collliders out of static objects by 1 unit
    if (other.fixed && !item.fixed) {
      item.position.subEq(collisionNormal);
      item.invalidatePoints();
    }
    if (item.fixed && !other.fixed) {
      other.position.addEq(collisionNormal);
      other.invalidatePoints();
    }

    const perpendicularDp = Vector.dot(Vector.rotate(Vector.unit(velocityVector), Math.PI * 0.5), collisionNormal);
    // TODO: this should be derived from velocityVector hypot, hypot of each object to collision point (like gears), and mass of each object (share of imparted rotational velocity)
    item.rotationalVelocity += (impulse / item.mass) * perpendicularDp * item.configRef.current.collideRotationalVelocityRatio;
    other.rotationalVelocity -= (impulse / other.mass) * perpendicularDp * item.configRef.current.collideRotationalVelocityRatio;

    item.#collisionTime += performance.now() - started;
  }
  static step(item: Entity, millis: number, bounds: PointLike): void {
    const config = item.configRef.current;
    if (!item.#dragging && !item.#fixed) {
      item.velocity.addEq(Vector.mult(config.gravity, millis * 0.0002));
      item.position.addEq(item.velocity.mult(millis));
      item.invalidatePoints();
      item.rotation += item.rotationalVelocity * 0.01;
    }

    // TODO: do rotational velocity properly
    let hit = false;
    const aabb = item.aabb;
    if (aabb.min.x < 0) {
      item.position.x -= aabb.min.x;
      item.velocity.x *= -config.collideVelocityRatio;
      hit = true;
    } else if (aabb.max.x > bounds.x) {
      item.position.x -= aabb.max.x - bounds.x;
      item.velocity.x *= -config.collideVelocityRatio;
      hit = true;
    }

    if (aabb.min.y < 0) {
      item.position.y -= aabb.min.y;
      item.velocity.y *= -config.collideVelocityRatio;
      hit = true;
    } else if (aabb.max.y > bounds.y) {
      item.position.y -= aabb.max.y - bounds.y;
      item.velocity.y *= -config.collideVelocityRatio;
      hit = true;
    }

    item.velocity.multEq(config.stepVelocityRatio);
    item.rotationalVelocity *= config.rotationalVelocityRatio * (hit ? config.collideRotationalVelocityRatio : 1);
    if (hit) item.invalidatePoints();
  }
  static drawDebug(item: Entity, context: CanvasRenderingContext2D): void {
    context.strokeStyle = '#0f0';
    const aabb = item.aabb;
    context.strokeRect(aabb.min.x, aabb.min.y, aabb.max.x - aabb.min.x, aabb.max.y - aabb.min.y);
    context.fillStyle = '#0f0';
    context.textBaseline = 'bottom';
    context.textAlign = 'right';
    context.fillText(
      `{ x: ${item.velocity.x.toLocaleString(...localeCfg)}, y: ${item.velocity.y.toLocaleString(...localeCfg)}, r: ${item.rotationalVelocity.toLocaleString(...localeCfg)} }${item.fixed ? ' f' : ''} ${item.#collisionTime.toLocaleString(...localeCfg)}`,
      aabb.max.x,
      aabb.min.y
    );
    if (item.#collisions.length) {
      context.strokeStyle = '#f00';
      context.beginPath();
      for (const { colllision } of item.#collisions) {
        context.moveTo(item.position.x, item.position.y);
        const endPoint = Point.add(item.position, colllision);
        context.lineTo(endPoint.x, endPoint.y);
      }
      context.stroke();

      context.strokeStyle = '#f70';
      context.beginPath();
      for (const { velocity } of item.#collisions) {
        context.moveTo(item.position.x, item.position.y);
        const endPoint = Point.add(item.position, velocity);
        context.lineTo(endPoint.x, endPoint.y);
      }
      context.stroke();
    }
    const points = item.points;
    if (points.length) {
      context.strokeStyle = '#f0f';
      context.beginPath();
      context.moveTo(points[0].x, points[0].y);
      for (const point of points.slice(1)) context.lineTo(point.x, point.y);
      context.closePath();
      context.stroke();
    }
  }
  static zero(item: Entity): void {
    item.velocity.set({ x: 0, y: 0 });
    item.rotationalVelocity = 0;
    item.rotation = 0;
  }
}
