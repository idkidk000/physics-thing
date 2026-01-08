import { createContext, type MouseEvent, type ReactNode, type RefObject, type TouchEvent, useCallback, useContext, useMemo, useRef } from 'react';

export enum MouseStateEvent {
  Start,
  End,
  None,
}
export interface MouseState {
  x: number;
  y: number;
  event: MouseStateEvent;
  buttons: number;
}

interface Context {
  canvasRef: RefObject<HTMLCanvasElement>;
  mouseRef: RefObject<MouseState>;
}

const Context = createContext<Context | null>(null);

export function CanvasProvider({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<MouseState>({ x: 0, y: 0, event: MouseStateEvent.None, buttons: 0 });
  const value: Context = useMemo(() => ({ canvasRef: canvasRef as RefObject<HTMLCanvasElement>, mouseRef }), []);
  return <Context value={value}>{children}</Context>;
}

export function useCanvas() {
  const context = useContext(Context);
  if (!context) throw new Error('useCanvas must be used underneath a CanvasProvider');
  return context;
}

export function Canvas({ className }: { className: string }) {
  const { canvasRef, mouseRef } = useCanvas();

  const handleMouseMove = useCallback((event: MouseEvent<HTMLCanvasElement>) => {
    mouseRef.current.x = event.clientX;
    mouseRef.current.y = event.clientY;
  }, []);

  const handleMouseDown = useCallback((event: MouseEvent<HTMLCanvasElement>) => {
    mouseRef.current.buttons = event.buttons;
    mouseRef.current.event = MouseStateEvent.Start;
  }, []);

  const handleMouseUp = useCallback(() => {
    mouseRef.current.buttons = 0x0;
    mouseRef.current.event = MouseStateEvent.End;
  }, []);

  const handleMouseRightClick = useCallback((event: MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleTouchMove = useCallback((event: TouchEvent<HTMLCanvasElement>) => {
    const touch = event.touches[0];
    mouseRef.current.x = touch.clientX;
    mouseRef.current.y = touch.clientY;
  }, []);

  const handleTouchStart = useCallback((event: TouchEvent<HTMLCanvasElement>) => {
    const touch = event.touches[0];
    mouseRef.current.x = touch.clientX;
    mouseRef.current.y = touch.clientY;
    mouseRef.current.buttons = 0x3;
    mouseRef.current.event = MouseStateEvent.Start;
  }, []);

  const handleTouchEnd = useCallback(() => {
    mouseRef.current.buttons = 0x0;
    mouseRef.current.event = MouseStateEvent.End;
  }, []);

  return (
    <canvas
      className={className}
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onContextMenu={handleMouseRightClick}
      onTouchMove={handleTouchMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseLeave={handleMouseUp}
    />
  );
}
