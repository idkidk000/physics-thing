import { type CSSProperties, useCallback, useMemo, useRef, useState } from 'react';
import { Checkbox } from '@/components/checkbox';
import { Range } from '@/components/range';
import { VectorPicker } from '@/components/vector-picker';
import { useConfig } from '@/hooks/config';
import { HotKeys } from '@/hooks/event';
import type { VectorLike } from '@/lib/2d';

function HueCenterRange() {
  const { config, setConfig } = useConfig();

  const handleChange = useCallback((hueCenter: number) => setConfig((prev) => ({ ...prev, hueCenter })), []);

  // biome-ignore format: no
  const style = useMemo(() => ({
    '--color-accent': `light-dark(hsl(${config.hueCenter} 85% 40%), hsl(${config.hueCenter} 100% 55%))`,
  }), [config.hueCenter]) as CSSProperties

  return <Range min={0} max={359} name='Hue center' value={config.hueCenter} onValueChange={handleChange} style={style} />;
}

export function Sidebar() {
  const { config, setConfig } = useConfig();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleMaxAgeChange = useCallback((maxAge: number) => setConfig((prev) => ({ ...prev, maxAge })), []);
  const handleDragVelocityChange = useCallback((dragVelocity: number) => setConfig((prev) => ({ ...prev, dragVelocity })), []);
  const handleHueRangeChange = useCallback((hueRange: number) => setConfig((prev) => ({ ...prev, hueRange })), []);
  const handlePhysicsStepsChange = useCallback((physicsSteps: number) => setConfig((prev) => ({ ...prev, physicsSteps })), []);
  const handleRadiusMinChange = useCallback((radiusMin: number) => setConfig((prev) => ({ ...prev, radiusMin })), []);
  const handleRadiusMaxChange = useCallback((radiusMax: number) => setConfig((prev) => ({ ...prev, radiusMax })), []);
  const handleCollideVelocityRatioChange = useCallback((collideVelocityRatio: number) => setConfig((prev) => ({ ...prev, collideVelocityRatio })), []);
  const handleStepVelocityRatioChange = useCallback((stepVelocityRatio: number) => setConfig((prev) => ({ ...prev, stepVelocityRatio })), []);
  const handleRestitutionCoefficientChange = useCallback((restitutionCoefficient: number) => setConfig((prev) => ({ ...prev, restitutionCoefficient })), []);
  const handleIdleStepsChange = useCallback((idleSteps: number) => setConfig((prev) => ({ ...prev, idleSteps })), []);
  const handleIdleThresholdChange = useCallback((idleThreshold: number) => setConfig((prev) => ({ ...prev, idleThreshold })), []);
  const handleDrawShadowChange = useCallback((drawShadow: boolean) => setConfig((prev) => ({ ...prev, drawShadow })), []);
  const handleDrawHighlightChange = useCallback((drawHighlight: boolean) => setConfig((prev) => ({ ...prev, drawHighlight })), []);
  const handleDrawBlurChange = useCallback((drawBlur: boolean) => setConfig((prev) => ({ ...prev, drawBlur })), []);
  const handleGravityChange = useCallback((gravity: VectorLike) => setConfig((prev) => ({ ...prev, gravity })), []);
  const handleInitialObjectsChange = useCallback((initialObjects: number) => setConfig((prev) => ({ ...prev, initialObjects })), []);

  // biome-ignore format: no
  const toggleOpen = useCallback(() => setOpen((prev) => {
    ref.current?.scrollTo({ top: 0, behavior: 'instant' });
    return !prev;
  }), []);

  return (
    <>
      <button
        type='button'
        onClick={toggleOpen}
        className='fixed top-0 left-0 px-4 py-2 m-2 rounded bg-background border-2 border-border z-20 group'
        aria-expanded={open}
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
            className='origin-center transition-transform -translate-y-[7px] group-aria-expanded:rotate-38 group-aria-expanded:scale-x-130 group-aria-expanded:translate-y-0 duration-300'
          />
          <path d='M4 12h16' className='origin-center transition-[opacity,scale] group-aria-expanded:opacity-0 group-aria-expanded:scale-x-0' />
          <path
            d='M4 12h16'
            className='origin-center transition-transform translate-y-[7px] group-aria-expanded:rotate-142 group-aria-expanded:scale-x-130 group-aria-expanded:translate-y-0 duration-300'
          />
        </svg>
      </button>
      {open && <div className='fixed inset-0' onClick={toggleOpen} onTouchEnd={toggleOpen} />}
      <div
        className='fixed top-0 left-0 bottom-0 w-auto z-10 transition-[translate] transition-discrete border-e-2 border-border rounded-e bg-background aria-hidden:-translate-x-full shadow-2xl aria-hidden:shadow-none shadow-black'
        role='dialog'
        aria-hidden={!open}
      >
        <div className='flex flex-col gap-2 size-full p-4 select-none overflow-y-auto' ref={ref}>
          <VectorPicker range={1} digits={2} name='Gravity' value={config.gravity} onValueChange={handleGravityChange} />
          <Range min={0.1} max={0.5} step={0.01} name='Drag velocity' value={config.dragVelocity} onValueChange={handleDragVelocityChange} />
          <Range min={0.9} max={1} step={0.001} name='Collide velocity' value={config.collideVelocityRatio} onValueChange={handleCollideVelocityRatioChange} />
          <Range min={0.9} max={1} step={0.001} name='Step velocity' value={config.stepVelocityRatio} onValueChange={handleStepVelocityRatioChange} />
          <Range min={0.9} max={1} step={0.001} name='Restitution' value={config.restitutionCoefficient} onValueChange={handleRestitutionCoefficientChange} />

          <hr />

          <Range min={1} max={20} name='Physics steps' value={config.physicsSteps} onValueChange={handlePhysicsStepsChange} />
          <Range min={1} max={100} step={1} name='Idle steps' value={config.idleSteps} onValueChange={handleIdleStepsChange} />
          <Range min={0.01} max={1} step={0.01} name='Idle threshold' value={config.idleThreshold} onValueChange={handleIdleThresholdChange} />

          <hr />

          <Range min={0} max={10000} step={100} name='Max age' value={config.maxAge} onValueChange={handleMaxAgeChange} />
          <Range min={0} max={100} step={1} name='Initial objects' value={config.initialObjects} onValueChange={handleInitialObjectsChange} />

          <hr />

          <Range min={1} max={config.radiusMax} name='Radius min' value={config.radiusMin} onValueChange={handleRadiusMinChange} />
          <Range min={config.radiusMin} max={200} name='Radius max' value={config.radiusMax} onValueChange={handleRadiusMaxChange} />
          <HueCenterRange />
          <Range min={0} max={180} name='Hue range' value={config.hueRange} onValueChange={handleHueRangeChange} />
          <Checkbox name='Draw highlight' value={config.drawHighlight} onValueChange={handleDrawHighlightChange} />
          <Checkbox name='Draw shadow' value={config.drawShadow} onValueChange={handleDrawShadowChange} />
          <Checkbox name='Draw blur' value={config.drawBlur} onValueChange={handleDrawBlurChange} />

          <hr />

          <div className='grid grid-cols-2 gap-2'>
            <HotKeys className='flex gap-2 items-center' />
          </div>
        </div>
      </div>
    </>
  );
}
