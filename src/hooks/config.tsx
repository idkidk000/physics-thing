import { createContext, type Dispatch, type ReactNode, type RefObject, type SetStateAction, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useEvent } from '@/hooks/event';
import type { VectorLike } from '@/lib/2d/core';

export enum ShadingType {
  Flat,
  TwoTone,
  Gradient,
}

/** bits */
export enum EntityType {
  Circle = 1,
  Square = 2,
  Heart = 4,
}

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
  restitutionCoefficient: number;
  drawBlur: boolean;
  shadingType: ShadingType;
  initialEntities: number;
  clickSpawn: boolean;
  /** bitfield of `EntityType` */
  entityType: number;
  minImpulse: number;
  collideRotationalVelocityRatio: number;
  rotationalVelocityRatio: number;
  showDebug: boolean;
  minCollisionVelocityToImpartRotationalVelocity: number;
}

export const defaultConfig: Config = {
  dragVelocity: 0.25,
  hueCenter: 220,
  hueRange: 50,
  maxAge: 0,
  physicsSteps: 5,
  radiusMin: 20,
  radiusMax: 70,
  paused: false,
  gravity: { x: 0, y: 0.5 },
  collideVelocityRatio: 0.999,
  stepVelocityRatio: 0.996,
  restitutionCoefficient: 0.999,
  drawBlur: false,
  shadingType: ShadingType.TwoTone,
  initialEntities: 20,
  clickSpawn: false,
  entityType: EntityType.Circle | EntityType.Square | EntityType.Heart,
  minImpulse: 10,
  collideRotationalVelocityRatio: 0.99,
  rotationalVelocityRatio: 0.998,
  showDebug: false,
  minCollisionVelocityToImpartRotationalVelocity: 1,
};

interface Context {
  config: Config;
  setConfig: Dispatch<SetStateAction<Config>>;
  configRef: RefObject<Config>;
}

const Context = createContext<Context | null>(null);

function readLocalStorage(): Config | null {
  const value = localStorage.getItem('physicsThing.config');
  if (value === null) return value;
  return JSON.parse(value) as Config;
}

function writeLocalStorage(config: Config): void {
  localStorage.setItem('physicsThing.config', JSON.stringify(config));
  document.documentElement.style.setProperty('--hue-center', `${config.hueCenter}`);
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Config>({ ...defaultConfig, ...readLocalStorage() });
  const configRef = useRef<Config>(config);
  const { eventRef } = useEvent();

  useEffect(() => {
    const controller = new AbortController();
    eventRef.current.subscribe('pause', () => setConfig((prev) => ({ ...prev, paused: !prev.paused })), controller.signal);
    eventRef.current.subscribe('defaults', () => setConfig(defaultConfig), controller.signal);
    eventRef.current.subscribe('showDebug', () => setConfig((prev) => ({ ...prev, showDebug: !prev.showDebug })), controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    configRef.current = config;
    writeLocalStorage(config);
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
