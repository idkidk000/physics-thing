import { PolyEntity, type VectorLikeWithRadius } from '@/lib/entity/base/poly-entity';

const shape: VectorLikeWithRadius[] = [
  { x: 0, y: -1.2, r: 0.07 },
  { x: 1, y: 0.53, r: 0.07 },
  { x: -1, y: 0.53, r: 0.07 },
];

export class Tri extends PolyEntity {
  get shape(): VectorLikeWithRadius[] {
    return shape;
  }
}
