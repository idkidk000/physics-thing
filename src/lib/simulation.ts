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
import { MovingAverage } from '@/lib/moving-average';
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
  #timeDeltas = new MovingAverage();
  #simStepTimes = new MovingAverage();
  #drawTimes = new MovingAverage();
  #drawDebugTimes = new MovingAverage();
  #entityStepTimes = new MovingAverage();
  #entityCollideTimes = new MovingAverage();
  #collisions = new MovingAverage();
  #aabbTests = new MovingAverage();
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
    // biome-ignore format: no
    eventEmitter.subscribe('tile', () => {
      if (!this.#canvasRef.current) return;
      const aspect = this.#canvasRef.current.width / this.#canvasRef.current.height;
      const rows = Math.ceil(Math.sqrt(this.entities.length / aspect));
      const cols = Math.ceil(this.entities.length / rows);
      const xUnit = this.#canvasRef.current.width / cols;
      const yUnit = this.#canvasRef.current.height / rows;
      for (const [i, entity] of this.#entities.toSorted((a,b)=>b.radius-a.radius).entries()) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        entity.position.set({
          x : xUnit * (col + 0.5),
          y : yUnit * (row + 0.5),
        })
        entity.zero();
        entity.invalidatePoints()
      }
    }, this.#controller.signal);
    // biome-ignore format: no
    eventEmitter.subscribe('jumble', () => {
      if (!this.#canvasRef.current) return;
      for (const entity of this.#entities) {
        entity.position.set({
          x: Math.random() * this.#canvasRef.current.width,
          y: Math.random() * this.#canvasRef.current.height,
        });
        entity.velocity
          .set({
            x: Math.random() - 0.5,
            y: Math.random() - 0.5,
          })
          .unitEq()
          .mult(Math.random() * 10);
        entity.rotationalVelocity = Math.random() * 20 - 10;
        entity.invalidatePoints()
      }
    }, this.#controller.signal);
  }
  destructor() {
    this.#controller.abort();
    (window as typeof window & { entities: null }).entities = null;
  }
  step(elapsedMillis: number) {
    const started = performance.now();
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
      this.#activeEntity.position.set(canvasMouse);
      const velocity = this.#activeEntity.position.sub({ x, y }).divEq(elapsedMillis);
      this.#activeEntity.velocity.addEq(velocity.multEq(this.#configRef.current.dragVelocity));
      this.#activeEntity.invalidatePoints();
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
    let entityStepTime = 0;
    let entityCollideTime = 0;
    let collisions = 0;
    let aabbTests = 0;
    for (let step = 0; step < this.#configRef.current.physicsSteps; ++step) {
      // sorting the array in place is slightly faster than sorting to a new array
      this.#entities.sort((a, b) => a.aabb.min.x - b.aabb.min.x);
      const entityStepStarted = performance.now();
      for (const entity of this.#entities) entity.step(physicsMillis, bounds);
      entityStepTime += performance.now() - entityStepStarted;
      const entityCollideStarted = performance.now();
      // sweep and prune
      for (let i = 0; i < this.#entities.length; ++i) {
        const item = this.#entities[i];
        const itemAabb = item.aabb;
        for (let o = i + 1; o < this.#entities.length; ++o) {
          ++aabbTests;
          const other = this.#entities[o];
          const otherAabb = other.aabb;
          if (otherAabb.min.x > itemAabb.max.x) break;
          if (otherAabb.max.x < itemAabb.min.x || otherAabb.min.y > itemAabb.max.y || otherAabb.max.y < itemAabb.min.y) continue;
          item.collide(other);
          ++collisions;
        }
      }
      entityCollideTime += performance.now() - entityCollideStarted;
    }

    this.#entityStepTimes.push(entityStepTime);
    this.#entityCollideTimes.push(entityCollideTime);
    this.#collisions.push(collisions);
    this.#aabbTests.push(aabbTests);

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
    this.#simStepTimes.push(performance.now() - started);
  }
  draw(elapsedMillis: number) {
    const started = performance.now();
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

    if (this.#configRef.current.paused) {
      const prev = this.#context.font;
      this.#context.font = `${bounds.x / 10}px system-ui`;
      this.#context.textBaseline = 'middle';
      this.#context.textAlign = 'center';
      const style = window.getComputedStyle(document.body);
      this.#context.fillStyle = style.color;
      this.#context.shadowBlur = 50;
      this.#context.shadowColor = style.backgroundColor;
      // there doesn't seem to be a less bad way to make sure we have a very contrasty shadow
      this.#context.fillText('Paused', bounds.x / 2, bounds.y / 2);
      this.#context.fillText('Paused', bounds.x / 2, bounds.y / 2);
      this.#context.fillText('Paused', bounds.x / 2, bounds.y / 2);
      this.#context.shadowBlur = 0;
      this.#context.font = prev;
    }

    this.#drawTimes.push(performance.now() - started);
    this.#timeDeltas.push(elapsedMillis);

    if (this.#configRef.current.showDebug) {
      const started = performance.now();
      for (const item of this.#entities) item.drawDebug(this.#context);

      const strings = [
        `${(1000 / (this.#timeDeltas.avg ?? Infinity)).toFixed(1)} fps`,
        `${this.entities.length.toLocaleString()} entities`,
        `${this.#simStepTimes.avg?.toFixed(1)}ms sim step`,
        `${this.#drawTimes.avg?.toFixed(1)}ms draw`,
        `${this.#drawDebugTimes.avg?.toFixed(1)}ms debug`,
        `${this.#entityStepTimes.avg?.toFixed(1)}ms ent step`,
        `${this.#entityCollideTimes.avg?.toFixed(1)}ms collide`,
        `${this.#collisions.avg?.toFixed(0)} collisions`,
        `${this.#aabbTests.avg?.toFixed(0)} aabb tests`,
      ];
      const fontSize = 16;
      const lineHeight = fontSize * 1.2;
      const prev = this.#context.font;
      this.#context.font = `${fontSize}px system-ui`;
      const width = Math.max(...strings.map((string) => this.#context?.measureText(string).width ?? 0)) + fontSize;
      this.#context.fillStyle = '#0007';
      this.#context.fillRect(bounds.x - width, 0, width, lineHeight * strings.length);
      this.#context.textAlign = 'right';
      this.#context.textBaseline = 'top';
      this.#context.fillStyle = '#ff0';
      for (const [i, string] of strings.entries()) this.#context.fillText(string, bounds.x - fontSize * 0.5, lineHeight * i);
      this.#context.font = prev;
      this.#drawDebugTimes.push(performance.now() - started);
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
