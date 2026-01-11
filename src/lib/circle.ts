import type { RefObject } from 'react';
import { type Config, Shading } from '@/hooks/config';
import { Point, type PointLike, Vector } from '@/lib/2d';
import { Utils } from '@/lib/utils';

export class Circle {
  #radius = 0;
  #mass = 0;
  #dragging = false;
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
    if (!this.#dragging) {
      this.velocity.addEq(Vector.mult(config.gravity, 0.003));
      this.position.addEq(this.velocity.mult(millis));
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
  draw(context: CanvasRenderingContext2D, light: PointLike, maxLightDistance: number): void {
    const config = this.#configRef.current;
    context.beginPath();
    context.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    context.closePath();
    if (config.drawBlur) {
      context.shadowBlur = 25;
      context.shadowColor = `hsl(${this.hue} 100 50 / ${this.opacity}%)`;
    }

    if (config.shading === Shading.TwoTone || config.shading === Shading.Gradient) {
      const lightOffset = Point.sub(this.position, light);
      const lightDistance = Point.hypot(lightOffset);
      const lightUnit = Point.div(lightOffset, lightDistance);
      const lightDistanceRatio = lightDistance / maxLightDistance;

      if (config.shading === Shading.Gradient) {
        const lightRatio = Utils.lerp(0.3, 0.1, 1, lightDistanceRatio);
        const shadowRatio = Utils.lerp(0.6, 0.9, 1, lightDistanceRatio);

        const gradientCenter = Point.sub(this.position, Point.mult(lightUnit, this.radius * (0.9 - lightRatio)));
        const gradient = context.createRadialGradient(gradientCenter.x, gradientCenter.y, 0, this.position.x, this.position.y, this.radius);
        gradient.addColorStop(lightRatio, `hsl(${this.hue} 100 ${Utils.lerp(80, 60, 1, lightDistanceRatio)} / ${this.opacity}%)`);
        gradient.addColorStop(shadowRatio, `hsl(${this.hue} 100 ${Utils.lerp(40, 25, 1, lightDistanceRatio)} / ${this.opacity}%)`);
        context.fillStyle = gradient;
        context.fill();
      }

      if (config.shading === Shading.TwoTone) {
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
