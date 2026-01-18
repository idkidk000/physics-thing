import { PolyEntity, type VectorLikeWithRadius } from '@/lib/entity/base/poly-entity';

const shape: VectorLikeWithRadius[] = [
  { x: -0.46, y: -0.87, r: 0.15 },
  { x: 0.46, y: -0.87, r: 0.15 },
  { x: 1, y: 0, r: 0.15 },
  { x: 0.46, y: 0.87, r: 0.15 },
  { x: -0.46, y: 0.87, r: 0.15 },
  { x: -1, y: 0, r: 0.15 },
];

export class Hex extends PolyEntity {
  get shape(): VectorLikeWithRadius[] {
    return shape;
  }
  get displayName() {
    return 'Hex';
  }
}
