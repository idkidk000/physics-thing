import type { RefObject } from 'react';
import { type MouseState, MouseStateEvent } from '@/hooks/canvas';
import type { Config } from '@/hooks/config';
import type { EventEmitter, EventId } from '@/hooks/event';
import { Point, type PointLike, Vector } from '@/lib/2d';
import { Circle } from '@/lib/circle';
import { Utils } from '@/lib/utils';

const LIGHT_POSITION: PointLike = { x: 0.5, y: -0.1 };

export class Simulation {
  #objects: Circle[] = [];
  #activeObject: Circle | null = null;
  #configRef: RefObject<Config>;
  #deleteIxs = new Set<number>();
  #mouseRef: RefObject<MouseState>;
  #steps = 0;
  #canvasRef: RefObject<HTMLCanvasElement | null>;
  #context: CanvasRenderingContext2D | null = null;
  #controller = new AbortController();
  constructor(
    eventEmitter: EventEmitter<EventId>,
    configRef: RefObject<Config>,
    mouseRef: RefObject<MouseState>,
    canvasRef: RefObject<HTMLCanvasElement | null>
  ) {
    this.#configRef = configRef;
    this.#mouseRef = mouseRef;
    this.#canvasRef = canvasRef;
    eventEmitter.subscribe('reset', () => this.reset(), this.#controller.signal);
    // biome-ignore format: no
    eventEmitter.subscribe('dump', () => {
      console.log(this.#objects);
      (window as typeof window & { objects: Circle[] }).objects = this.#objects;
    }, this.#controller.signal);
    // biome-ignore format: no
    eventEmitter.subscribe('grow', () => {
      if (this.#activeObject) ++this.#activeObject.radius;
      else for (const item of this.#objects) ++item.radius;
    }, this.#controller.signal);
  }
  destructor() {
    this.#controller.abort();
    (window as typeof window & { objects: null }).objects = null;
  }
  step(elapsedMillis: number) {
    if (!this.#canvasRef.current) throw new Error('canvasRef is null');
    const rect = this.#canvasRef.current.getBoundingClientRect();
    const bounds = Point.round({ x: rect.width, y: rect.height });
    this.#canvasRef.current.width = bounds.x;
    this.#canvasRef.current.height = bounds.y;
    if (this.#context === null) {
      const context = this.#canvasRef.current.getContext('2d');
      if (!context) throw new Error('could not get 2d context');
      this.#context = context;
    }
    this.#context.clearRect(0, 0, bounds.x, bounds.y);
    const position = Point.round({ x: rect.left, y: rect.top });

    const canvasMouse = Point.sub(this.#mouseRef.current, position);

    if (this.#mouseRef.current.event === MouseStateEvent.End) {
      if (this.#activeObject) {
        if (canvasMouse.x <= 1 || canvasMouse.y <= 1 || canvasMouse.x >= bounds.x - 1 || canvasMouse.y >= bounds.y - 1)
          this.#objects = this.#objects.filter((item) => item !== this.#activeObject);
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
      const velocity = this.#activeObject.position.sub({ x, y }).divEq(elapsedMillis);
      this.#activeObject.velocity.addEq(velocity.multEq(this.#configRef.current.dragVelocity));
    } else if (this.#configRef.current.clickSpawn && this.#mouseRef.current.buttons) {
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
      if (!(item.dragging || this.#configRef.current.maxAge === 0) && item.age >= this.#configRef.current.maxAge) --item.opacity;
      else if (item.opacity < 100) ++item.opacity;
      if (item.opacity === 0) this.#deleteIxs.add(i);
    }

    if (this.#deleteIxs.size) {
      this.#objects = this.#objects.filter((_, i) => !this.#deleteIxs.has(i));
      this.#deleteIxs.clear();
    }

    ++this.#steps;
  }
  draw() {
    if (!this.#context) throw new Error('could not get 2d context');
    if (!this.#canvasRef.current) throw new Error('canvasRef is null');
    const canvas: PointLike = { x: this.#canvasRef.current.width, y: this.#canvasRef.current.height };
    const light = Point.mult(canvas, LIGHT_POSITION);
    const maxLightDistance = Math.sqrt(
      Math.max(
        Point.hypot2(Point.sub(light, { x: 0, y: 0 })),
        Point.hypot2(Point.sub(light, { x: canvas.x, y: 0 })),
        Point.hypot2(Point.sub(light, { x: 0, y: canvas.y })),
        Point.hypot2(Point.sub(light, { x: canvas.x, y: canvas.y }))
      )
    );
    for (const item of this.#objects) item.draw(this.#context, light, maxLightDistance);
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
