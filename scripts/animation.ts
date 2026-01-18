import { Vector } from '@/lib/2d/core';

const vecs = [new Vector(-100, 0), new Vector(-100, 0).rotateEq((Math.PI * 2) / 3), new Vector(-100, 0).rotateEq(((Math.PI * 2) / 3) * 2)];
const steps = 4;

for (let i = 0; i <= steps; ++i) {
  console.log(`${Math.round((100 / steps) * i)}% {`);
  for (let v = 0; v < vecs.length; ++v) {
    const vec = vecs[v]
      .rotate(((Math.PI * 2) / steps) * i)
      .round()
      .div(2)
      .add({ x: 50, y: 50 });
    console.log(`  --x${v}: ${vec.x}%;`);
    console.log(`  --y${v}: ${vec.y}%;`);
  }
  console.log('}');
}
