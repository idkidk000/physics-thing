import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/button';
import { RadioSlider } from '@/components/radio';
import { Range, RangeTwo } from '@/components/range';
import { Switch } from '@/components/switch';
import { VectorPicker } from '@/components/vector-picker';
import { EntityType, ShadingType, useConfig } from '@/hooks/config';
import { HotKeys } from '@/hooks/event';
import type { VectorLike } from '@/lib/2d';

const shadingOptions = [
  { label: 'Flat', value: ShadingType.Flat },
  { label: 'Two tone', value: ShadingType.TwoTone },
  { label: 'Gradient', value: ShadingType.Gradient },
];

const entityOptions = [
  { label: 'Circle', value: EntityType.Circle },
  { label: 'Both', value: EntityType.Both },
  { label: 'Square', value: EntityType.Square },
];

export function Sidebar() {
  const { config, setConfig } = useConfig();
  const [open, setOpen] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  const handleClickSpawnChange = useCallback((clickSpawn: boolean) => setConfig((prev) => ({ ...prev, clickSpawn })), []);
  const handleCollideVelocityRatioChange = useCallback((collideVelocityRatio: number) => setConfig((prev) => ({ ...prev, collideVelocityRatio })), []);
  const handleCollideRotationalVelocityRatioChange = useCallback(
    (collideRotationalVelocityRatio: number) => setConfig((prev) => ({ ...prev, collideRotationalVelocityRatio })),
    []
  );
  const handleDragVelocityChange = useCallback((dragVelocity: number) => setConfig((prev) => ({ ...prev, dragVelocity })), []);
  const handleDrawBlurChange = useCallback((drawBlur: boolean) => setConfig((prev) => ({ ...prev, drawBlur })), []);
  const handleEntityTypeChange = useCallback((entityType: EntityType) => setConfig((prev) => ({ ...prev, entityType })), []);
  const handleGravityChange = useCallback((gravity: VectorLike) => setConfig((prev) => ({ ...prev, gravity })), []);
  const handleHueCenterChange = useCallback((hueCenter: number) => setConfig((prev) => ({ ...prev, hueCenter })), []);
  const handleHueRangeChange = useCallback((hueRange: number) => setConfig((prev) => ({ ...prev, hueRange })), []);
  const handleInitialEntitiesChange = useCallback((initialEntities: number) => setConfig((prev) => ({ ...prev, initialEntities })), []);
  const handleMaxAgeChange = useCallback((maxAge: number) => setConfig((prev) => ({ ...prev, maxAge })), []);
  const handleMinImpulseChange = useCallback((minImpulse: number) => setConfig((prev) => ({ ...prev, minImpulse })), []);
  const handlePhysicsStepsChange = useCallback((physicsSteps: number) => setConfig((prev) => ({ ...prev, physicsSteps })), []);
  const handleRadiusChange = useCallback((radiusMin: number, radiusMax: number) => setConfig((prev) => ({ ...prev, radiusMin, radiusMax })), []);
  const handleRestitutionCoefficientChange = useCallback((restitutionCoefficient: number) => setConfig((prev) => ({ ...prev, restitutionCoefficient })), []);
  const handleRotationalVelocityRatioChange = useCallback((rotationalVelocityRatio: number) => setConfig((prev) => ({ ...prev, rotationalVelocityRatio })), []);
  const handleShadingChange = useCallback((shading: ShadingType) => setConfig((prev) => ({ ...prev, shadingType: shading })), []);
  const handleStepVelocityRatioChange = useCallback((stepVelocityRatio: number) => setConfig((prev) => ({ ...prev, stepVelocityRatio })), []);

  // biome-ignore format: no
  const toggleOpen = useCallback(() => setOpen((prev) => {
    ref.current?.scrollTo({ top: 0, behavior: 'instant' });
    return !prev;
  }), []);

  return (
    <>
      <Button
        type='button'
        onClick={toggleOpen}
        className='fixed top-0 left-0 px-4 py-2 m-2 rounded bg-background border-2 border-border z-20 group'
        aria-expanded={open}
        variant='unstyled'
      >
        <svg
          width='24'
          height='24'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
          role='graphics-symbol'
          aria-label='Menu'
        >
          <path
            d='M4 12h16'
            className='origin-center transition-transform -translate-y-[7px] group-aria-expanded:rotate-218 group-aria-expanded:scale-x-130 group-aria-expanded:translate-y-0 duration-300'
          />
          <path
            d='M4 12h16'
            className='origin-center transition-[opacity,translate] group-aria-expanded:opacity-0 group-aria-expanded:translate-y-[13px] duration-300'
          />
          <path
            d='M4 12h16'
            className='origin-center transition-transform translate-y-[7px] group-aria-expanded:rotate-142 group-aria-expanded:scale-x-130 group-aria-expanded:translate-y-0 duration-300'
          />
        </svg>
      </Button>
      {open && <div className='fixed inset-0' onClick={toggleOpen} onTouchEnd={toggleOpen} />}
      <div
        className='fixed top-0 left-0 bottom-0 w-auto z-10 transition-[translate] border-e-2 border-border rounded-e bg-background aria-hidden:-translate-x-full shadow-2xl aria-hidden:shadow-none shadow-black'
        role='dialog'
        aria-hidden={!open}
      >
        <div className='flex flex-col gap-2 size-full p-4 select-none overflow-y-auto' ref={ref}>
          <VectorPicker range={1} digits={2} label='Gravity' value={config.gravity} onValueChange={handleGravityChange} />

          <hr />

          <Range min={0.1} max={0.5} step={0.01} label='Drag velocity' value={config.dragVelocity} onValueChange={handleDragVelocityChange} />
          <Range
            min={0.95}
            max={1.05}
            step={0.001}
            label='Collide velocity'
            value={config.collideVelocityRatio}
            onValueChange={handleCollideVelocityRatioChange}
          />
          <Range min={0.95} max={1.05} step={0.001} label='Step velocity' value={config.stepVelocityRatio} onValueChange={handleStepVelocityRatioChange} />
          <Range
            min={0.95}
            max={1.05}
            step={0.001}
            label='Rotational velocity'
            value={config.rotationalVelocityRatio}
            onValueChange={handleRotationalVelocityRatioChange}
          />
          <Range
            min={0.95}
            max={1.05}
            step={0.001}
            label='Collide rotational velocity'
            value={config.collideRotationalVelocityRatio}
            onValueChange={handleCollideRotationalVelocityRatioChange}
          />
          <Range
            min={0.95}
            max={1.05}
            step={0.001}
            label='Restitution'
            value={config.restitutionCoefficient}
            onValueChange={handleRestitutionCoefficientChange}
          />
          <Range min={1} max={20} label='Physics steps' value={config.physicsSteps} onValueChange={handlePhysicsStepsChange} />
          <Range min={0} max={1000} step={10} label='Min impulse' value={config.minImpulse} onValueChange={handleMinImpulseChange} />

          <hr />

          <Range min={0} max={10000} step={100} label='Max age' value={config.maxAge} onValueChange={handleMaxAgeChange} />
          <Range min={0} max={100} step={1} label='Initial entities' value={config.initialEntities} onValueChange={handleInitialEntitiesChange} />

          <hr />

          <Range min={0} max={359} label='Hue center' value={config.hueCenter} onValueChange={handleHueCenterChange} />
          <Range min={0} max={180} label='Hue range' value={config.hueRange} onValueChange={handleHueRangeChange} />

          <RangeTwo min={1} max={200} label='Radius' valueMin={config.radiusMin} valueMax={config.radiusMax} onValueChange={handleRadiusChange} />
          <RadioSlider options={shadingOptions} value={config.shadingType} onValueChange={handleShadingChange} />
          <RadioSlider options={entityOptions} value={config.entityType} onValueChange={handleEntityTypeChange} />

          <div className='flex gap-2 justify-between'>
            <Switch label='Draw blur' value={config.drawBlur} onValueChange={handleDrawBlurChange} />
            <Switch label='Click to spawn' value={config.clickSpawn} onValueChange={handleClickSpawnChange} />
          </div>

          <hr />

          <div className='grid grid-cols-2 gap-2'>
            <HotKeys />
          </div>

          <hr />

          <a href='https://github.com/idkidk000/physics-thing' target='_blank' rel='noopener noreferrer' className='flex flex-row gap-2 mx-auto'>
            Source
            <svg
              width='24'
              height='24'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
              role='graphics-symbol'
            >
              <path d='M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4' />
              <path d='M9 18c-4.51 2-5-2-7-2' />
            </svg>
          </a>
        </div>
      </div>
    </>
  );
}
