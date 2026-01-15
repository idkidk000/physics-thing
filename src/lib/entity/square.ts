import { ShadingType } from '@/hooks/config';
import { type AABBLike, Point, type PointLike, Vector } from '@/lib/2d/core';
import { Entity } from '@/lib/entity/base';
import { Utils } from '@/lib/utils';

export class Square extends Entity {
  #mass = 0;
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
    this.#mass = 4 * value ** 2;
    this.invalidatePoints();
  }
  override get radius(): number {
    return super.radius;
  }
  override set rotation(value: number) {
    super.rotation = value;
    this.invalidatePoints();
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
    if (!this.#points) {
      const vTopLeft = Vector.rotate({ x: -this.radius, y: -this.radius }, this.cos, this.sin);
      this.#points = [
        Point.add(this.position, vTopLeft),
        Point.add(this.position, { x: -vTopLeft.y, y: vTopLeft.x }),
        Point.add(this.position, { x: -vTopLeft.x, y: -vTopLeft.y }),
        Point.add(this.position, { x: vTopLeft.y, y: -vTopLeft.x }),
      ];
    }
    return this.#points;
  }
  invalidatePoints(): void {
    this.#points = null;
    this.#aabb = null;
  }
  draw(context: CanvasRenderingContext2D, light: PointLike, maxLightDistance: number): void {
    Square.draw(this, context, light, maxLightDistance);
  }

  static draw(item: Square, context: CanvasRenderingContext2D, light: PointLike, maxLightDistance: number): void {
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

      const top = Point.add(item.position, Vector.rotate({ x: 0, y: -item.radius }, item.cos, item.sin));
      const topRight = Point.add(item.position, Vector.rotate({ x: item.radius, y: -item.radius }, item.cos, item.sin));
      const right = Point.add(item.position, Vector.rotate({ x: item.radius, y: 0 }, item.cos, item.sin));
      const bottomRight = Point.add(item.position, Vector.rotate({ x: item.radius, y: item.radius }, item.cos, item.sin));
      const bottom = Point.add(item.position, Vector.rotate({ x: 0, y: item.radius }, item.cos, item.sin));
      const bottomLeft = Point.add(item.position, Vector.rotate({ x: -item.radius, y: item.radius }, item.cos, item.sin));
      const left = Point.add(item.position, Vector.rotate({ x: -item.radius, y: 0 }, item.cos, item.sin));
      const leftTop = Point.add(item.position, Vector.rotate({ x: -item.radius, y: -item.radius }, item.cos, item.sin));

      context.beginPath();
      context.moveTo(top.x, top.y);

      context.arcTo(topRight.x, topRight.y, right.x, right.y, item.radius * 0.2);
      context.arcTo(bottomRight.x, bottomRight.y, bottom.x, bottom.y, item.radius * 0.2);
      context.arcTo(bottomLeft.x, bottomLeft.y, left.x, left.y, item.radius * 0.2);
      context.arcTo(leftTop.x, leftTop.y, top.x, top.y, item.radius * 0.2);

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
