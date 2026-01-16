import { ShadingType } from '@/hooks/config';
import { type AABBLike, Point, type PointLike, Vector, type VectorLike } from '@/lib/2d/core';
import * as Helpers from '@/lib/2d/helpers';
import { Entity } from '@/lib/entity/base/entity';
import * as Utils from '@/lib/utils';

export interface VectorLikeWithRadius extends VectorLike {
  r: number;
}

export abstract class PolyEntity extends Entity {
  #mass = 0;
  #points: PointLike[] | null = null;
  #aabb: AABBLike | null = null;
  constructor(...params: ConstructorParameters<typeof Entity>) {
    super(...params);
    this.radius = super.radius;
    this.position.hook(() => this.#invalidatePoints());
  }
  /** `aabb` and `points` getters are hot paths so need very simple cache validation logic
   *
   * called by `radius` and `rotation` setters, and by `position` hook
   */
  #invalidatePoints(): void {
    this.#points = null;
    this.#aabb = null;
  }
  override set radius(value: number) {
    super.radius = value;
    this.#mass = Helpers.polyArea(this);
    this.#invalidatePoints();
  }
  override get radius(): number {
    return super.radius;
  }
  get mass(): number {
    return this.#mass;
  }
  override set rotation(value: number) {
    super.rotation = value;
    this.#invalidatePoints();
  }
  override get rotation(): number {
    return super.rotation;
  }
  get aabb(): AABBLike {
    if (!this.#aabb) {
      let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
      for (const point of this.points) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
      this.#aabb = {
        min: { x: minX, y: minY },
        max: { x: maxX, y: maxY },
      };
    }
    return this.#aabb;
  }
  get points(): PointLike[] {
    if (!this.#points) this.#points = this.shape.map((vec) => Point.add(this.position, Vector.rotate(Vector.mult(vec, this.radius), this.cos, this.sin)));
    return this.#points;
  }

  abstract get shape(): VectorLikeWithRadius[];

  draw(context: CanvasRenderingContext2D, light: PointLike, maxLightDistance: number): void {
    PolyEntity.draw(this, context, light, maxLightDistance);
  }

  static draw(item: PolyEntity, context: CanvasRenderingContext2D, light: PointLike, maxLightDistance: number): void {
    const config = item.configRef.current;
    context.closePath();
    if (config.drawBlur) {
      context.shadowBlur = 25;
      context.shadowColor = `hsl(${item.hue} 100 50 / ${item.opacity}%)`;
    }
    if (config.shadingType === ShadingType.Flat) {
      const [start, ...points] = item.points;
      context.beginPath();
      context.moveTo(start.x, start.y);
      for (const point of points) context.lineTo(point.x, point.y);
      context.closePath();
      context.fillStyle = `hsl(${item.hue} 100 50 / ${item.opacity}%)`;
      context.fill();
    } else {
      const lightOffset = Point.sub(item.position, light);
      const lightDistance = Point.hypot(lightOffset);
      const lightDistanceRatio = lightDistance / maxLightDistance;
      const lightAngle = Vector.toRadians(lightOffset);

      const points = item.points;
      const shape = item.shape;
      context.beginPath();
      context.moveTo(points[points.length - 1].x, points[points.length - 1].y);

      for (let p = 0; p < points.length; ++p) {
        const p0 = points[p];
        const p1 = points[(p + 1) % points.length];
        const radius = shape[p].r;
        context.arcTo(p0.x, p0.y, p1.x, p1.y, radius * item.radius);
      }

      context.closePath();

      if (item.configRef.current.shadingType === ShadingType.TwoTone) {
        context.fillStyle = `hsl(${item.hue} 100 ${Utils.lerp(80, 50, 1, 1 - (1 - lightDistanceRatio) ** 2)} / ${item.opacity}%)`;
        context.fill();

        context.save();
        context.clip();

        context.beginPath();
        const radiusToCorner = item.radius * Math.SQRT2;
        const shadowHeight = 1 - lightDistanceRatio;
        const shadowCos = Math.cos(lightAngle + Math.PI * -0.5);
        const shadowSin = Math.sin(lightAngle + Math.PI * -0.5);

        const shadowBottomRight = Point.add(item.position, Vector.rotate({ x: radiusToCorner, y: radiusToCorner }, shadowCos, shadowSin));
        const shadowBottomLeft = Point.add(item.position, Vector.rotate({ x: -radiusToCorner, y: radiusToCorner }, shadowCos, shadowSin));
        const shadowTopLeft = Point.add(item.position, Vector.rotate({ x: -radiusToCorner, y: -item.radius * shadowHeight }, shadowCos, shadowSin));
        const shadowControl = Point.add(item.position, Vector.rotate({ x: 0, y: radiusToCorner - item.radius * shadowHeight }, shadowCos, shadowSin));
        const shadowTopRight = Point.add(item.position, Vector.rotate({ x: radiusToCorner, y: -item.radius * shadowHeight }, shadowCos, shadowSin));

        context.moveTo(shadowBottomRight.x, shadowBottomRight.y);
        context.lineTo(shadowBottomLeft.x, shadowBottomLeft.y);
        context.lineTo(shadowTopLeft.x, shadowTopLeft.y);
        context.arcTo(shadowControl.x, shadowControl.y, shadowTopRight.x, shadowTopRight.y, item.radius);
        context.lineTo(shadowTopRight.x, shadowTopRight.y);
        context.closePath();
        context.fillStyle = `hsl(${item.hue} 100 ${Utils.lerp(50, 25, 1, lightDistanceRatio)} / 50%)`;

        context.fill();

        context.restore();
      } else {
        const lightUnit = Vector.unit(lightOffset);
        // const highlightCenter = Point.sub(item.position, Vector.mult(lightUnit, item.radius * lightDistanceRatio));
        // const gradient = context.createRadialGradient(highlightCenter.x, highlightCenter.y, 0, item.position.x, item.position.y, item.radius * Math.SQRT2);
        // gradient.addColorStop(0, `hsl(${item.hue} 100 ${Utils.lerp(80, 60, 1, lightDistanceRatio)} / ${item.opacity}%)`);
        // gradient.addColorStop(1, `hsl(${item.hue} 100 ${Utils.lerp(40, 25, 1, lightDistanceRatio)} / ${item.opacity}%)`);
        // context.fillStyle = gradient;
        // context.fill();
        const lightRatio = Utils.lerp(0.3, 0.1, 1, lightDistanceRatio);
        const shadowRatio = 1; //Utils.lerp(0.6, 0.9, 1, lightDistanceRatio);

        const gradientCenter = Point.sub(item.position, Point.mult(lightUnit, item.radius * (0.9 - lightRatio)));
        const gradient = context.createRadialGradient(gradientCenter.x, gradientCenter.y, 0, item.position.x, item.position.y, item.radius);
        gradient.addColorStop(lightRatio, `hsl(${item.hue} 100 ${Utils.lerp(80, 60, 1, lightDistanceRatio)} / ${item.opacity}%)`);
        gradient.addColorStop(shadowRatio, `hsl(${item.hue} 100 ${Utils.lerp(40, 25, 1, lightDistanceRatio)} / ${item.opacity}%)`);
        context.fillStyle = gradient;
        context.fill();
      }
    }

    if (context.shadowBlur) context.shadowBlur = 0;
  }
}
