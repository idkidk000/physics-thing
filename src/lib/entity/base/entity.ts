/** biome-ignore-all lint/suspicious/useAdjacentOverloadSignatures: biome bug */
import type { RefObject } from 'react';
import type { Config } from '@/hooks/config';
import { AABB, type AABBLike, Point, type PointLike, Vector, type VectorLike } from '@/lib/2d/core';
import * as Helpers from '@/lib/2d/helpers';

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
  #collisions: { at: number; colllision: VectorLike }[] = [];
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
  /** constructor.name is arbitary after minification. this allows sorting to work in the expected way */
  abstract get displayName(): string;
  /** `static abstract` isn't valid syntax, but implement a static `draw` method and call it from an instanced method of the same name */
  abstract draw(context: CanvasRenderingContext2D, light: PointLike, maxLightDistance: number): void;

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
    if (this.#collisions.length) this.#collisions = this.#collisions.filter((item) => this.#age - item.at < age);
  }

  static contains(item: Entity, point: PointLike): boolean {
    return AABB.contains(item.aabb, point) && (item.points.length ? Helpers.pointInPoly(point, item) : Helpers.pointInCircle(point, item));
  }
  static intersects(item: Entity, other: Entity): false | PointLike {
    // AABB intersection has already been tested by simulation.step
    // if (!AABB.intersects(this.aabb, other.aabb)) return false;
    const itemPoints = item.points;
    const otherPoints = other.points;
    if (itemPoints.length && otherPoints.length) return Helpers.polyIntersectsPoly(item, other);
    if (itemPoints.length) return Helpers.circleIntersectsPoly(other, item);
    if (otherPoints.length) return Helpers.circleIntersectsPoly(item, other);
    return Helpers.circleIntersectsCircle(item, other);
  }
  static collide(item: Entity, other: Entity): void {
    const started = performance.now();
    // the first found intersecting point. not ideal but hopefully good enough for rotational velocity
    const collisionPoint = item.intersects(other);
    if (!collisionPoint) {
      item.#collisionTime += performance.now() - started;
      return;
    }
    const config = item.configRef.current;

    const collisionVector = Vector.sub(Point.eq(collisionPoint, item.position) ? other.position : collisionPoint, item.position);
    const collisionNormal = Vector.unit(collisionVector);
    const velocityVector = Vector.sub(other.velocity, item.velocity);
    const collisionVelocityDp = Vector.dot(velocityVector, collisionNormal);

    // if (normalVelocityDp > 0) return;

    if (config.showDebug) item.#collisions.push({ at: item.#age, colllision: collisionVector });

    const impulse = Math.max(config.minImpulse, (-(1 + config.restitutionCoefficient) * collisionVelocityDp) / (1 / item.mass + 1 / other.mass));
    const impulseVector = Vector.mult(collisionNormal, impulse);

    if (!item.fixed) item.velocity.subEq(Vector.div(impulseVector, item.mass)).multEq(config.collideVelocityRatio);
    if (!other.fixed) other.velocity.addEq(Vector.div(impulseVector, other.mass)).multEq(config.collideVelocityRatio);

    // actively move collliders out of static objects by 1 unit
    if (other.fixed && !item.fixed) item.position.subEq(collisionNormal);
    if (item.fixed && !other.fixed) other.position.addEq(collisionNormal);

    // this part is completely vibes-based
    const velocity = Vector.hypot(velocityVector);
    const perpendicularDp = Vector.dot(Vector.rotate(Vector.div(velocityVector, velocity || 1), Math.PI * 0.5), collisionNormal);
    const rotationalImpulse = (velocity / (item.radius + other.radius)) * perpendicularDp * 0.1 * config.collideRotationalVelocityRatio;
    item.rotationalVelocity -= rotationalImpulse * item.radius;
    other.rotationalVelocity += rotationalImpulse * other.radius;

    item.#collisionTime += performance.now() - started;
  }
  static step(item: Entity, millis: number, bounds: PointLike): void {
    const config = item.configRef.current;

    if (!item.#dragging && !item.#fixed) {
      item.velocity.addEq(Vector.mult(config.gravity, millis * 0.0002));
      item.position.addEq(item.velocity.mult(millis));
      item.rotation += item.rotationalVelocity * 0.01;
    }

    const aabb = item.aabb;
    const hitX = aabb.min.x < 0 ? 1 : aabb.max.x > bounds.x ? 2 : 0;
    const hitY = aabb.min.y < 0 ? 1 : aabb.max.y > bounds.y ? 2 : 0;

    if (hitX || hitY) {
      const velocity = item.velocity.hypot();
      const velocityPerpUnit = Vector.rotate(Vector.div(item.velocity, velocity || 1), Math.PI * 0.5);

      for (const point of item.points) {
        if (point.x >= 0 && point.x <= bounds.x && point.y >= 0 && point.y <= bounds.y) continue;
        const collisionVector = Vector.sub(point, item.position);
        const collisionNormal = Vector.div(collisionVector, item.radius || 1);
        const rotationalVelocity =
          velocity * Vector.dot(velocityPerpUnit, collisionNormal) * config.collideRotationalVelocityRatio * config.rotationalVelocityRatio;
        // don't let small amounts of velocity accumulate over time
        if (Math.abs(rotationalVelocity) > Math.abs(item.rotationalVelocity)) item.rotationalVelocity += rotationalVelocity;
        item.#collisions.push({ at: item.#age, colllision: collisionVector });
      }

      item.position.set({
        x: item.position.x - (hitX === 1 ? aabb.min.x : hitX === 2 ? aabb.max.x - bounds.x : 0),
        y: item.position.y - (hitY === 1 ? aabb.min.y : hitY === 2 ? aabb.max.y - bounds.y : 0),
      });

      item.velocity.multEq({
        x: hitX ? -config.collideVelocityRatio * config.stepVelocityRatio : config.stepVelocityRatio,
        y: hitY ? -config.collideVelocityRatio * config.stepVelocityRatio : config.stepVelocityRatio,
      });
    } else {
      item.velocity.multEq(config.stepVelocityRatio);
      item.rotationalVelocity *= config.rotationalVelocityRatio;
    }
  }
  static drawDebug(item: Entity, context: CanvasRenderingContext2D): void {
    context.strokeStyle = '#0f0';
    const aabb = item.aabb;
    context.strokeRect(aabb.min.x, aabb.min.y, aabb.max.x - aabb.min.x, aabb.max.y - aabb.min.y);
    context.fillStyle = '#0f0';
    context.textBaseline = 'bottom';
    context.textAlign = 'right';
    // `Number.prototype.toLocaleString` is very slow in firefox
    context.fillText(
      `{ x: ${item.velocity.x.toFixed(2)}, y: ${item.velocity.y.toFixed(2)}, r: ${item.rotationalVelocity.toFixed(2)} }${item.fixed ? ' f' : ''} ${item.#collisionTime.toFixed(1)}ms`,
      aabb.max.x,
      aabb.min.y
    );
    if (item.#collisions.length) {
      context.strokeStyle = '#ff0';
      context.beginPath();
      for (const { colllision } of item.#collisions) {
        context.moveTo(item.position.x, item.position.y);
        const endPoint = Point.add(item.position, colllision);
        context.lineTo(endPoint.x, endPoint.y);
      }
      context.stroke();
    }
    const points = item.points;
    context.strokeStyle = '#f0f';
    context.fillStyle = '#f0f';
    if (points.length) {
      context.beginPath();
      context.moveTo(points[0].x, points[0].y);
      for (const point of [...points.slice(1), points[0]]) context.lineTo(point.x, point.y);
      context.stroke();
      for (const point of points) {
        context.beginPath();
        context.arc(point.x, point.y, 3, 0, Math.PI * 2);
        context.fill();
      }
    } else {
      context.beginPath();
      context.arc(item.position.x, item.position.y, item.radius, 0, Math.PI * 2);
      context.stroke();
    }
    context.beginPath();
    context.arc(item.position.x, item.position.y, 5, 0, Math.PI * 2);
    context.fill();
  }
  static zero(item: Entity): void {
    item.velocity.set({ x: 0, y: 0 });
    item.rotationalVelocity = 0;
    item.rotation = 0;
  }
}
