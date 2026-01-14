import { type AABB, Point, type PointLike, Vector, type VectorLike } from '@/lib/2d/core';
import { circleIntersectsPoly, pointInPoly, polyArea, polyIntersectsPoly } from '@/lib/2d/helpers';
import { Entity } from '@/lib/entity/base';
import { Circle } from '@/lib/entity/circle';

export class Heart extends Entity {
  #mass = 0;
  #pointsPosition: PointLike | null = null;
  #points: PointLike[] | null = null;
  #aabb: AABB | null = null;
  #shape: VectorLike[] = [
    { x: 0, y: -0.66 },
    { x: 0.33, y: -1 },
    { x: 0.66, y: -1 },
    { x: 1, y: -0.66 },
    { x: 1, y: 0 },
    { x: 0.66, y: 0.66 },
    { x: 0, y: 1 },
    { x: -0.66, y: 0.66 },
    { x: -1, y: 0 },
    { x: -1, y: -0.66 },
    { x: -0.66, y: -1 },
    { x: -0.33, y: -1 },
  ];
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
  get aabb(): AABB {
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
      this.#points = this.#shape.map((vec) => Point.add(this.position, Vector.rotate(Vector.mult(vec, this.radius), this.cos, this.sin)));
    return this.#points;
  }
  intersects(other: Entity): boolean {
    if (this.aabb.min.x > other.aabb.max.x || this.aabb.max.x < other.aabb.min.x || this.aabb.min.y > other.aabb.max.y || this.aabb.max.y < other.aabb.min.y)
      return false;
    if (other instanceof Circle) return circleIntersectsPoly(other, this);
    return polyIntersectsPoly(this, other);
  }
  draw(context: CanvasRenderingContext2D, _light: PointLike, _maxLightDistance: number): void {
    const config = this.configRef.current;
    context.closePath();
    if (config.drawBlur) {
      context.shadowBlur = 25;
      context.shadowColor = `hsl(${this.hue} 100 50 / ${this.opacity}%)`;
    }
    const [start, ...points] = this.points;
    context.beginPath();
    context.moveTo(start.x, start.y);
    for (const point of points) context.lineTo(point.x, point.y);
    context.closePath();
    context.fillStyle = `hsl(${this.hue} 100 50 / ${this.opacity}%)`;
    context.fill();

    if (context.shadowBlur) context.shadowBlur = 0;
  }
  contains(point: PointLike): boolean {
    return this.aabb.min.x <= point.x && this.aabb.max.x >= point.x && this.aabb.min.y <= point.y && this.aabb.max.y >= point.y && pointInPoly(point, this);
  }
}
