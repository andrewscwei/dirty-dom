import { Point, Rect } from 'spase'
import DirtyType from '../enums/DirtyType'
import EventType from '../enums/EventType'
import { DirtyInfo, ResponsiveDescriptor, ScrollOptions, typeIsWindow } from '../types'
import { hscrollTo, scrollTo, scrollToBottom, scrollToLeft, scrollToRight, scrollToTop, vscrollTo } from '../utils/scroll'
import UpdateDelegate from './UpdateDelegate'

/**
 * A specific type of `UpdateDelegate` that has position and size update events set up.
 */
export default class ScrollDelegate extends UpdateDelegate {

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
   * Creates a new `ScrollDelegate` instance. If descriptors are not specified, this instance will
   * be automatically set up to listen for size and position update events of the window.
   *
   * @param updateHandler - The handler to invoke upon every update event.
   * @param descriptors - Map of responsive descriptors.
   */
  constructor(updateHandler: (info: DirtyInfo, delegate: UpdateDelegate) => void, descriptors: { [key: string]: number | true | ResponsiveDescriptor } = { [EventType.SCROLL]: true, [EventType.RESIZE]: true }) {
    super(updateHandler, descriptors)
  }

  /**
   * Gets the minimum scroll position of the reference element.
   *
   * @return Minimum scroll position.
   */
  get minPosition(): Point {
    return new Point([0, 0])
  }

  /**
   * Gets the maximum scroll position of the reference element.
   *
   * @return Maximum scroll position.
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
   * Scrolls the scroll event listener to the top of its minimum vertical scroll position.
   *
   * @param options - @see ScrollOptions
   */
  scrollToTop(options?: ScrollOptions) {
    const target = this.getDirtyTarget(this.eventTargetDict[EventType.SCROLL])
    if (!target) return
    scrollToTop(target, options)
  }

  /**
   * Scrolls the scroll event listener to the bottom of its maximum vertical scroll position.
   *
   * @param options - @see ScrollOptions
   */
  scrollToBottom(options?: ScrollOptions) {
    const target = this.getDirtyTarget(this.eventTargetDict[EventType.SCROLL])
    if (!target) return
    scrollToBottom(target, options)
  }

  /**
   * Scrolls the scroll event listener to the left of its maximum horizontal scroll position.
   *
   * @param options - @see ScrollOptions
   */
  scrollToLeft(options?: ScrollOptions) {
    const target = this.getDirtyTarget(this.eventTargetDict[EventType.SCROLL])
    if (!target) return
    scrollToLeft(target, options)
  }

  /**
   * Scrolls the scroll event listener to the right of its maximum horizontal scroll position.
   *
   * @param options - @see ScrollOptions
   */
  scrollToRight(options?: ScrollOptions) {
    const target = this.getDirtyTarget(this.eventTargetDict[EventType.SCROLL])
    if (!target) return
    scrollToRight(target, options)
  }

  /**
   * Scrolls the scroll event listener to the specified position.
   *
   * @param position - The position to scroll to.
   * @param options - @see ScrollOptions
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
   * @param x - The x-coordinate to scroll to.
   * @param options - @see ScrollOptions
   */
  hscrollTo(x: number, options?: ScrollOptions) {
    const target = this.getDirtyTarget(this.eventTargetDict[EventType.SCROLL])
    if (!target) return

    hscrollTo(x, target, options)
  }

  /**
   * Scrolls the scroll event listener horizontally to the specified y-coordinate.
   *
   * @param y - The y-coordinate to scroll to.
   * @param options - @see ScrollOptions
   */
  vscrollTo(y: number, options?: ScrollOptions) {
    const target = this.getDirtyTarget(this.eventTargetDict[EventType.SCROLL])
    if (!target) return

    vscrollTo(y, target, options)
  }
}
