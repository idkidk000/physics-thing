import type { RefObject } from 'react';
import { type MouseState, MouseStateEvent } from '@/hooks/canvas';
import { type Config, EntityType } from '@/hooks/config';
import type { EventEmitter, EventId } from '@/hooks/event';
import { Point, type PointLike, Vector } from '@/lib/2d/core';
import type { Entity } from '@/lib/entity/base';
import { Circle } from '@/lib/entity/circle';
import { Heart } from '@/lib/entity/heart';
import { Square } from '@/lib/entity/square';
import { Star } from '@/lib/entity/star';
import { Utils } from '@/lib/utils';

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
  #timeDeltas: number[] = [];
  #light = new Vector({ x: 0, y: -1 });
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
    // biome-ignore format: no
    eventEmitter.subscribe('fixed', () => {
      if (this.#activeEntity) this.#activeEntity.fixed = !this.#activeEntity.fixed;
      else for (const item of this.#entities) item.fixed = !item.fixed;
    }, this.#controller.signal);
    // biome-ignore format: no
    eventEmitter.subscribe('zero', () => {
      if (this.#activeEntity) this.#activeEntity.zero();
      else for (const item of this.#entities) item.zero();
    }, this.#controller.signal);
    // biome-ignore format: no
    eventEmitter.subscribe('rotate', () => {
      if (this.#activeEntity) this.#activeEntity.rotation += 0.1;
      else for (const item of this.#entities) item.rotation += 0.1;
    }, this.#controller.signal);
    eventEmitter.subscribe('add', () => this.addEntity(mouseRef.current), this.#controller.signal);
  }
  destructor() {
    this.#controller.abort();
    (window as typeof window & { entities: null }).entities = null;
  }
  step(elapsedMillis: number) {
    if (!this.#canvasRef.current) throw new Error('canvasRef is null');
    const rect = this.#canvasRef.current.getBoundingClientRect();
    const bounds = Point.round({ x: rect.width, y: rect.height });

    const position = Point.round({ x: rect.left, y: rect.top });
    const canvasMouse = Point.sub(this.#mouseRef.current, position);

    if (this.#mouseRef.current.event === MouseStateEvent.End) {
      if (this.#activeEntity) {
        if (canvasMouse.x <= 1 || canvasMouse.y <= 1 || canvasMouse.x >= bounds.x - 1 || canvasMouse.y >= bounds.y - 1) {
          const ix = this.#entities.indexOf(this.#activeEntity);
          this.#entities.splice(ix, 1);
        }
        this.#activeEntity.dragging = false;
        this.#activeEntity = null;
      }
      this.#mouseRef.current.event = MouseStateEvent.None;
    } else if (this.#mouseRef.current.event === MouseStateEvent.Start) {
      if (!this.#activeEntity) {
        this.#activeEntity = this.findEntity(this.#mouseRef.current) ?? null;
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
      this.addEntity(canvasMouse);
    }

    if (this.#steps === 0 && this.#entities.length === 0) {
      const rect = this.#canvasRef.current.getBoundingClientRect();
      const canvasArea = rect.width * rect.height;
      let entityArea = 0;
      for (let i = 0; i < this.#configRef.current.initialEntities; ++i) {
        const entity = this.addEntity({
          x: bounds.x * Math.random(),
          y: bounds.y * Math.random(),
        });
        entityArea += entity.mass;
        if (entityArea > canvasArea * 0.5) return;
      }
    }

    if (this.#configRef.current.showDebug) for (const entity of this.#entities) entity.clearDebug();

    this.#light.rotateEq(this.#configRef.current.lightMotion * elapsedMillis * 0.0001);

    const physicsMillis = elapsedMillis / this.#configRef.current.physicsSteps;
    for (let step = 0; step < this.#configRef.current.physicsSteps; ++step) {
      for (const circle of this.#entities) circle.step(physicsMillis, bounds);
      // sweep and prune
      // https://github.com/matthias-research/pages/blob/master/tenMinutePhysics/23-SAP.html
      // https://youtu.be/euypZDssYxE
      const sorted = this.#entities.toSorted((a, b) => a.aabb.min.x - b.aabb.min.x);
      for (let i = 0; i < sorted.length; ++i) {
        const item = sorted[i];
        for (let o = i + 1; o < sorted.length; ++o) {
          const other = sorted[o];
          if (other.aabb.min.x > item.aabb.max.x) break;
          if (other.aabb.max.x < item.aabb.min.x || other.aabb.min.y > item.aabb.max.y || other.aabb.max.y < item.aabb.min.y) continue;
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
      for (const ix of [...this.#deleteIxs].toSorted((a, b) => b - a)) this.#entities.splice(ix, 1);
      this.#deleteIxs.clear();
    }

    ++this.#steps;
  }
  draw(elapsedMillis: number) {
    if (!this.#canvasRef.current) throw new Error('canvasRef is null');
    const rect = this.#canvasRef.current.getBoundingClientRect();
    const bounds = Point.round({ x: rect.width, y: rect.height });
    this.#canvasRef.current.width = bounds.x;
    this.#canvasRef.current.height = bounds.y;
    if (this.#context === null) {
      const context = this.#canvasRef.current?.getContext('2d');
      if (!context) throw new Error('could not get 2d context');
      this.#context = context;
    }

    const light = Point.add(Point.mult(Vector.mult(this.#light, 0.5), bounds), Point.mult(bounds, 0.5));

    const maxLightDistance = Math.sqrt(
      Math.max(
        Point.hypot2(Point.sub(light, { x: 0, y: 0 })),
        Point.hypot2(Point.sub(light, { x: bounds.x, y: 0 })),
        Point.hypot2(Point.sub(light, { x: 0, y: bounds.y })),
        Point.hypot2(Point.sub(light, { x: bounds.x, y: bounds.y }))
      )
    );
    this.#context.clearRect(0, 0, bounds.x, bounds.y);
    for (const item of this.#entities) item.draw(this.#context, light, maxLightDistance);
    if (this.#configRef.current.showDebug) {
      for (const item of this.#entities) item.drawDebug(this.#context);
      this.#context.textAlign = 'right';
      this.#context.textBaseline = 'top';
      this.#context.fillStyle = '#ff0';
      if (this.#timeDeltas.length === 100) this.#timeDeltas = [...this.#timeDeltas.slice(-99), elapsedMillis];
      else this.#timeDeltas.push(elapsedMillis);
      const avg = this.#timeDeltas.reduce((acc, item) => acc + item) / this.#timeDeltas.length;
      this.#context.fillText(`${(1000 / avg).toFixed(1)}`, bounds.x, 0);
      this.#context.fillText(this.entities.length.toLocaleString(), bounds.x, 10);
    }
    if (this.#configRef.current.paused) {
      const prev = this.#context.font;
      this.#context.font = `${bounds.x / 10}px system-ui`;
      this.#context.textBaseline = 'middle';
      this.#context.textAlign = 'center';
      const style = window.getComputedStyle(document.body);
      this.#context.fillStyle = style.color;
      this.#context.shadowBlur = 50;
      this.#context.shadowColor = style.backgroundColor;
      this.#context.fillText('Paused', bounds.x / 2, bounds.y / 2);
      this.#context.fillText('Paused', bounds.x / 2, bounds.y / 2);
      this.#context.fillText('Paused', bounds.x / 2, bounds.y / 2);
      this.#context.shadowBlur = 0;
      this.#context.font = prev;
    }
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
  findEntity(point: PointLike, minAge = 20) {
    return this.#entities.toReversed().find((item) => item.age >= minAge && item.contains(point));
  }
  reset() {
    this.#activeEntity = null;
    this.#entities.splice(0, this.#entities.length);
    this.#steps = 0;
  }
  addEntity(point: PointLike): Entity {
    const params: ConstructorParameters<typeof Entity> = [
      this.#configRef,
      {
        hue: Utils.modP(this.#configRef.current.hueCenter + (Math.random() - 0.5) * this.#configRef.current.hueRange * 2, 360),
        position: new Point(point),
        radius: Math.round(Math.random() * (this.#configRef.current.radiusMax - this.#configRef.current.radiusMin) + this.#configRef.current.radiusMin),
        rotationalVelocity: Math.random() * 2 - 1,
        velocity: new Vector({
          x: Math.random() - 0.5,
          y: Math.random() - 0.5,
        })
          .unitEq()
          .multEq(2),
      },
    ];
    const options = Utils.enumEntries(EntityType)
      .map(([, value]) => value)
      .filter((value) => value & this.#configRef.current.entityType);
    const selected = options[Math.floor(Math.random() * options.length - 0.00001)];
    const entity =
      selected === EntityType.Circle
        ? new Circle(...params)
        : selected === EntityType.Square
          ? new Square(...params)
          : selected === EntityType.Heart
            ? new Heart(...params)
            : selected === EntityType.Star
              ? new Star(...params)
              : null;
    if (entity === null) throw new Error(`Simulation.addEntity has no handler for EntityType ${selected}`);

    // don't replace this.#entities as we've given a ref to Window
    if (this.#entities.length === 100) this.#entities.splice(0, 1);
    this.#entities.push(entity);
    return entity;
  }
}
