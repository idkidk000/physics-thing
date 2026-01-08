import { createContext, type Dispatch, type ReactNode, type RefObject, type SetStateAction, useContext, useEffect, useMemo, useRef, useState } from 'react';

export interface Config {
  dragVelocity: number;
  hueCenter: number;
  hueRange: number;
  maxAge: number;
  physicsSteps: number;
  radiusMin: number;
  radiusMax: number;
  paused: boolean;
}

const defaultConfig: Config = {
  dragVelocity: 0.05,
  hueCenter: 275,
  hueRange: 50,
  maxAge: 1500,
  physicsSteps: 10,
  radiusMin: 20,
  radiusMax: 50,
  paused: false,
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
