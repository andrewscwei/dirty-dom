import { Point, Rect, Size } from 'spase'
import { PointDescriptor } from 'spase/build/core/Point'
import { ScrollDelegate } from '..'
import DirtyType from '../enums/DirtyType'
import EventType from '../enums/EventType'
import { ResponsiveDescriptor, ScrollBreak, ScrollBreakDescriptor, UpdateDelegator } from '../types'

/**
 * A `StickyScrollDelegate` is subclass of `ScrollDelegate` that allows its scroll target to "stick"
 * to the brower in certain regions, as defined by its "scroll breaks". When the scroll target is
 * "stuck", it appears to have stopped moving, hence stuck in place,  while the browser scroll bar
 * continues to move. Only after the browser scrolls past a certain predefined point will the scroll
 * target "unstick" and start scrolling again.
 */
export default class StickyScrollDelegate extends ScrollDelegate {

  /**
   * Specifies if the scroll target position should automatically be updated.
   */
  shouldAutoUpdateScrollTarget = true

  /**
   * Gets the associated scroll container.
   */
  private scrollContainerGetter?: () => HTMLElement | undefined | null

  /**
   * Definied scroll break descriptors. A scroll break is a point in scrolling where the target
   * holds its position still until the scroll break length is surprassed.
   *
   * @param info - Object containing the minimum position and the maximum position of the scroll
   *               target.
   */
  private scrollBreakGetter?: (info: { minPos: Point; maxPos: Point }) => ScrollBreakDescriptor

  /**
   * Creates a new `StickyScrollDelegate` instance.
   *
   * @param delegator - The object to create this scroll delegate for.
   * @param descriptors - Map of responsive descriptors.
   */
  constructor(delegator: UpdateDelegator, descriptors: { [key: string]: number | true | ResponsiveDescriptor } = { [EventType.SCROLL]: true, [EventType.RESIZE]: true }) {
    super(delegator, descriptors)
  }

  /**
   * Sets scroll breaks for this delegate.
   */
  set scrollBreaks(val: (info: { minPos: Point; maxPos: Point }) => ScrollBreakDescriptor) {
    this.scrollBreakGetter = val
  }

  /**
   * Associates a scroll container to this delegate.
   */
  set scrollContainer(val: () => HTMLElement | undefined | null) {
    this.scrollContainerGetter = val
  }

  /** @inheritdoc */
  deinit() {
    super.deinit()

    this.scrollContainerGetter = undefined
    this.scrollBreakGetter = undefined
  }

  /**
   * Gets the relative step of a horizontal scroll break at the provided index.
   *
   * @param index - Scroll break index.
   * @param currStep - The current overall scroll step.
   *
   * @return The relative horizontal step.
   */
  getRelativeStepOfHorizontalScrollBreakAt(index: number, currStep: Point | PointDescriptor): number {
    const step = currStep instanceof Point ? currStep : new Point(currStep)
    const { x: scrollBreaks } = this.getScrollBreaks()

    if (!scrollBreaks) return NaN
    if (index < 0) return NaN
    if (index >= scrollBreaks.length) return NaN

    const maxPosition = this.scrollTargetMaxPosition
    if (!maxPosition) return NaN

    const position = this.stepToVirtualPosition(step)
    if (!position) return NaN

    const scrollBreak = scrollBreaks[index]

    const aggregatedLengths = scrollBreaks.reduce((out, curr) => {
      if (curr.step < scrollBreak.step) return out + curr.length
      return out
    }, 0)

    const min = scrollBreak.step * maxPosition.x + aggregatedLengths
    const max = min + scrollBreak.length

    if (position.x <= min) return 0
    if (position.x >= max) return 1

    return (position.x - min) / (max - min)
  }

  /**
   * Gets the relative step of a vertical scroll break at the provided index.
   *
   * @param index - Scroll break index.
   * @param currStep - The current overall scroll step.
   *
   * @return The relative vertical step.
   */
  getRelativeStepOfVerticalScrollBreakAt(index: number, currStep: Point | PointDescriptor): number {
    const step = currStep instanceof Point ? currStep : new Point(currStep)
    const { y: scrollBreaks } = this.getScrollBreaks()

    if (!scrollBreaks) return NaN
    if (index < 0) return NaN
    if (index >= scrollBreaks.length) return NaN

    const maxPosition = this.scrollTargetMaxPosition
    if (!maxPosition) return NaN

    const position = this.stepToVirtualPosition(step)
    if (!position) return NaN

    const scrollBreak = scrollBreaks[index]

    const aggregatedLengths = scrollBreaks.reduce((out, curr) => {
      if (curr.step < scrollBreak.step) return out + curr.length
      return out
    }, 0)

    const min = scrollBreak.step * maxPosition.y + aggregatedLengths
    const max = min + scrollBreak.length

    if (position.y <= min) return 0
    if (position.y >= max) return 1

    return (position.y - min) / (max - min)
  }

