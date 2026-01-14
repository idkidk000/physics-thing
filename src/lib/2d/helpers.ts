import { type CircleLike, type LineLike, Point, type PointLike, type PolyLike, Vector } from '@/lib/2d/core';

export function pointInCircle(point: PointLike, circle: CircleLike): boolean {
  return Vector.hypot2(Vector.sub(point, circle.position)) < circle.radius2;
}

export function pointInPoly(point: PointLike, poly: PolyLike): boolean {
  let intersections = 0;
  for (let pp = 1; pp <= poly.points.length; ++pp) {
    const polyLine: LineLike = { a: poly.points[pp - 1], b: poly.points[pp % poly.points.length] };
    if (point.y < polyLine.a.y && point.y < polyLine.b.y) continue;
    if (point.y > polyLine.a.y && point.y > polyLine.b.y) continue;
    if (point.x > polyLine.a.x && point.x > polyLine.b.x) continue;
    if (polyLine.a.x === polyLine.b.x || point.x <= ((point.y - polyLine.a.y) * (polyLine.b.x - polyLine.a.x)) / (polyLine.b.y - polyLine.a.y) + polyLine.a.x)
      ++intersections;
  }
  return !!(intersections & 1);
}

export function circleIntersectsCircle(a: CircleLike, b: CircleLike): boolean {
  return Vector.hypot2(Vector.sub(b.position, a.position)) < (a.radius + b.radius) ** 2;
}

export function circleIntersectsPoly(circle: CircleLike, poly: PolyLike): boolean {
  for (const point of poly.points) if (pointInCircle(point, circle)) return true;
  /** closest point to circle's position in poly's aabb */
  const ptAabbClosest = Point.clamp(circle.position, poly.aabb.min, poly.aabb.max);
  const vecAabbClosest = Vector.sub(Point.eq(circle.position, ptAabbClosest) ? poly.position : ptAabbClosest, circle.position);
  const circumferenceClosest = Point.add(circle.position, Vector.mult(Vector.unit(vecAabbClosest), circle.radius));
  if (pointInPoly(circumferenceClosest, poly)) return true;
  return false;
}

export function polyIntersectsPoly(a: PolyLike, b: PolyLike): boolean {
  for (const point of a.points) if (pointInPoly(point, b)) return true;
  for (const point of b.points) if (pointInPoly(point, a)) return true;
  return false;
}

/** shoelace */
export function polyArea(poly: PolyLike): number {
  return (
    [...poly.points, poly.points[0]].reduce((acc, p0, i, arr) => {
      const p1 = arr[(i + 1) % arr.length];
      acc += p0.x * p1.y - p0.y * p1.x;
      return acc;
    }, 0) / 2
  );
}
