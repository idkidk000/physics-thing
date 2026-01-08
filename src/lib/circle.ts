import { type Point, type PointLike, Vector } from '@/lib/2d';

const GRAVITY = new Vector({ x: 0, y: 0.01 });
const COLLIDE_VELOCITY_RATIO = 0.99;
const STEP_VELOCITY_RATIO = 0.99;
const IDLE_STEPS = 10;
const IDLE_THRESHOLD2 = 0.01;
const RESTITUTION_COEFFICIENT = 0.99;
const DRAW_SHADOW = false;
const DRAW_HIGHLIGHT = true;

export class Circle {
  #idleCount = 0;
  #radius = 0;
  #mass = 0;
  #moved = false;
  #dragging = false;
  immortal = false;
  age = 0;
  constructor(
    public position: Point,
    public velocity: Vector,
    radius: number,
    public hue: number,
    public opacity: number = 100
  ) {
    this.radius = radius;
  }
  get idle() {
    return this.#idleCount >= IDLE_STEPS;
  }
  get radius() {
    return this.#radius;
  }
  set radius(value: number) {
    this.#radius = value;
    this.#mass = Math.PI * value ** 2;
  }
  get mass() {
    return this.#mass;
  }
  get left() {
    return this.position.x - this.radius;
  }
  get right() {
    return this.position.x + this.radius;
  }
  get top() {
    return this.position.y - this.radius;
  }
  get bottom() {
    return this.position.y + this.radius;
  }
  get dragging() {
    return this.#dragging;
  }
  set dragging(value: boolean) {
    this.#dragging = value;
    if (value) this.age = 0;
  }
  step(millis: number, bounds: PointLike): void {
    if (!this.#dragging) {
      if (this.#moved) {
        this.#idleCount = 0;
        this.velocity.addEq(GRAVITY.mult(millis));
      } else {
        ++this.#idleCount;
        this.velocity.addEq(GRAVITY.mult(millis * 0.05));
      }
      const offset = this.velocity.mult(millis);
      this.#moved = offset.hypot2() >= IDLE_THRESHOLD2;
      this.position.addEq(offset);
    }
    if (this.left < 0) {
      this.position.x = this.radius;
      this.velocity.x *= -COLLIDE_VELOCITY_RATIO;
    } else if (this.right > bounds.x) {
      this.position.x = bounds.x - this.radius;
      this.velocity.x *= -COLLIDE_VELOCITY_RATIO;
    }
    if (this.top < 0) {
      this.position.y = this.radius;
      this.velocity.y *= -COLLIDE_VELOCITY_RATIO;
    } else if (this.bottom > bounds.y) {
      this.position.y = bounds.y - this.radius;
      this.velocity.y *= -COLLIDE_VELOCITY_RATIO;
    }
    this.velocity.multEq(STEP_VELOCITY_RATIO);
  }
  intersects(other: Circle): boolean {
    if (other.bottom < this.top || other.top > this.bottom) return false;
    return this.position.hypot2(other.position) < (this.radius + other.radius) ** 2;
  }
  collide(other: Circle): void {
    // https://github.com/matthias-research/pages/blob/master/tenMinutePhysics/23-SAP.html
    // https://youtu.be/euypZDssYxE
    if (!this.intersects(other)) return;
    const collisionNormal = new Vector(other.position.sub(this.position)).unitEq();
    const normalVelocityDp = other.velocity.sub(this.velocity).dot(collisionNormal);

    if (normalVelocityDp > 0) return;

    const impulse = (-(1 + RESTITUTION_COEFFICIENT) * normalVelocityDp) / (1 / this.mass + 1 / other.mass);
    const impulseVector = collisionNormal.mult(impulse);

    this.velocity.subEq(impulseVector.div(this.mass)).multEq(COLLIDE_VELOCITY_RATIO);
    other.velocity.addEq(impulseVector.div(other.mass)).multEq(COLLIDE_VELOCITY_RATIO);
  }
  draw(context: CanvasRenderingContext2D): void {
    context.beginPath();
    context.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    context.closePath();
    context.fillStyle = `hsl(${this.hue} 100 50 / ${this.opacity}%)`;
    context.fill();

    if (DRAW_HIGHLIGHT || DRAW_SHADOW) {
      context.save();
      context.clip();
    }

    if (DRAW_HIGHLIGHT) {
      context.beginPath();
      context.arc(this.position.x, this.position.y, this.radius, Math.PI * 0.75, Math.PI * 1.75);
      context.arc(this.position.x + this.radius * 0.8, this.position.y + this.radius * 0.8, this.radius * 1.5, Math.PI * 1.75, Math.PI * 0.75, true);
      context.closePath();
      context.fillStyle = `hsl(${this.hue} 100 80 / ${this.opacity}%)`;
      context.fill();
    }

    if (DRAW_SHADOW) {
      context.beginPath();
      context.arc(this.position.x, this.position.y, this.radius, Math.PI * -0.25, Math.PI * 0.75);
      context.arc(this.position.x - this.radius * 0.8, this.position.y - this.radius * 0.8, this.radius * 1.5, Math.PI * 0.75, Math.PI * -0.25, true);
      context.closePath();
      context.fillStyle = `hsl(${this.hue} 100 30 / ${this.opacity}%)`;
      context.fill();
    }

    if (DRAW_HIGHLIGHT || DRAW_SHADOW) context.restore();
  }
}
