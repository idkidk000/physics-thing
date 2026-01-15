import { ShadingType } from '@/hooks/config';
import { type AABBLike, Point, type PointLike, Vector, type VectorLike } from '@/lib/2d/core';
import { polyArea } from '@/lib/2d/helpers';
import { Entity } from '@/lib/entity/base';
import { Utils } from '@/lib/utils';

const shape: VectorLike[] = [
  { x: 0.22, y: -0.31 },
  { x: 0.95, y: -0.31 },
  { x: 0.36, y: 0.12 },
  { x: 0.59, y: 0.81 },
  { x: 0, y: 0.38 },
  { x: -0.59, y: 0.81 },
  { x: -0.36, y: 0.12 },
  { x: -0.95, y: -0.31 },
  { x: -0.22, y: -0.31 },
  { x: 0, y: -1 },
];

export class Star extends Entity {
  #mass = 0;
  /** invalidation key for `#points` */
  #pointsPosition: PointLike | null = null;
  #points: PointLike[] | null = null;
  #aabb: AABBLike | null = null;
  constructor(...params: ConstructorParameters<typeof Entity>) {
    super(...params);
    this.radius = super.radius;
  }
  get mass(): number {
    return this.#mass;
  }
  override set radius(value: number) {
    super.radius = value;
    this.#pointsPosition = null;
    this.#mass = polyArea(this);
  }
  override get radius(): number {
    return super.radius;
  }
  override set rotation(value: number) {
    super.rotation = value;
    this.#pointsPosition = null;
  }
  override get rotation(): number {
    return super.rotation;
  }
  get aabb(): AABBLike {
    if (!this.#aabb || !this.#pointsPosition || !Point.eq(this.#pointsPosition, this.position)) {
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
    if (!this.#points || !this.#pointsPosition || !Point.eq(this.#pointsPosition, this.position))
      this.#points = shape.map((vec) => Point.add(this.position, Vector.rotate(Vector.mult(vec, this.radius), this.cos, this.sin)));
    return this.#points;
  }
  draw(context: CanvasRenderingContext2D, light: PointLike, maxLightDistance: number): void {
    Star.draw(this, context, light, maxLightDistance);
  }

  static draw(item: Star, context: CanvasRenderingContext2D, light: PointLike, maxLightDistance: number): void {
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

      context.beginPath();
      context.moveTo(item.points[0].x, item.points[0].y);
      for (let p = 2; p <= item.points.length + 1; p += 2) {
        const p0 = item.points[p - 2];
        const p1 = item.points[(p - 1) % item.points.length];
        const p2 = item.points[p % item.points.length];
        context.lineTo(p0.x, p0.y);
        context.arcTo(p1.x, p1.y, p2.x, p2.y, item.radius * 0.03);
        context.lineTo(p2.x, p2.y);
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
        const highlightCenter = Point.sub(item.position, Vector.mult(lightUnit, item.radius * lightDistanceRatio));
        const gradient = context.createRadialGradient(highlightCenter.x, highlightCenter.y, 0, item.position.x, item.position.y, item.radius * Math.SQRT2);
        gradient.addColorStop(0, `hsl(${item.hue} 100 ${Utils.lerp(80, 60, 1, lightDistanceRatio)} / ${item.opacity}%)`);
        gradient.addColorStop(1, `hsl(${item.hue} 100 ${Utils.lerp(40, 25, 1, lightDistanceRatio)} / ${item.opacity}%)`);
        context.fillStyle = gradient;
        context.fill();
      }
    }

    if (context.shadowBlur) context.shadowBlur = 0;
  }
}