  /** @inheritdoc */
  protected updateSizeInfo() {
    super.updateSizeInfo()

    const aggregatedScrollBreaks = new Size([this.aggregateHorizontalScrollBreaks(), this.aggregateVerticalScrollBreaks()])
    const targetMaxSize = this.dirtyInfo[DirtyType.SIZE]?.targetMaxSize as Size

    if (!targetMaxSize) return

    const targetAggregatedMaxSize = targetMaxSize.add(aggregatedScrollBreaks)

    this.dirtyInfo[DirtyType.SIZE] = {
      ...this.dirtyInfo[DirtyType.SIZE] || {},
      targetAggregatedMaxSize,
    }

    this.updateScrollContainerSize(targetAggregatedMaxSize)
  }

  /** @inheritdoc */
  protected updatePositionInfo(reference?: HTMLElement | Window) {
    super.updatePositionInfo(reference)

    const info = this.dirtyInfo[DirtyType.POSITION] || {}
    const targetPos = this.stepToNaturalPosition(info.step)

    if (!targetPos) return

    this.updateScrollTargetPosition(targetPos)
  }

  /**
   * Updates the size of the scroll container, if provided.
   *
   * @param size - The size to apply to the scroll container.
   */
  protected updateScrollContainerSize(size: Size) {
    const scrollContainer = this.scrollContainerGetter && this.scrollContainerGetter()

    if (!scrollContainer) return

    scrollContainer.style.width = `${size.width}px`
    scrollContainer.style.height = `${size.height}px`
  }

  /**
   * Updates the scroll target position, if applicable.
   *
   * @param position - The position to apply to the scroll target.
   */
  protected updateScrollTargetPosition(position: Point) {
    if (!this.shouldAutoUpdateScrollTarget) return

    const scrollTarget = this.scrollTargetGetter && this.scrollTargetGetter()
    if (!scrollTarget) return

    scrollTarget.style.transform = `translate3d(-${isNaN(position.x) ? 0 : position.x}px, -${isNaN(position.y) ? 0 : position.y}px, 0)`
  }

  /**
   * Converts a scroll step to a virtual position. A virtual position is a coordinate in the scroll
   * target that includes all scroll breaks.
   *
   * @param point - Scroll step.
   *
   * @return The corresponding virtual position.
   */
  protected stepToVirtualPosition(step?: Point): Point | null {
    const scrollTarget = this.scrollTargetGetter && this.scrollTargetGetter()

    if (!step || !scrollTarget) return null

    const targetRectMin = Rect.from(scrollTarget, { reference: scrollTarget, overflow: false })?.clone({ x: 0, y: 0 })
    const targetRectFull = Rect.from(scrollTarget, { reference: scrollTarget, overflow: true })
    const aggregatedScrollBreaks = new Size([this.aggregateHorizontalScrollBreaks(), this.aggregateVerticalScrollBreaks()])

    if (!targetRectMin || !targetRectFull) return null

    const targetRectFullWithScrollBreaks = Rect.fromPointAndSize(new Point([0, 0]), targetRectFull.size.add(aggregatedScrollBreaks))

    const position = new Point({
      x: step.x * (targetRectFullWithScrollBreaks.width - targetRectMin.width),
      y: step.y * (targetRectFullWithScrollBreaks.height - targetRectMin.height),
    })

    return position
  }

  /**
   * Converts a scroll step to a natural position. A natural position is a coordinate in the scroll
   * target that excludes all scroll breaks.
   *
   * @param step - Scroll step.
   *
   * @return The corresponding natural position.
   */
  protected stepToNaturalPosition(step?: Point): Point | null {
    const virtualPosition = this.stepToVirtualPosition(step)
    if (!virtualPosition) return null
    return this.virtualPositionToNaturalPosition(virtualPosition)
  }

  /**
   * Converts a virtual position to a scroll step. A virtual position is a coordinate in the scroll
   * target that includes all scroll breaks.
   *
   * @param point - Virtual position.
   *
   * @return The corresponding scroll step.
   */
  protected virtualPositionToStep(position?: Point): Point | null {
    const scrollTarget = this.scrollTargetGetter && this.scrollTargetGetter()

    if (!position || !scrollTarget) return null

    const targetRectMin = Rect.from(scrollTarget, { reference: scrollTarget, overflow: false })?.clone({ x: 0, y: 0 })
    const targetRectFull = Rect.from(scrollTarget, { reference: scrollTarget, overflow: true })
    const aggregatedScrollBreaks = new Size([this.aggregateHorizontalScrollBreaks(), this.aggregateVerticalScrollBreaks()])

    if (!targetRectMin || !targetRectFull) return null

    const targetRectFullWithScrollBreaks = Rect.fromPointAndSize(new Point([0, 0]), targetRectFull.size.add(aggregatedScrollBreaks))

    return new Point({
      x: position.x / (targetRectFullWithScrollBreaks.width - targetRectMin.width),
      y: position.y / (targetRectFullWithScrollBreaks.height - targetRectMin.height),
    })
  }

