import UpdateDelegate from '../core/UpdateDelegate';
import DirtyType from '../enums/DirtyType';
import EventType from '../enums/EventType';

export type DirtyInfo = {
  [key in DirtyType]?: { [key: string]: any } | undefined;
};

export interface UpdateDelegator {
  update: (info: DirtyInfo, delegate: UpdateDelegate) => void;
}

export type ScrollBreakDescriptor = Readonly<{
  x?: ScrollBreak[];
  y?: ScrollBreak[];
}>;

export type ScrollBreak = Readonly<{
  step: number;
  length: number;
}>;

export type ScrollOptions = Readonly<{
  // Duration of scroll animation in milliseconds.
  duration?: number;

  // Enable ease in and out.
  easing?: boolean;

  // Specifies if the scroll animation can be overwritten by a new one defined
  // on the same target.
  isOverwriteable?: boolean;

  // Handler invoked while the target is scrolling.
  onProgress?: (progress: number) => void;

  // Handler invoked whenever the target scrolling animation is cancelled.
  onCancel?: () => void;

  // Handler invoked when the target scrolling animation is complete.
  onComplete?: () => void;
}>;

export interface ScrollInstance {
  target: Window | HTMLElement;
  animationFrame: number;
  options: ScrollOptions;
};

export interface ResponsiveDescriptor {
  /**
   * The DOM element or window to listen for events.
   */
  target?: Window | HTMLElement;

  /**
   * Event types to listen for.
   */
  eventTypes?: EventType[];

  /**
   * Dispatch rate of events.
   */
  refreshRate?: number;
}

export function typeIsDirtyType(val: any): val is DirtyType {
  if (isNaN(Number(val))) return false;

  for (const key in DirtyType) {
    if (Number(DirtyType[key]) === Number(val)) return true;
  }

  return false;
}

export function typeIsEventType(val: any): val is EventType {
  return Object.values(EventType).includes(val);
}

export function typeIsWindow(val: any): val is Window {
  return val === window;
}
