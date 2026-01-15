import {
  createContext,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  Star = 8,
}

export enum ColourSchemeType {
  Dark,
  Light,
  System,
}

export interface Config {
  clickSpawn: boolean;
  collideRotationalVelocityRatio: number;
  collideVelocityRatio: number;
  colourScheme: ColourSchemeType;
  dragVelocity: number;
  drawBlur: boolean;
  /** bitfield of `EntityType` */
  entityType: number;
  gravity: VectorLike;
  hueCenter: number;
  hueRange: number;
  initialEntities: number;
  lightMotion: number;
  maxAge: number;
  minImpulse: number;
  paused: boolean;
  physicsSteps: number;
  radiusMax: number;
  radiusMin: number;
  restitutionCoefficient: number;
  rotationalVelocityRatio: number;
  shadingType: ShadingType;
  showDebug: boolean;
  stepVelocityRatio: number;
}

export const defaultConfig: Config = {
  clickSpawn: false,
  collideRotationalVelocityRatio: 0.99,
  collideVelocityRatio: 0.997,
  colourScheme: ColourSchemeType.Dark,
  dragVelocity: 0.25,
  drawBlur: false,
  entityType: EntityType.Circle | EntityType.Square | EntityType.Heart | EntityType.Star,
  gravity: { x: 0, y: 0 },
  hueCenter: 280,
  hueRange: 60,
  initialEntities: 20,
  lightMotion: 10,
  maxAge: 0,
  minImpulse: 10,
  paused: false,
  physicsSteps: 5,
  radiusMax: 70,
  radiusMin: 20,
  restitutionCoefficient: 0.997,
  rotationalVelocityRatio: 0.997,
  shadingType: ShadingType.TwoTone,
  showDebug: false,
  stepVelocityRatio: 0.997,
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
  document.body.classList.toggle('dark', config.colourScheme === ColourSchemeType.Dark);
  document.body.classList.toggle('light', config.colourScheme === ColourSchemeType.Light);
  document.documentElement.style.setProperty('--hue-center', `${config.hueCenter}`);
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Config>({ ...defaultConfig, ...readLocalStorage(), paused: false });
  const configRef = useRef<Config>(config);
  const { eventRef } = useEvent();

  useEffect(() => {
    const controller = new AbortController();
    eventRef.current.subscribe('pause', () => setConfig((prev) => ({ ...prev, paused: !prev.paused })), controller.signal);
    eventRef.current.subscribe('defaults', () => setConfig(defaultConfig), controller.signal);
    eventRef.current.subscribe('showDebug', () => setConfig((prev) => ({ ...prev, showDebug: !prev.showDebug })), controller.signal);
    eventRef.current.subscribe('reset', () => setConfig((prev) => ({ ...prev, paused: false })), controller.signal);
    return () => controller.abort();
  }, []);

  useLayoutEffect(() => {
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
