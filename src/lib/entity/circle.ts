import { ShadingType } from '@/hooks/config';
import { type AABBLike, Point, type PointLike } from '@/lib/2d/core';
import { Entity } from '@/lib/entity/base/entity';
import * as Utils from '@/lib/utils';

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
  get aabb(): AABBLike {
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
  get displayName() {
    return 'Circle';
  }
  // biome-ignore lint/suspicious/noEmptyBlockStatements: nothing to do
  invalidatePoints(): void {}
  draw(context: CanvasRenderingContext2D, light: PointLike, maxLightDistance: number): void {
    Circle.draw(this, context, light, maxLightDistance);
  }

  static draw(item: Circle, context: CanvasRenderingContext2D, light: PointLike, maxLightDistance: number): void {
    const config = item.configRef.current;
    context.beginPath();
    context.arc(item.position.x, item.position.y, item.radius, 0, Math.PI * 2);
    context.closePath();
    if (config.drawBlur) {
      context.shadowBlur = 25;
      context.shadowColor = `hsl(${item.hue} 100 50 / ${item.opacity}%)`;
    }

    if (config.shadingType === ShadingType.TwoTone || config.shadingType === ShadingType.Gradient) {
      const lightOffset = Point.sub(item.position, light);
      const lightDistance = Point.hypot(lightOffset);
      const lightUnit = Point.div(lightOffset, lightDistance);
      const lightDistanceRatio = lightDistance / maxLightDistance;

      if (config.shadingType === ShadingType.Gradient) {
        const lightRatio = Utils.lerp(0.3, 0.1, 1, lightDistanceRatio);
        const shadowRatio = Utils.lerp(0.6, 0.9, 1, lightDistanceRatio);

        const gradientCenter = Point.sub(item.position, Point.mult(lightUnit, item.radius * (0.9 - lightRatio)));
        const gradient = context.createRadialGradient(gradientCenter.x, gradientCenter.y, 0, item.position.x, item.position.y, item.radius);
        gradient.addColorStop(lightRatio, `hsl(${item.hue} 100 ${Utils.lerp(80, 60, 1, lightDistanceRatio)} / ${item.opacity}%)`);
        gradient.addColorStop(shadowRatio, `hsl(${item.hue} 100 ${Utils.lerp(40, 25, 1, lightDistanceRatio)} / ${item.opacity}%)`);
        context.fillStyle = gradient;
        context.fill();
      }

      if (config.shadingType === ShadingType.TwoTone) {
        const shadowRatio = Utils.lerp(0.3, 0.9, 1, lightDistanceRatio);
        context.fillStyle = `hsl(${item.hue} 100 ${Utils.lerp(50, 25, 1, lightDistanceRatio)} / ${item.opacity}%)`;
        context.fill();

        const highlightCenter = Point.sub(item.position, Point.mult(lightUnit, item.radius * (1 - shadowRatio)));
        context.beginPath();
        context.arc(highlightCenter.x, highlightCenter.y, item.radius * shadowRatio, 0, Math.PI * 2);
        context.closePath();
        context.fillStyle = `hsl(${item.hue} 100 ${Utils.lerp(80, 50, 1, 1 - (1 - lightDistanceRatio) ** 2)} / ${item.opacity}%)`;
        context.fill();
      }
    } else {
      context.fillStyle = `hsl(${item.hue} 100 50 / ${item.opacity}%)`;
      context.fill();
    }

    if (context.shadowBlur) context.shadowBlur = 0;
  }
}
