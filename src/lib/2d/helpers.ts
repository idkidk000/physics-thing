import { AABB, type CircleLike, type LineLike, Point, type PointLike, type PolyLike, Vector } from '@/lib/2d/core';

export function pointInCircle(point: PointLike, circle: CircleLike): boolean {
  return Vector.hypot2(Vector.sub(point, circle.position)) < circle.radius2;
}

export function pointInPoly(point: PointLike, poly: PolyLike): boolean {
  if (!AABB.contains(poly.aabb, point)) return false;
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

export function circleIntersectsCircle(a: CircleLike, b: CircleLike): PointLike | false {
  const vec = Vector.sub(b.position, a.position);
  if (Vector.hypot2(vec) >= (a.radius + b.radius) ** 2) return false;
  return Point.add(a.position, Vector.mult(vec, 0.5));
}

export function circleIntersectsPoly(circle: CircleLike, poly: PolyLike): PointLike | false {
  // position is included to prevent fallback to unstable [circumference closest] when circle is inside poly
  for (const point of [poly.position, ...poly.points]) if (pointInCircle(point, circle)) return point;
  /** closest point to circle's position in poly's aabb */
  const ptAabbClosest = Point.clamp(circle.position, poly.aabb.min, poly.aabb.max);
  const vecAabbClosest = Vector.sub(Point.eq(circle.position, ptAabbClosest) ? poly.position : ptAabbClosest, circle.position);
  const circumferenceClosest = Point.add(circle.position, Vector.mult(Vector.unit(vecAabbClosest), circle.radius));
  if (pointInPoly(circumferenceClosest, poly)) return circumferenceClosest;
  return false;
}

/** this would also reqire line intersection checks if a or b could be rectangles */
export function polyIntersectsPoly(a: PolyLike, b: PolyLike): PointLike | false {
  for (const point of a.points) if (pointInPoly(point, b)) return point;
  for (const point of b.points) if (pointInPoly(point, a)) return point;
  // for (let pa = 1; pa <= a.points.length; ++pa) {
  //   const lineA: LineLike = { a: a.points[pa - 1], b: a.points[pa % a.points.length] };
  //   let intersections = 0;
  //   for (let pb = 1; pb <= b.points.length; ++pb) {
  //     const lineB: LineLike = { a: b.points[pb - 1], b: b.points[pb % b.points.length] };
  //     if (lineA.a.y < lineB.a.y && lineA.a.y < lineB.b.y) continue;
  //     if (lineA.a.y > lineB.a.y && lineA.a.y > lineB.b.y) continue;
  //     if (lineA.a.x > lineB.a.x && lineA.a.x > lineB.b.x) continue;
  //     const intersection = Line.intersection(lineA, lineB);
  //     if (intersection) return intersection;
  //     if (lineB.a.x === lineB.b.x || lineA.a.x <= ((lineA.a.y - lineB.a.y) * (lineB.b.x - lineB.a.x)) / (lineB.b.y - lineB.a.y) + lineB.a.x) ++intersections;
  //   }
  //   if (intersections & 0x1) return lineA.a;
  // }
  // for (const point of b.points) if (pointInPoly(point, a)) return point;
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
