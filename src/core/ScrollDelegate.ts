import { Point, Rect } from 'spase'
import { PointDescriptor } from 'spase/build/core/Point'
import DirtyType from '../enums/DirtyType'
import EventType from '../enums/EventType'
import { DirtyInfo, ResponsiveDescriptor, ScrollOptions, typeIsWindow, UpdateDelegator } from '../types'
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
   * Gets the target element to simulate the scroll on.
   */
  protected scrollTargetGetter?: () => HTMLElement | undefined | null

  /**
   * Creates a new `ScrollDelegate` instance. If descriptors are not specified, this instance will
   * be automatically set up to listen for size and position update events of the window.
   *
   * @param delegator - The object to create this scroll delegate for.
   * @param descriptors - Map of responsive descriptors.
   */
  constructor(delegator: UpdateDelegator, descriptors: { [key: string]: number | true | ResponsiveDescriptor } = { [EventType.SCROLL]: true, [EventType.RESIZE]: true }) {
    super(delegator, descriptors)
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
   * Gets the minimum position of the scroll target.
   *
   * @return Minimum postiion of the scroll target.
   */
  get scrollTargetMinPosition(): Point | null {
    const scrollTarget = this.scrollTargetGetter && this.scrollTargetGetter()
    if (!scrollTarget) return null
    return new Point([0, 0])
  }

  /**
   * Gets the maximum position of the scroll target.
   *
   * @return Maximum position of the scroll target.
   */
  get scrollTargetMaxPosition(): Point | null {
    const scrollTarget = this.scrollTargetGetter && this.scrollTargetGetter()
    if (!scrollTarget) return null

    const targetRectMin = Rect.from(scrollTarget, { reference: scrollTarget, overflow: false })
    if (!targetRectMin) return null

    const targetRectFull = Rect.from(scrollTarget, { reference: scrollTarget, overflow: true })
    if (!targetRectFull) return null

    const targetRectMax = targetRectMin.clone({ x: targetRectFull.width - targetRectMin.width, y: targetRectFull.height - targetRectMin.height })

    return new Point({
      x: targetRectMax.left,
      y: targetRectMax.top,
    })
  }

  /**
   * Sets the scroll target for this delegate.
   */
  set scrollTarget(val: () => HTMLElement | undefined | null) {
    this.scrollTargetGetter = val
  }

  /** @inheritdoc */
  deinit() {
    super.deinit()

    this.scrollTargetGetter = undefined
  }

  /**
   * Gets the `Rect` of a child relative to the scroll target.
   *
   * @param index - Index of the child.
   *
   * @return The relative `Rect`.
   */
  getRelativeRectOfChildAt(index: number): Rect | null {
    const scrollTarget = this.scrollTargetGetter && this.scrollTargetGetter()
    return Rect.fromChildAt(index, scrollTarget)
  }

  /**
   * Gets the scroll step relative to a child in the scroll target.
   *
   * @param index - The index of the child in the scroll target.
   * @param currStep - The current overall scroll step.
   *
   * @return The relative scroll step to the child.
   */
  getRelativeStepOfChildAt(index: number, currStep: Point | PointDescriptor): Point | null {
    const step = currStep instanceof Point ? currStep : new Point(currStep)
    const scrollTarget = this.scrollTargetGetter && this.scrollTargetGetter()
    const rect = Rect.fromChildAt(index, scrollTarget)

    if (!rect) return null

    return this.getRelativeStepOfRect(rect, step)
  }

  /**
   * Gets the scroll step relative to a Rect in the scroll target.
   *
   * @param rect - The Rect in the scroll target.
   * @param currStep - The current overall scroll step.
   *
   * @return The relative scroll step to the Rect.
   */
  getRelativeStepOfRect(rect: Rect, currStep: Point | PointDescriptor): Point | null {
    const step = currStep instanceof Point ? currStep : new Point(currStep)
    const scrollTarget = this.scrollTargetGetter && this.scrollTargetGetter()
    const targetRectMin = Rect.from(scrollTarget)
    const position = this.stepToNaturalPosition(step)

    if (!scrollTarget || !targetRectMin || !position) return null

    let x = NaN
    let y = NaN

    if ((position.x + targetRectMin.width) <= rect.left) {
      x = 0
    }
    else if ((position.x + targetRectMin.width) >= rect.right) {
      x = 1
    }
    else {
      x = ((position.x + targetRectMin.width) - rect.left) / (rect.right - rect.left)
    }

    if ((position.y + targetRectMin.height) <= rect.top) {
      y = 0
    }
    else if ((position.y + targetRectMin.height) >= rect.bottom) {
      y = 1
    }
    else {
      y = ((position.y + targetRectMin.height) - rect.top) / (rect.bottom - rect.top)
    }

    return new Point({ x, y })
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

  /** @inheritdoc */
  protected updateSizeInfo() {
    super.updateSizeInfo()

    const scrollTarget = this.scrollTargetGetter && this.scrollTargetGetter()

    if (!scrollTarget) return

    const targetRectMin = Rect.from(scrollTarget)
    const targetRectMax = Rect.from(scrollTarget, { overflow: true })

    if (!targetRectMin || !targetRectMax) return

    this.dirtyInfo[DirtyType.SIZE] = {
      ...this.dirtyInfo[DirtyType.SIZE] || {},
      targetMinSize: targetRectMin.size,
      targetMaxSize: targetRectMax.size,
    }
  }

  /** @inheritdoc */
  protected updatePositionInfo(reference?: HTMLElement | Window) {
    super.updatePositionInfo(reference)

    const info = this.dirtyInfo[DirtyType.POSITION] || {}
    const targetPos = this.stepToNaturalPosition(info.step)

    if (!targetPos) return

    this.dirtyInfo[DirtyType.POSITION] = {
      ...info,
      minTargetPos: this.scrollTargetMinPosition,
      maxTargetPos: this.scrollTargetMaxPosition,
      targetPos,
    }
  }

  /**
   * Converts a scroll step to a natural position. A natural position in this context is just a
   * scroll position (x-y coordinate in pixels).
   *
   * @param step - Scroll step.
   *
   * @return The corresponding natural position.
   */
  protected stepToNaturalPosition(step?: Point): Point | null {
    const scrollTarget = this.scrollTargetGetter && this.scrollTargetGetter()

    if (!step || !scrollTarget) return null

    const targetRectMin = Rect.from(scrollTarget, { reference: scrollTarget, overflow: false })?.clone({ x: 0, y: 0 })
    const targetRectFull = Rect.from(scrollTarget, { reference: scrollTarget, overflow: true })

    if (!targetRectMin || !targetRectFull) return null

    const targetRectFullWithScrollBreaks = Rect.fromPointAndSize(new Point([0, 0]), targetRectFull.size)

    const position = new Point({
      x: step.x * (targetRectFullWithScrollBreaks.width - targetRectMin.width),
      y: step.y * (targetRectFullWithScrollBreaks.height - targetRectMin.height),
    })

    return position
  }
}
