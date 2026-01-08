import { useCallback } from 'react';
import { Range } from '@/components/range';
import { useConfig } from '@/hooks/config';
import { HotKeys } from '@/hooks/event';

export function Sidebar({ className }: { className: string }) {
  const { config, setConfig } = useConfig();

  const handleDragVelocityChange = useCallback((dragVelocity: number) => setConfig((prev) => ({ ...prev, dragVelocity })), []);
  const handleHueCenterChange = useCallback((hueCenter: number) => setConfig((prev) => ({ ...prev, hueCenter })), []);
  const handleHueRangeChange = useCallback((hueRange: number) => setConfig((prev) => ({ ...prev, hueRange })), []);
  const handlePhysicsStepsChange = useCallback((physicsSteps: number) => setConfig((prev) => ({ ...prev, physicsSteps })), []);
  const handleRadiusMinChange = useCallback((radiusMin: number) => setConfig((prev) => ({ ...prev, radiusMin })), []);
  const handleRadiusMaxChange = useCallback((radiusMax: number) => setConfig((prev) => ({ ...prev, radiusMax })), []);

  return (
    <div className={className}>
      <Range min={0} max={0.1} step={0.01} name='Drag velocity' value={config.dragVelocity} onValueChange={handleDragVelocityChange} />
      <Range min={0} max={359} name='Hue center' value={config.hueCenter} onValueChange={handleHueCenterChange} />
      <Range min={0} max={180} name='Hue range' value={config.hueRange} onValueChange={handleHueRangeChange} />
      <Range min={1} max={20} name='Physics steps' value={config.physicsSteps} onValueChange={handlePhysicsStepsChange} />
      <Range min={1} max={config.radiusMax} name='Radius max' value={config.radiusMin} onValueChange={handleRadiusMinChange} />
      <Range min={config.radiusMin} max={200} name='Radius min' value={config.radiusMax} onValueChange={handleRadiusMaxChange} />
      <HotKeys className='flex gap-2 items-center mx-auto' />
    </div>
  );
}
