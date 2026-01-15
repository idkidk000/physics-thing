export class MovingAverage {
  #array: number[];
  #index = 0;
  #length = 0;
  constructor(size: number = 100) {
    this.#array = new Array(size);
  }
  push(value: number): void {
    this.#array[this.#index++] = value;
    if (this.#index === this.#array.length) this.#index = 0;
    if (this.#length < this.#array.length) ++this.#length;
  }
  clear(): void {
    this.#index = 0;
    this.#length = 0;
  }
  get length(): number {
    return this.#length;
  }
  get avg(): number | undefined {
    if (this.#length === 0) return undefined;
    return (this.#length === this.#array.length ? this.#array : this.#array.slice(0, this.#length)).reduce((acc, item) => acc + item, 0) / this.#length;
  }
}
