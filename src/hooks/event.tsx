import { createContext, type ReactNode, type RefObject, useCallback, useContext, useEffect, useMemo, useRef } from 'react';

type Callback = () => unknown;

class EventEmitter<EventId extends string> {
  #map = new Map<EventId, Set<Callback>>();
  emit(event: EventId): void {
    this.#map
      .get(event)
      ?.keys()
      .forEach((callback) => void callback());
  }
  subscribe(event: EventId, callback: Callback, signal: AbortSignal): void {
    if (!this.#map.get(event)?.add(callback)) this.#map.set(event, new Set([callback]));
    signal?.addEventListener('abort', () => this.#map.get(event)?.delete(callback));
  }
}

interface Event {
  keyName: string;
  label: string;
  id: string;
}

export const events = [
  { id: 'clear', keyName: 'c', label: 'Clear' },
  { id: 'dump', keyName: 'd', label: 'Dump to console' },
  { id: 'grow', keyName: 'g', label: 'Grow' },
  { id: 'immortal', keyName: 'i', label: 'Toggle immortal' },
  { id: 'pause', keyName: 'p', label: 'Toggle paused' },
  { id: 'reload', keyName: 'r', label: 'Reload renderer' },
  { id: 'step', keyName: 's', label: 'Single step' },
] as const satisfies Event[];

type EventId = (typeof events)[number]['id'];

interface Context {
  eventRef: RefObject<EventEmitter<EventId>>;
}

const Context = createContext<Context | null>(null);

export function EventProvider({ children }: { children: ReactNode }) {
  const eventRef = useRef(new EventEmitter<EventId>());

  useEffect(() => {
    const controller = new AbortController();
    // biome-ignore format: no
    document.addEventListener('keydown', (event) => {
      const activeEvent = events.find((item) => item.keyName === event.key);
      if (activeEvent) eventRef.current.emit(activeEvent.id);
    }, { signal: controller.signal });
    return () => controller.abort();
  }, []);

  const value: Context = useMemo(() => ({ eventRef }), []);

  return <Context value={value}>{children}</Context>;
}

export function useEvent() {
  const context = useContext(Context);
  if (!context) throw new Error('useEvent must be used underneath an EventProvider');
  return context;
}

function HotKey({
  id,
  keyName: key,
  label,
  className,
  clickClass = 'bg-foreground/20',
  clickMillis = 200,
}: Event & { className: string; clickClass?: string; clickMillis?: number }) {
  const { eventRef } = useEvent();
  const ref = useRef<HTMLButtonElement>(null);
  const timeoutRef = useRef<number>(null);

  const handleClick = useCallback(() => eventRef.current.emit(id as EventId), [id]);

  useEffect(() => {
    const controller = new AbortController();
    // biome-ignore format: no
    eventRef.current.subscribe(id as EventId, () => {
      ref.current?.classList.toggle(clickClass, true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        ref.current?.classList.toggle(clickClass, false);
        timeoutRef.current = null;
      }, clickMillis);
    }, controller.signal);
    return () => controller.abort();
  }, [id, clickClass, clickMillis]);

  return (
    <button type='button' className={className} key={id} onClick={handleClick} ref={ref}>
      <kbd>{key}</kbd>
      <span>{label}</span>
    </button>
  );
}

export function HotKeys({ className }: { className: string }) {
  return (
    <>
      {events.map((props) => (
        <HotKey key={props.keyName} className={className} {...props} />
      ))}
    </>
  );
}
