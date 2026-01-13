import { ShadingType } from '@/hooks/config';
import { type AABB, circleIntersectsPoly, Point, type PointLike, polyIntersectsPoly, Vector } from '@/lib/2d';
import { Circle } from '@/lib/circle';
import { Entity } from '@/lib/entity';
import { Utils } from '@/lib/utils';

/** radius is origin to middle of a side, not corner */
export class Square extends Entity {
  #mass = 0;
  #pointsPosition: PointLike | null = null;
  #points: PointLike[] | null = null;
  #aabb: AABB | null = null;
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
    this.#pointsPosition = null;
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
  get aabb(): AABB {
    if (!this.#aabb || !this.#pointsPosition || !Point.eq(this.#pointsPosition, this.position)) {
      const points = this.points;
      let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
      for (const point of points) {
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
    if (!this.#points || !this.#pointsPosition || !Point.eq(this.#pointsPosition, this.position)) {
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
  intersects(other: Entity): boolean {
    if (this.aabb.min.x > other.aabb.max.x || this.aabb.max.x < other.aabb.min.x || this.aabb.min.y > other.aabb.max.y || this.aabb.max.y < other.aabb.min.y)
      return false;
    if (this instanceof Circle && other instanceof Circle) {
      return Vector.hypot2(Vector.sub(other.position, this.position)) < (this.radius + other.radius) ** 2;
    }
    if (this instanceof Circle && other instanceof Square) {
      return circleIntersectsPoly(this, other);
    }
    if (this instanceof Square && other instanceof Circle) {
      return circleIntersectsPoly(other, this);
    }
    if (this instanceof Square && other instanceof Square) {
      return polyIntersectsPoly(this, other);
    }
    throw new Error(`cannot test intersection between ${this.constructor.name} and ${other.constructor.name}`);
  }
  draw(context: CanvasRenderingContext2D, light: PointLike, maxLightDistance: number): void {
    const config = this.configRef.current;
    context.closePath();
    if (config.drawBlur) {
      context.shadowBlur = 25;
      context.shadowColor = `hsl(${this.hue} 100 50 / ${this.opacity}%)`;
    }
    if (config.shadingType === ShadingType.Flat) {
      const [start, ...points] = this.points;
      context.beginPath();
      context.moveTo(start.x, start.y);
      for (const point of points) context.lineTo(point.x, point.y);
      context.closePath();
      context.fillStyle = `hsl(${this.hue} 100 50 / ${this.opacity}%)`;
      context.fill();
    } else {
      const lightOffset = Point.sub(this.position, light);
      const lightDistance = Point.hypot(lightOffset);
      const lightDistanceRatio = lightDistance / maxLightDistance;
      const lightAngle = Vector.toRadians(lightOffset);

      const top = Point.add(this.position, Vector.rotate({ x: 0, y: -this.radius }, this.cos, this.sin));
      const topRight = Point.add(this.position, Vector.rotate({ x: this.radius, y: -this.radius }, this.cos, this.sin));
      const right = Point.add(this.position, Vector.rotate({ x: this.radius, y: 0 }, this.cos, this.sin));
      const bottomRight = Point.add(this.position, Vector.rotate({ x: this.radius, y: this.radius }, this.cos, this.sin));
      const bottom = Point.add(this.position, Vector.rotate({ x: 0, y: this.radius }, this.cos, this.sin));
      const bottomLeft = Point.add(this.position, Vector.rotate({ x: -this.radius, y: this.radius }, this.cos, this.sin));
      const left = Point.add(this.position, Vector.rotate({ x: -this.radius, y: 0 }, this.cos, this.sin));
      const leftTop = Point.add(this.position, Vector.rotate({ x: -this.radius, y: -this.radius }, this.cos, this.sin));

      context.beginPath();
      context.moveTo(top.x, top.y);

      context.arcTo(topRight.x, topRight.y, right.x, right.y, this.radius * 0.2);
      context.arcTo(bottomRight.x, bottomRight.y, bottom.x, bottom.y, this.radius * 0.2);
      context.arcTo(bottomLeft.x, bottomLeft.y, left.x, left.y, this.radius * 0.2);
      context.arcTo(leftTop.x, leftTop.y, top.x, top.y, this.radius * 0.2);

      context.closePath();

      if (this.configRef.current.shadingType === ShadingType.TwoTone) {
        context.fillStyle = `hsl(${this.hue} 100 ${Utils.lerp(80, 50, 1, 1 - (1 - lightDistanceRatio) ** 2)} / ${this.opacity}%)`;
        context.fill();

        context.save();
        context.clip();

        context.beginPath();
        const radiusToCorner = this.radius * Math.SQRT2;
        const shadowHeight = 1 - lightDistanceRatio;
        const shadowCos = Math.cos(lightAngle + Math.PI * -0.5);
        const shadowSin = Math.sin(lightAngle + Math.PI * -0.5);

        const shadowBottomRight = Point.add(this.position, Vector.rotate({ x: radiusToCorner, y: radiusToCorner }, shadowCos, shadowSin));
        const shadowBottomLeft = Point.add(this.position, Vector.rotate({ x: -radiusToCorner, y: radiusToCorner }, shadowCos, shadowSin));
        const shadowTopLeft = Point.add(this.position, Vector.rotate({ x: -radiusToCorner, y: -this.radius * shadowHeight }, shadowCos, shadowSin));
        const shadowControl = Point.add(this.position, Vector.rotate({ x: 0, y: radiusToCorner - this.radius * shadowHeight }, shadowCos, shadowSin));
        const shadowTopRight = Point.add(this.position, Vector.rotate({ x: radiusToCorner, y: -this.radius * shadowHeight }, shadowCos, shadowSin));

        context.moveTo(shadowBottomRight.x, shadowBottomRight.y);
        context.lineTo(shadowBottomLeft.x, shadowBottomLeft.y);
        context.lineTo(shadowTopLeft.x, shadowTopLeft.y);
        context.arcTo(shadowControl.x, shadowControl.y, shadowTopRight.x, shadowTopRight.y, this.radius);
        context.lineTo(shadowTopRight.x, shadowTopRight.y);
        context.closePath();
        context.fillStyle = `hsl(${this.hue} 100 ${Utils.lerp(50, 25, 1, lightDistanceRatio)} / 50%)`;

        context.fill();

        context.restore();
      } else {
        const lightUnit = Vector.unit(lightOffset);
        const highlightCenter = Point.sub(this.position, Vector.mult(lightUnit, this.radius * lightDistanceRatio));
        const gradient = context.createRadialGradient(highlightCenter.x, highlightCenter.y, 0, this.position.x, this.position.y, this.radius * Math.SQRT2);
        gradient.addColorStop(0, `hsl(${this.hue} 100 ${Utils.lerp(80, 60, 1, lightDistanceRatio)} / ${this.opacity}%)`);
        gradient.addColorStop(1, `hsl(${this.hue} 100 ${Utils.lerp(40, 25, 1, lightDistanceRatio)} / ${this.opacity}%)`);
        context.fillStyle = gradient;
        context.fill();
      }
    }

    if (context.shadowBlur) context.shadowBlur = 0;
  }
}
