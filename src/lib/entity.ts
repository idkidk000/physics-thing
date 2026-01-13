import type { RefObject } from 'react';
import type { Config } from '@/hooks/config';
import { type AABB, type Point, type PointLike, Vector } from '@/lib/2d';

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
  #rotationalVelocity: number;
  #velocity: Vector;
  #cos: number | null = null;
  #sin: number | null = null;

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

  collide(other: Entity): void {
    if (!this.intersects(other)) return;

    const collisionNormal = new Vector(other.position).subEq(this.position).unitEq();
    const velocityVector = other.velocity.sub(this.velocity);
    const normalVelocityDp = velocityVector.dot(collisionNormal);

    if (normalVelocityDp > 0) return;

    const impulse = Math.max(
      this.configRef.current.minImpulse,
      (-(1 + this.configRef.current.restitutionCoefficient) * normalVelocityDp) / (1 / this.mass + 1 / other.mass)
    );
    const impulseVector = collisionNormal.mult(impulse);

    this.velocity.subEq(impulseVector.div(this.mass)).multEq(this.configRef.current.collideVelocityRatio);
    other.velocity.addEq(impulseVector.div(other.mass)).multEq(this.configRef.current.collideVelocityRatio);

    // TODO: doing this properly requires the vector to the collision point
    this.rotationalVelocity += (impulse / other.mass) * Math.round(Math.random() * 2 - 1) * this.configRef.current.collideRotationalVelocityRatio;
    this.rotationalVelocity += (impulse / this.mass) * Math.round(Math.random() * 2 - 1) * this.configRef.current.collideRotationalVelocityRatio;

    if (this.fixed || other.fixed) {
      const idk = collisionNormal.mult(Math.max(1, velocityVector.hypot()));
      if (other.fixed) this.position.subEq(idk);
      if (this.fixed) other.position.addEq(idk);
    }
  }
  step(millis: number, bounds: PointLike): void {
    const config = this.configRef.current;
    if (!this.#dragging && !this.#fixed) {
      this.velocity.addEq(Vector.mult(config.gravity, 0.003));
      this.position.addEq(this.velocity.mult(millis));
    }
    this.rotation += this.rotationalVelocity * 0.01;

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
  abstract draw(context: CanvasRenderingContext2D, light: PointLike, maxLightDistance: number): void;
}
