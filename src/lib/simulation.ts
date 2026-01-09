import type { RefObject } from 'react';
import { type MouseState, MouseStateEvent } from '@/hooks/canvas';
import type { Config } from '@/hooks/config';
import type { EventEmitter, EventId } from '@/hooks/event';
import { Point, type PointLike, Vector } from '@/lib/2d';
import { Circle } from '@/lib/circle';
import { Utils } from '@/lib/utils';

export class Simulation {
  #objects: Circle[] = [];
  #activeObject: Circle | null = null;
  #configRef: RefObject<Config>;
  #deleteIxs = new Set<number>();
  #mouseRef: RefObject<MouseState>;
  #steps = 0;
  constructor(eventEmitter: EventEmitter<EventId>, configRef: RefObject<Config>, mouseRef: RefObject<MouseState>) {
    this.#configRef = configRef;
    this.#mouseRef = mouseRef;
    const signal = new AbortController().signal;
    eventEmitter.subscribe('clear', () => this.reset(), signal);
    eventEmitter.subscribe('dump', () => console.log(this.#objects), signal);
    // biome-ignore format: no
    eventEmitter.subscribe('grow', () => {
      if (this.#activeObject) ++this.#activeObject.radius;
      else for (const item of this.#objects) ++item.radius;
    }, signal);
    // biome-ignore format: no
    eventEmitter.subscribe('immortal', () => {
      if (this.#activeObject) this.#activeObject.immortal = !this.#activeObject.immortal;
      else {
        const immortal = this.#objects.at(0)?.immortal;
        for (const item of this.#objects) item.immortal = !immortal;
      }
    }, signal);
  }
  step(bounds: PointLike, position: PointLike, elapsedMillis: number) {
    const canvasMouse = Point.sub(this.#mouseRef.current, position);

    if (this.#mouseRef.current.event === MouseStateEvent.End) {
      if (this.#activeObject) {
        this.#activeObject.dragging = false;
        this.#activeObject = null;
      }
      this.#mouseRef.current.event = MouseStateEvent.None;
    } else if (this.#mouseRef.current.event === MouseStateEvent.Start) {
      if (!this.#activeObject) {
        this.#activeObject = this.#objects.find((item) => item.age > 20 && item.position.hypot2(canvasMouse) < item.radius ** 2) ?? null;
        if (this.#activeObject) this.#activeObject.dragging = true;
      }
      this.#mouseRef.current.event = MouseStateEvent.None;
    }
    if (this.#activeObject) {
      const { x, y } = this.#activeObject.position;
      this.#activeObject.position.x = canvasMouse.x;
      this.#activeObject.position.y = canvasMouse.y;
      this.#activeObject.velocity.addEq(this.#activeObject.position.sub({ x, y }).multEq(this.#configRef.current.dragVelocity));
    } else if (this.#mouseRef.current.buttons) {
      const left = this.#mouseRef.current.buttons & 0x1;
      const right = this.#mouseRef.current.buttons & 0x2;
      const direction = left && right ? undefined : left > 0;
      this.addObject(canvasMouse, direction);
    }

    if (this.#steps === 0 && this.#objects.length === 0) {
      for (let i = 0; i < this.#configRef.current.initialObjects; ++i)
        this.addObject({
          x: bounds.x * Math.random(),
          y: bounds.y * Math.random(),
        });
    }

    const physicsMillis = elapsedMillis / this.#configRef.current.physicsSteps;
    for (let step = 0; step < this.#configRef.current.physicsSteps; ++step) {
      for (const circle of this.#objects) circle.step(physicsMillis, bounds);
      // sweep and prune, but with random direction so items aren't pushed to one side
      // https://github.com/matthias-research/pages/blob/master/tenMinutePhysics/23-SAP.html
      // https://youtu.be/euypZDssYxE
      const left = Math.random() > 0.5;
      const sorted = this.#objects.toSorted(left ? (a, b) => a.left - b.left : (a, b) => b.right - a.right);
      for (let i = 0; i < sorted.length; ++i) {
        const item = sorted[i];
        for (let o = i + 1; o < sorted.length; ++o) {
          const other = sorted[o];
          if (left && other.left > item.right) break;
          if (!left && other.right < item.left) break;
          item.collide(other);
        }
      }
    }

    for (const [i, item] of this.#objects.entries()) {
      if (!item.dragging) ++item.age;
      if (!(item.immortal || item.dragging || this.#configRef.current.maxAge === 0) && (item.idle || item.age >= this.#configRef.current.maxAge))
        --item.opacity;
      else if (item.opacity < 100) ++item.opacity;
      if (item.opacity === 0) this.#deleteIxs.add(i);
    }

    if (this.#deleteIxs.size) {
      this.#objects = this.#objects.filter((_, i) => !this.#deleteIxs.has(i));
      this.#deleteIxs.clear();
    }

    ++this.#steps;
  }
  get objects() {
    return this.#objects;
  }
  get activeObject() {
    return this.#activeObject;
  }
  set activeObject(item: Circle | null) {
    if (this.#activeObject) this.#activeObject.dragging = false;
    this.#activeObject = item;
  }
  findObject(point: PointLike, minAge = 20) {
    return this.#objects.find((item) => item.age >= minAge && item.position.hypot2(point) < item.radius ** 2);
  }
  reset() {
    this.#activeObject = null;
    this.#objects = [];
    this.#steps = 0;
  }
  addObject(point: PointLike, left?: boolean) {
    this.#objects.push(
      new Circle(
        this.#configRef,
        new Point(point),
        new Vector({
          x: left ? -1 : left === false ? 1 : Math.round(Math.random()) * 2 - 1,
          y: Math.random() - 2,
        }),
        Math.round(Math.random() * (this.#configRef.current.radiusMax - this.#configRef.current.radiusMin) + this.#configRef.current.radiusMin),
        Utils.modP(this.#configRef.current.hueCenter + (Math.random() - 0.5) * this.#configRef.current.hueRange * 2, 360)
      )
    );
  }
}