  /**
   * Converts a virtual position to a natural position. A virtual position is a coordinate in the
   * scroll target that includes all scroll breaks, while a natural position is a coordinate in the
   * scroll target that excludes all scroll breaks.
   *
   * @param position - Virtual position.
   *
   * @return The corresponding natural position.
   */
  protected virtualPositionToNaturalPosition(position?: Point): Point | null {
    if (!position) return null

    const maxPosition = this.scrollTargetMaxPosition
    if (!maxPosition) return null

    const scrollBreaks = this.getScrollBreaks()

    let x = position.x
    let y = position.y

    if (scrollBreaks.x) {
      const ascScrollBreaks = [...scrollBreaks.x].sort((a, b) => a.step - b.step)

      let aggregatedLength = 0

      for (const { step, length } of ascScrollBreaks) {
        const minX = step * maxPosition.x + aggregatedLength
        const maxX = minX + length

        if (position.x <= maxX) {
          x = Math.min(position.x, minX) - aggregatedLength
          break
        }

        aggregatedLength += length
        x = position.x - aggregatedLength
      }
    }

    if (scrollBreaks.y) {
      const ascScrollBreaks = [...scrollBreaks.y].sort((a, b) => a.step - b.step)

      let aggregatedLength = 0

      for (const scrollBreak of ascScrollBreaks) {
        const { step, length } = scrollBreak
        const minY = step * maxPosition.y + aggregatedLength
        const maxY = minY + length

        if (position.y <= maxY) {
          y = Math.min(position.y, minY) - aggregatedLength
          break
        }

        aggregatedLength += length
        y = position.y - aggregatedLength
      }
    }

    return new Point({ x, y })
  }

  /**
   * Adds up and returns the total of all horizontal scroll break lengths.
   *
   * @return The total of all horizontal scroll break lengths.
   */
  private aggregateHorizontalScrollBreaks(): number {
    return (this.getScrollBreaks().x || []).reduce((out, curr) => out + curr.length, 0)
  }

  /**
   * Adds up and returns the total of all vertical scroll break lengths.
   *
   * @return The total of all vertical scroll break lengths.
   */
  private aggregateVerticalScrollBreaks(): number {
    return (this.getScrollBreaks().y || []).reduce((out, curr) => out + curr.length, 0)
  }

  private aggregateVerticalScrollBreaksBeforeBreakStep(step: number): number {
    const { y: scrollBreaks } = this.getScrollBreaks()

    if (!scrollBreaks) return 0

    const ascScrollBreaks = [...scrollBreaks].sort((a, b) => a.step - b.step)
    const maxPosition = this.scrollTargetMaxPosition

    if (!maxPosition) return 0

    const n = ascScrollBreaks.length

    let aggregatedLength = 0

    for (let i = 0; i < n; i++) {
      const scrollBreak = ascScrollBreaks[i]
      const minY = scrollBreak.step * maxPosition.y + aggregatedLength
      // const maxY = minY + scrollBreak.length

      if ((step * maxPosition.y) <= minY) break

      aggregatedLength += scrollBreak.length
    }

    return aggregatedLength
  }

  /**
   * Finds the nearest horizontal scroll break defined for this delegate without exceeding the
   * provided virtual x-position.
   *
   * @param position - The virtual x-position.
   *
   * @return The nearest vertical scroll break.
   */
  private findNearestHorizontalScrollBreakByVirtualPosition(position: number): ScrollBreak {
    const zero = { step: 0, length: 0 }

    return zero
  }

  /**
   * Finds the nearest vertical scroll break defined for this delegate without exceeding the
   * provided virtual y-position.
   *
   * @param position - The virtual y-position.
   *
   * @return The nearest vertical scroll break.
   */
  private findNearestVerticalScrollBreakByVirtualPosition(position: number): ScrollBreak {
    const zero = { step: 0, length: 0 }
    const { y: scrollBreaks } = this.getScrollBreaks()

    if (!scrollBreaks) return zero

    const ascScrollBreaks = [...scrollBreaks].sort((a, b) => a.step - b.step)
    const maxPosition = this.scrollTargetMaxPosition

    if (!maxPosition) return zero

    const n = ascScrollBreaks.length

    let aggregatedLength = 0
    let index = -1

    for (let i = 0; i < n; i++) {
      const { step, length } = ascScrollBreaks[i]
      const minY = step * maxPosition.y + aggregatedLength

      if (position < minY) break

      aggregatedLength += length
      index++
    }

    if (index < 0) return zero

    return ascScrollBreaks[index]
  }

  /**
   * Gets all the scroll breaks defined for this delegate, sorted by step.
   *
   * @return Descriptor of scroll breaks.
   */
  private getScrollBreaks(): ScrollBreakDescriptor {
    if (!this.scrollBreakGetter) return {}

    const minPos = this.scrollTargetMinPosition
    const maxPos = this.scrollTargetMaxPosition

    if (!minPos || !maxPos) return {}

    return this.scrollBreakGetter({ minPos, maxPos })
  }
}
