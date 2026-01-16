import { PolyEntity, type VectorLikeWithRadius } from '@/lib/entity/base/poly-entity';

const shape: VectorLikeWithRadius[] = [
  { x: 0, y: -0.67, r: 0.1 },
  { x: 0.33, y: -1, r: 0.5 },
  { x: 0.67, y: -1, r: 0.4 },
  { x: 1, y: -0.67, r: 0.7 },
  { x: 1, y: 0, r: 1 },
  { x: 0.67, y: 0.67, r: 1 },
  { x: 0, y: 1, r: 0.5 },
  { x: -0.67, y: 0.67, r: 1 },
  { x: -1, y: 0, r: 1 },
  { x: -1, y: -0.67, r: 0.7 },
  { x: -0.67, y: -1, r: 0.4 },
  { x: -0.33, y: -1, r: 0.5 },
];

export class Heart extends PolyEntity {
  get shape(): VectorLikeWithRadius[] {
    return shape;
  }
}
