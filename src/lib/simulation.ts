import type { RefObject } from 'react';
import { type MouseState, MouseStateEvent } from '@/hooks/canvas';
import { type Config, EntityType } from '@/hooks/config';
import type { EventEmitter, EventId } from '@/hooks/event';
import { Point, type PointLike, Vector } from '@/lib/2d';
import { Circle, type Entity, Square } from '@/lib/entity';
import { Utils } from '@/lib/utils';

const LIGHT_POSITION: PointLike = { x: 0.5, y: -0.1 };

export class Simulation {
  #entities: Entity[] = [];
  #activeEntity: Entity | null = null;
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
      console.log(this.#entities);
      (window as typeof window & { entities: Entity[] }).entities = this.#entities;
    }, this.#controller.signal);
    // biome-ignore format: no
    eventEmitter.subscribe('grow', () => {
      if (this.#activeEntity) ++this.#activeEntity.radius;
      else for (const item of this.#entities) ++item.radius;
    }, this.#controller.signal);
  }
  destructor() {
    this.#controller.abort();
    (window as typeof window & { entities: null }).entities = null;
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
      if (this.#activeEntity) {
        if (canvasMouse.x <= 1 || canvasMouse.y <= 1 || canvasMouse.x >= bounds.x - 1 || canvasMouse.y >= bounds.y - 1)
          this.#entities = this.#entities.filter((item) => item !== this.#activeEntity);
        this.#activeEntity.dragging = false;
        this.#activeEntity = null;
      }
      this.#mouseRef.current.event = MouseStateEvent.None;
    } else if (this.#mouseRef.current.event === MouseStateEvent.Start) {
      if (!this.#activeEntity) {
        this.#activeEntity = this.#entities.find((item) => item.age > 20 && item.position.hypot2(canvasMouse) < item.radius ** 2) ?? null;
        if (this.#activeEntity) this.#activeEntity.dragging = true;
      }
      this.#mouseRef.current.event = MouseStateEvent.None;
    }
    if (this.#activeEntity) {
      const { x, y } = this.#activeEntity.position;
      this.#activeEntity.position.x = canvasMouse.x;
      this.#activeEntity.position.y = canvasMouse.y;
      const velocity = this.#activeEntity.position.sub({ x, y }).divEq(elapsedMillis);
      this.#activeEntity.velocity.addEq(velocity.multEq(this.#configRef.current.dragVelocity));
    } else if (this.#configRef.current.clickSpawn && this.#mouseRef.current.buttons) {
      const left = this.#mouseRef.current.buttons & 0x1;
      const right = this.#mouseRef.current.buttons & 0x2;
      const direction = left && right ? undefined : left > 0;
      this.addObject(canvasMouse, direction);
    }

    if (this.#steps === 0 && this.#entities.length === 0) {
      for (let i = 0; i < this.#configRef.current.initialEntities; ++i)
        this.addObject({
          x: bounds.x * Math.random(),
          y: bounds.y * Math.random(),
        });
    }

    const physicsMillis = elapsedMillis / this.#configRef.current.physicsSteps;
    for (let step = 0; step < this.#configRef.current.physicsSteps; ++step) {
      for (const circle of this.#entities) circle.step(physicsMillis, bounds);
      // sweep and prune, but with random direction so items aren't pushed to one side
      // https://github.com/matthias-research/pages/blob/master/tenMinutePhysics/23-SAP.html
      // https://youtu.be/euypZDssYxE
      const left = Math.random() > 0.5;
      const sorted = this.#entities.toSorted(left ? (a, b) => a.aabb.min.x - b.aabb.min.x : (a, b) => b.aabb.max.x - a.aabb.max.x);
      for (let i = 0; i < sorted.length; ++i) {
        const item = sorted[i];
        for (let o = i + 1; o < sorted.length; ++o) {
          const other = sorted[o];
          if (left && other.aabb.min.x > item.aabb.max.x) break;
          if (!left && other.aabb.max.x < item.aabb.min.x) break;
          item.collide(other);
        }
      }
    }

    for (const [i, item] of this.#entities.entries()) {
      if (!item.dragging) ++item.age;
      if (!(item.dragging || this.#configRef.current.maxAge === 0) && item.age >= this.#configRef.current.maxAge) --item.opacity;
      else if (item.opacity < 100) ++item.opacity;
      if (item.opacity === 0) this.#deleteIxs.add(i);
    }

    if (this.#deleteIxs.size) {
      this.#entities = this.#entities.filter((_, i) => !this.#deleteIxs.has(i));
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
    for (const item of this.#entities) item.draw(this.#context, light, maxLightDistance);
  }
  get entities() {
    return this.#entities;
  }
  get activeEntity() {
    return this.#activeEntity;
  }
  set activeEntity(item: Entity | null) {
    if (this.#activeEntity) this.#activeEntity.dragging = false;
    this.#activeEntity = item;
  }
  findObject(point: PointLike, minAge = 20) {
    return this.#entities.find((item) => item.age >= minAge && item.position.hypot2(point) < item.radius ** 2);
  }
  reset() {
    this.#activeEntity = null;
    this.#entities = [];
    this.#steps = 0;
  }
  addObject(point: PointLike, left?: boolean) {
    this.#entities.push(
      this.#configRef.current.entityType === EntityType.Circle || (this.#configRef.current.entityType === EntityType.Both && Math.random() > 0.5)
        ? new Circle(
            new Point(point),
            new Vector({
              x: left ? -1 : left === false ? 1 : Math.round(Math.random()) * 2 - 1,
              y: Math.random() - 2,
            }),
            Math.round(Math.random() * (this.#configRef.current.radiusMax - this.#configRef.current.radiusMin) + this.#configRef.current.radiusMin),
            Utils.modP(this.#configRef.current.hueCenter + (Math.random() - 0.5) * this.#configRef.current.hueRange * 2, 360),
            100,
            this.#configRef
          )
        : new Square(
            new Point(point),
            new Vector({
              x: left ? -1 : left === false ? 1 : Math.round(Math.random()) * 2 - 1,
              y: Math.random() - 2,
            }),
            Math.round(Math.random() * (this.#configRef.current.radiusMax - this.#configRef.current.radiusMin) + this.#configRef.current.radiusMin),
            Math.random() * Math.PI * 2,
            Utils.modP(this.#configRef.current.hueCenter + (Math.random() - 0.5) * this.#configRef.current.hueRange * 2, 360),
            100,
            this.#configRef
          )
    );
  }
}
