import { createContext, type Dispatch, type ReactNode, type RefObject, type SetStateAction, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useEvent } from '@/hooks/event';
import type { VectorLike } from '@/lib/2d';

export interface Config {
  dragVelocity: number;
  hueCenter: number;
  hueRange: number;
  maxAge: number;
  physicsSteps: number;
  radiusMin: number;
  radiusMax: number;
  paused: boolean;
  gravity: VectorLike;
  collideVelocityRatio: number;
  stepVelocityRatio: number;
  idleSteps: number;
  idleThreshold: number;
  restitutionCoefficient: number;
  drawShadow: boolean;
  drawHighlight: boolean;
  initialObjects: number;
}

export const defaultConfig: Config = {
  dragVelocity: 0.05,
  hueCenter: 275,
  hueRange: 50,
  maxAge: 0,
  physicsSteps: 10,
  radiusMin: 20,
  radiusMax: 50,
  paused: false,
  gravity: { x: 0, y: 0.01 },
  collideVelocityRatio: 0.99,
  stepVelocityRatio: 0.99,
  idleSteps: 10,
  idleThreshold: 0.1,
  restitutionCoefficient: 0.99,
  drawShadow: false,
  drawHighlight: true,
  initialObjects: 30,
};

interface Context {
  config: Config;
  setConfig: Dispatch<SetStateAction<Config>>;
  configRef: RefObject<Config>;
}

const Context = createContext<Context | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Config>(defaultConfig);
  const configRef = useRef<Config>(config);
  const { eventRef } = useEvent();

  useEffect(() => {
    const controller = new AbortController();
    eventRef.current.subscribe('pause', () => setConfig((prev) => ({ ...prev, paused: !prev.paused })), controller.signal);
    eventRef.current.subscribe('reset', () => setConfig(defaultConfig), controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // biome-ignore format: no
  const value: Context = useMemo(() => ({
    config,
    configRef,
    setConfig,
  }), [config]);

  return <Context value={value}>{children}</Context>;
}

export function useConfig() {
  const context = useContext(Context);
  if (!context) throw new Error('useConfig must be used underneath a ConfigProvider');
  return context;
}
