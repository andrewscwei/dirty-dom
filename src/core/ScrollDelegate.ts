import { Point, Rect } from 'spase'
import { DirtyType, EventType } from '../enums/index.js'
import { typeIsWindow, type DirtyInfo, type ResponsiveDescriptor, type ScrollOptions } from '../types/index.js'
import { hscrollTo, scrollTo, scrollToBottom, scrollToLeft, scrollToRight, scrollToTop, vscrollTo } from '../utils/index.js'
import { UpdateDelegate } from './UpdateDelegate.js'

/**
 * A specific type of {@link UpdateDelegate} that has position and size update
 * events set up.
 */
export class ScrollDelegate extends UpdateDelegate {
  protected static DEFAULT_DIRTY_INFO: DirtyInfo = {
    ...UpdateDelegate.DEFAULT_DIRTY_INFO,
    [DirtyType.SIZE]: {
      ...UpdateDelegate.DEFAULT_DIRTY_INFO[DirtyType.SIZE],
      targetMinSize: undefined,
      targetMaxSize: undefined,
      targetAggregatedMaxSize: undefined,
    },
    [DirtyType.POSITION]: {
      ...UpdateDelegate.DEFAULT_DIRTY_INFO[DirtyType.POSITION],
      targetPos: undefined,
      targetMinPos: undefined,
      targetMaxPos: undefined,
    },
  }

  /**
   * Creates a new {@link ScrollDelegate} instance. If descriptors are not
   * specified, this instance will be automatically set up to listen for size
   * and position update events of the window.
   *
   * @param updateHandler The handler to invoke upon every update event.
   * @param descriptors Map of responsive descriptors.
   */
  constructor(updateHandler: (info: DirtyInfo, delegate: UpdateDelegate) => void, descriptors: Record<string, number | true | ResponsiveDescriptor> = { [EventType.SCROLL]: true, [EventType.RESIZE]: true }) {
    super(updateHandler, descriptors)
  }

  /**
   * Gets the minimum scroll position of the reference element.
   *
   * @returns Minimum scroll position.
   */
  get minPosition(): Point {
    return new Point([0, 0])
  }

  /**
   * Gets the maximum scroll position of the reference element.
   *
   * @returns Maximum scroll position.
   */
  get maxPosition(): Point {
    const refEl = this.getDirtyTarget(this.eventTargetDict[EventType.SCROLL]) || window
    const refRect = typeIsWindow(refEl) ? this.viewport : Rect.from(refEl)
    const refRectFull = Rect.from(refEl, { overflow: true })

    if (!refRect || !refRectFull) return new Point([0, 0])

    const refRectMax = refRect.clone({ x: refRectFull.width - refRect.width, y: refRectFull.height - refRect.height })

    return new Point([refRectMax.left, refRectMax.top])
  }

  /**
   * Scrolls the scroll event listener to the top of its minimum vertical scroll
   * position.
   *
   * @param options See {@link ScrollOptions}.
   */
  scrollToTop(options?: ScrollOptions) {
    const target = this.getDirtyTarget(this.eventTargetDict[EventType.SCROLL])
    if (!target) return
    scrollToTop(target, options)
  }

  /**
   * Scrolls the scroll event listener to the bottom of its maximum vertical
   * scroll position.
   *
   * @param options See {@link ScrollOptions}.
   */
  scrollToBottom(options?: ScrollOptions) {
    const target = this.getDirtyTarget(this.eventTargetDict[EventType.SCROLL])
    if (!target) return
    scrollToBottom(target, options)
  }

  /**
   * Scrolls the scroll event listener to the left of its maximum horizontal
   * scroll position.
   *
   * @param options See {@link ScrollOptions}.
   */
  scrollToLeft(options?: ScrollOptions) {
    const target = this.getDirtyTarget(this.eventTargetDict[EventType.SCROLL])
    if (!target) return
    scrollToLeft(target, options)
  }

  /**
   * Scrolls the scroll event listener to the right of its maximum horizontal
   * scroll position.
   *
   * @param options See {@link ScrollOptions}.
   */
  scrollToRight(options?: ScrollOptions) {
    const target = this.getDirtyTarget(this.eventTargetDict[EventType.SCROLL])
    if (!target) return
    scrollToRight(target, options)
  }

  /**
   * Scrolls the scroll event listener to the specified position.
   *
   * @param position The position to scroll to.
   * @param options See {@link ScrollOptions}.
   */
  scrollTo(position: Point, options?: ScrollOptions) {
    const target = this.getDirtyTarget(this.eventTargetDict[EventType.SCROLL])
    if (!target) return

    scrollTo(position, target, options)
  }

  /**
   * Scrolls the scroll event listener horizontally to the specified
   * x-coordinate.
   *
   * @param x The x-coordinate to scroll to.
   * @param options See {@link ScrollOptions}.
   */
  hscrollTo(x: number, options?: ScrollOptions) {
    const target = this.getDirtyTarget(this.eventTargetDict[EventType.SCROLL])
    if (!target) return

    hscrollTo(x, target, options)
  }

  /**
   * Scrolls the scroll event listener horizontally to the specified
   * y-coordinate.
   *
   * @param y The y-coordinate to scroll to.
   * @param options See {@link ScrollOptions}.
   */
  vscrollTo(y: number, options?: ScrollOptions) {
    const target = this.getDirtyTarget(this.eventTargetDict[EventType.SCROLL])
    if (!target) return

    vscrollTo(y, target, options)
  }
}
