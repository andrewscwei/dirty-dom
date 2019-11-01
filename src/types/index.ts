import DirtyType from '../enums/DirtyType';
import EventType from '../enums/EventType';

export type DirtyInfo = {
  [key in DirtyType]?: { [key: string]: any } | undefined;
};

export interface UpdateDelegator {
  update: (info: DirtyInfo) => void;
}

export interface ResponsiveDescriptor {
  /**
   * The DOM element or window to listen for events.
   */
  conductor?: Window | HTMLElement;

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
