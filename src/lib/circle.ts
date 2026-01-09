import type { RefObject } from 'react';
import type { Config } from '@/hooks/config';
import { type Point, type PointLike, Vector } from '@/lib/2d';

export class Circle {
  #idleCount = 0;
  #radius = 0;
  #mass = 0;
  #moved = false;
  #dragging = false;
  immortal = false;
  age = 0;
  #configRef: RefObject<Config>;
  constructor(
    configRef: RefObject<Config>,
    public position: Point,
    public velocity: Vector,
    radius: number,
    public hue: number,
    public opacity: number = 100
  ) {
    this.#configRef = configRef;
    this.radius = radius;
  }
  get idle() {
    return this.#idleCount >= this.#configRef.current.idleSteps;
  }
  get radius() {
    return this.#radius;
  }
  set radius(value: number) {
    this.#radius = value;
    this.#mass = Math.PI * value ** 2;
  }
  get mass() {
    return this.#mass;
  }
  get left() {
    return this.position.x - this.radius;
  }
  get right() {
    return this.position.x + this.radius;
  }
  get top() {
    return this.position.y - this.radius;
  }
  get bottom() {
    return this.position.y + this.radius;
  }
  get dragging() {
    return this.#dragging;
  }
  set dragging(value: boolean) {
    this.#dragging = value;
    if (value) this.age = 0;
  }
  step(millis: number, bounds: PointLike): void {
    const config = this.#configRef.current;
    const idleThreshold2 = config.idleThreshold ** 2;
    if (!this.#dragging) {
      this.velocity.addEq(Vector.mult(config.gravity, 0.03));
      if (this.#moved) this.#idleCount = 0;
      else ++this.#idleCount;
      const offset = this.velocity.mult(millis);
      this.#moved = offset.hypot2() >= idleThreshold2;
      this.position.addEq(offset);
    }
    if (this.left < 0) {
      this.position.x = this.radius;
      this.velocity.x *= -config.collideVelocityRatio;
    } else if (this.right > bounds.x) {
      this.position.x = bounds.x - this.radius;
      this.velocity.x *= -config.collideVelocityRatio;
    }
    if (this.top < 0) {
      this.position.y = this.radius;
      this.velocity.y *= -config.collideVelocityRatio;
    } else if (this.bottom > bounds.y) {
      this.position.y = bounds.y - this.radius;
      this.velocity.y *= -config.collideVelocityRatio;
    }
    this.velocity.multEq(config.stepVelocityRatio);
  }
  intersects(other: Circle): boolean {
    if (other.bottom < this.top || other.top > this.bottom) return false;
    return this.position.hypot2(other.position) < (this.radius + other.radius) ** 2;
  }
  collide(other: Circle): void {
    // https://github.com/matthias-research/pages/blob/master/tenMinutePhysics/23-SAP.html
    // https://youtu.be/euypZDssYxE
    if (!this.intersects(other)) return;
    const collisionNormal = other.position.sub(this.position).toVector().unitEq();
    const normalVelocityDp = other.velocity.sub(this.velocity).dot(collisionNormal);

    if (normalVelocityDp > 0) return;

    const impulse = (-(1 + this.#configRef.current.restitutionCoefficient) * normalVelocityDp) / (1 / this.mass + 1 / other.mass);
    const impulseVector = collisionNormal.mult(impulse);

    this.velocity.subEq(impulseVector.div(this.mass)).multEq(this.#configRef.current.collideVelocityRatio);
    other.velocity.addEq(impulseVector.div(other.mass)).multEq(this.#configRef.current.collideVelocityRatio);
  }
  draw(context: CanvasRenderingContext2D): void {
    const config = this.#configRef.current;
    context.beginPath();
    context.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    context.closePath();
    context.fillStyle = `hsl(${this.hue} 100 50 / ${this.opacity}%)`;
    if (config.drawBlur) {
      context.shadowBlur = 25;
      context.shadowColor = `hsl(${this.hue} 100 50 / ${this.opacity}%)`;
    }
    context.fill();
    if (config.drawBlur) context.shadowBlur = 0;

    if (config.drawHighlight || config.drawShadow) {
      context.save();
      context.clip();
    }

    if (config.drawHighlight) {
      context.beginPath();
      context.arc(this.position.x, this.position.y, this.radius, Math.PI * 0.75, Math.PI * 1.75);
      context.arc(this.position.x + this.radius * 0.8, this.position.y + this.radius * 0.8, this.radius * 1.5, Math.PI * 1.75, Math.PI * 0.75, true);
      context.closePath();
      context.fillStyle = `hsl(${this.hue} 100 80 / ${this.opacity}%)`;
      context.fill();
    }

    if (config.drawShadow) {
      context.beginPath();
      context.arc(this.position.x, this.position.y, this.radius, Math.PI * -0.25, Math.PI * 0.75);
      context.arc(this.position.x - this.radius * 0.8, this.position.y - this.radius * 0.8, this.radius * 1.5, Math.PI * 0.75, Math.PI * -0.25, true);
      context.closePath();
      context.fillStyle = `hsl(${this.hue} 100 30 / ${this.opacity}%)`;
      context.fill();
    }

    if (config.drawHighlight || config.drawShadow) context.restore();
  }
}
