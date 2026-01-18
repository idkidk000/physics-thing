import { PolyEntity, type VectorLikeWithRadius } from '@/lib/entity/base/poly-entity';

const shape: VectorLikeWithRadius[] = [
  { x: 0.24200000000000002, y: -0.341, r: 0.1 },
  { x: 1.045, y: -0.341, r: 0.03 },
  { x: 0.396, y: 0.132, r: 0.1 },
  { x: 0.649, y: 0.8910000000000001, r: 0.03 },
  { x: 0, y: 0.41800000000000004, r: 0.1 },
  { x: -0.649, y: 0.8910000000000001, r: 0.03 },
  { x: -0.396, y: 0.132, r: 0.1 },
  { x: -1.045, y: -0.341, r: 0.03 },
  { x: -0.24200000000000002, y: -0.341, r: 0.1 },
  { x: 0, y: -1.1, r: 0.03 },
];

export class Star extends PolyEntity {
  get shape(): VectorLikeWithRadius[] {
    return shape;
  }
  get displayName() {
    return 'Star';
  }
}
