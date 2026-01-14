import { ShadingType } from '@/hooks/config';
import { type AABB, Point, type PointLike } from '@/lib/2d/core';
import { circleIntersectsCircle, circleIntersectsPoly, pointInCircle } from '@/lib/2d/helpers';
import { Entity } from '@/lib/entity/base';
import { Utils } from '@/lib/utils';

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
  intersects(other: Entity): boolean {
    if (this.aabb.min.x > other.aabb.max.x || this.aabb.max.x < other.aabb.min.x || this.aabb.min.y > other.aabb.max.y || this.aabb.max.y < other.aabb.min.y)
      return false;
    if (other instanceof Circle) return circleIntersectsCircle(this, other);
    return circleIntersectsPoly(this, other);
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
  contains(point: PointLike): boolean {
    return pointInCircle(point, this);
  }
}
