import { createContext, type ReactNode, type RefObject, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/button';

type Callback = () => unknown;

export class EventEmitter<EventId extends string> {
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
  hidden?: true;
  accent?: true;
}

const eventGroups = [
  [
    { id: 'add', keyName: 'a', label: 'Add entity' },
    { id: 'pause', keyName: 'p', label: 'Toggle paused' },
    { id: 'fullscreen', keyName: 'f', label: 'Toggle fullscreen' },
    { id: 'reset', keyName: 'r', label: 'Reset simulation', accent: true },
  ],
  [
    { id: 'fixed', keyName: 'i', label: 'Toggle fixed' },
    { id: 'grow', keyName: 'g', label: 'Grow' },
    { id: 'rotate', keyName: 'o', label: 'Rotate' },
    { id: 'zero', keyName: 'z', label: 'Zero rotation' },
  ],
  [
    { id: 'step', keyName: 's', label: 'Single step' },
    { id: 'dump', keyName: 'd', label: 'Dump to console' },
    { id: 'reload', keyName: 'l', label: 'Reload renderer' },
    { id: 'showDebug', keyName: 'e', label: 'Toggle debug' },
  ],
  [
    { id: 'defaults', keyName: 'c', label: 'Reset config', accent: true },
    { id: 'menu', keyName: 'm', label: 'Menu', hidden: true },
  ],
] as const satisfies Event[][];

const events = eventGroups.flat();

export type EventId = (typeof events)[number]['id'];

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

    // biome-ignore format: no
    eventRef.current.subscribe('fullscreen', () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.body.requestFullscreen();
    }, controller.signal);

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
  clickClass = 'bg-button-active',
  clickMillis = 200,
  accent,
}: Event & { className?: string; clickClass?: string; clickMillis?: number }) {
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
    <Button type='button' className={className} key={id} onClick={handleClick} ref={ref} variant={accent ? 'accent' : undefined}>
      <kbd>{key}</kbd>
      <span>{label}</span>
    </Button>
  );
}

export function HotKeys({ className }: { className?: string }) {
  return (
    <div className='flex flex-col gap-4'>
      {eventGroups
        .filter((group) => group.some((event) => !('hidden' in event)))
        .map((group, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: source is readonly
          <div key={i} className='grid grid-cols-2 gap-2'>
            {group
              .filter((event) => !('hidden' in event))
              .map((event) => (
                <HotKey key={event.id} {...event} className={className} />
              ))}
          </div>
        ))}
    </div>
  );
}
