import UpdateDelegate from '../core/UpdateDelegate'
import DirtyType from '../enums/DirtyType'
import EventType from '../enums/EventType'

type Nullable<T> = T | undefined | null

export type DirtyTarget = Nullable<Window | HTMLElement | (() => Window | HTMLElement)>

/**
 * A type that describes what information was dirty, as categorized (and keyed) by affected
 * `DirtyType`s.
 */
export type DirtyInfo = {
  [key in DirtyType]?: Nullable<{ [key: string]: any }>;
}

export interface UpdateDelegator {

  /**
   * Handler invoked whenever the `UpdateDelegate` emits an update event.
   *
   * @param info - An object describing what information was dirty since the last invocation of this
   *               handler.
   * @param delegate - The `UpdateDelegate` that invoked this handler.
   */
  update: (info: DirtyInfo, delegate: UpdateDelegate) => void
}

/**
 * An object that describes all the x and y `ScrollBreak`s for a `ScrollDelegate`'s scroll target.
 */
export type ScrollBreakDescriptor = Readonly<{

  /**
   * The scroll breaks along the x-axis.
   */
  x?: ScrollBreak[]

  /**
   * The scroll breaks along the y-axis.
   */
  y?: ScrollBreak[]
}>

/**
 * An object interpreted by a `ScrollDelegate` that defines where a scroll break should be. A scroll
 * break is an x or y position along the scroll path where perceived scrolling freezes until the
 * the scroll target continues to scroll further for the specified `length` pixels.
 */
export type ScrollBreak = Readonly<{

  /**
   * The position where the scroll break should occur, expressed as a `step`, which is constrained
   * between the values `0.0` and `1.0`, inclusive, with `0.0` being the start of the scroll
   * container in the current axis and `1.0` being the end.
   */
  step: number

  /**
   * The length of the scroll break. This is the number of pixels that needs to be scrolled to exit
   * the scroll break.
   */
  length: number
}>

export type ScrollOptions = Readonly<{

  /**
   * Duration of scroll animation in milliseconds.
   */
  duration?: number

  /**
   * Enable ease in and out.
   */
  easing?: boolean

  /**
   * Specifies if the scroll animation can be overwritten by a new one defined on the same target.
   */
  isOverwriteable?: boolean

  /**
   * Handler invoked while the target is scrolling.
   */
  onProgress?: (progress: number) => void

  /**
   * Handler invoked whenever the target scrolling animation is cancelled.
   */
  onCancel?: () => void

  /**
   * Handler invoked when the target scrolling animation is complete.
   */
  onComplete?: () => void
}>

export interface ResponsiveDescriptor {

  /**
   * The DOM element or window to listen for events.
   */
  target?: DirtyTarget

  /**
   * Event types to listen for.
   */
  eventTypes?: EventType[]

  /**
   * Dispatch rate of events.
   */
  refreshRate?: number
}

export function typeIsDirtyType(val: any): val is DirtyType {
  if (isNaN(Number(val))) return false

  for (const key in DirtyType) {
    if (Number(DirtyType[key]) === Number(val)) return true
  }

  return false
}

export function typeIsEventType(val: any): val is EventType {
  return Object.values(EventType).includes(val)
}

export function typeIsWindow(val: any): val is Window {
  return val === window
}
