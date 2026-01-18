import { PolyEntity, type VectorLikeWithRadius } from '@/lib/entity/base/poly-entity';

const shape: VectorLikeWithRadius[] = [
  { x: -0.9, y: -0.9, r: 0.15 },
  { x: 0.9, y: -0.9, r: 0.15 },
  { x: 0.9, y: 0.9, r: 0.15 },
  { x: -0.9, y: 0.9, r: 0.15 },
];

export class Square extends PolyEntity {
  get shape(): VectorLikeWithRadius[] {
    return shape;
  }
  get displayName() {
    return 'Square';
  }
}
