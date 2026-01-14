import type { RefObject } from 'react';
import type { Config } from '@/hooks/config';
import { type AABB, Point, type PointLike, Vector, type VectorLike } from '@/lib/2d/core';

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
  #collisions: VectorLike[] = [];

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
  abstract get aabb(): AABB;
  abstract get points(): PointLike[];
  abstract intersects(other: Entity): boolean;
  abstract draw(context: CanvasRenderingContext2D, light: PointLike, maxLightDistance: number): void;
  abstract contains(point: PointLike): boolean;

  collide(other: Entity): void {
    if (!this.intersects(other)) return;

    const collisionVector = Vector.sub(other.position, this.position);
    if (this.configRef.current.showDebug) this.#collisions.push(collisionVector);
    const collisionNormal = Vector.unit(collisionVector);
    const velocityVector = Vector.sub(other.velocity, this.velocity);
    const normalVelocityDp = Vector.dot(velocityVector, collisionNormal);

    if (normalVelocityDp > 0.1) return;

    const impulse = Math.max(
      this.configRef.current.minImpulse,
      (-(1 + this.configRef.current.restitutionCoefficient) * normalVelocityDp) / (1 / this.mass + 1 / other.mass)
    );
    const impulseVector = Vector.mult(collisionNormal, impulse);

    this.velocity.subEq(Vector.div(impulseVector, this.mass)).multEq(this.configRef.current.collideVelocityRatio);
    other.velocity.addEq(Vector.div(impulseVector, other.mass)).multEq(this.configRef.current.collideVelocityRatio);

    if (other.fixed && !this.fixed) this.position.subEq(collisionNormal);
    if (this.fixed && !other.fixed) other.position.addEq(collisionNormal);

    // TODO: doing this properly requires the vector to the collision point
    if (Vector.hypot2(velocityVector) > this.configRef.current.minCollisionVelocityToImpartRotationalVelocity ** 2) {
      this.rotationalVelocity += (impulse / this.mass) * Math.round(Math.random() * 2 - 1) * this.configRef.current.collideRotationalVelocityRatio;
      other.rotationalVelocity += (impulse / other.mass) * Math.round(Math.random() * 2 - 1) * this.configRef.current.collideRotationalVelocityRatio;
    }
  }
  step(millis: number, bounds: PointLike): void {
    const config = this.configRef.current;
    if (!this.#dragging && !this.#fixed) {
      this.velocity.addEq(Vector.mult(config.gravity, 0.003));
      this.position.addEq(this.velocity.mult(millis));
      this.rotation += this.rotationalVelocity * 0.01;
    }

    let hit = false;
    if (this.aabb.min.x < 0) {
      this.position.x -= this.aabb.min.x;
      this.velocity.x *= -config.collideVelocityRatio;
      hit = true;
    } else if (this.aabb.max.x > bounds.x) {
      this.position.x -= this.aabb.max.x - bounds.x;
      this.velocity.x *= -config.collideVelocityRatio;
      hit = true;
    }

    if (this.aabb.min.y < 0) {
      this.position.y -= this.aabb.min.y;
      this.velocity.y *= -config.collideVelocityRatio;
      hit = true;
    } else if (this.aabb.max.y > bounds.y) {
      this.position.y -= this.aabb.max.y - bounds.y;
      this.velocity.y *= -config.collideVelocityRatio;
      hit = true;
    }

    this.velocity.multEq(config.stepVelocityRatio);
    this.rotationalVelocity *= config.rotationalVelocityRatio * (hit ? config.collideRotationalVelocityRatio : 1);
  }
  drawDebug(context: CanvasRenderingContext2D) {
    context.strokeStyle = '#0f0';
    context.strokeRect(this.aabb.min.x, this.aabb.min.y, this.aabb.max.x - this.aabb.min.x, this.aabb.max.y - this.aabb.min.y);
    context.fillStyle = '#0f0';
    context.textBaseline = 'bottom';
    context.textAlign = 'right';
    context.fillText(
      `{ x: ${this.velocity.x.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}, y: ${this.velocity.y.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}, r: ${this.rotationalVelocity.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })} }`,
      this.aabb.max.x,
      this.aabb.min.y
    );
    if (this.#collisions.length) {
      context.strokeStyle = '#f00';
      context.beginPath();
      for (const collisionVector of this.#collisions) {
        context.moveTo(this.position.x, this.position.y);
        const endPoint = Point.add(this.position, collisionVector);
        context.lineTo(endPoint.x, endPoint.y);
      }
      context.stroke();
      this.#collisions = [];
    }
    if (this.points.length) {
      context.strokeStyle = '#f0f';
      context.beginPath();
      context.moveTo(this.points[0].x, this.points[0].y);
      for (const point of this.points.slice(1)) context.lineTo(point.x, point.y);
      context.closePath();
      context.stroke();
    }
  }
  zero() {
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.rotationalVelocity = 0;
    this.rotation = 0;
  }
}
