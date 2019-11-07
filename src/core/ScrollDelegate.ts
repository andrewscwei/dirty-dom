import { Point, Rect, Size } from 'spase';
import DirtyType from '../enums/DirtyType';
import EventType from '../enums/EventType';
import { DirtyInfo, ResponsiveDescriptor, ScrollBreak, ScrollBreakDescriptor, typeIsWindow, UpdateDelegator } from '../types';
import UpdateDelegate from './UpdateDelegate';

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
  };

  /**
   * Specifies if the scroll target position should automatically be updated.
   */
  shouldAutoUpdateScrollTarget: boolean = true;

  /**
   * Gets the target element to simulate the scroll on.
   */
  private scrollTargetGetter?: () => HTMLElement | undefined | null;

  /**
   * Gets the associated scroll container.
   */
  private scrollContainerGetter?: () => HTMLElement | undefined | null;

  /**
   * Definied scroll break descriptors. A scroll break is a point in scrolling
   * where the target holds its position still until the scroll break length
   * is surprassed.
   */
  private scrollBreakGetter?: (info: { minPos: Point, maxPos: Point }) => ScrollBreakDescriptor;

  /**
   * Gets the minimum scroll position of the reference element.
   *
   * @return Minimum scroll position.
   */
  get minPosition(): Point {
    return new Point([0, 0]);
  }

  /**
   * Gets the maximum scroll position of the reference element.
   *
   * @return Maximum scroll position.
   */
  get maxPosition(): Point {
    const refEl = this.eventTargetTable.scroll || window;
    const refRect = typeIsWindow(refEl) ? Rect.fromViewport() : Rect.from(refEl);
    const refRectFull = Rect.from(refEl, { overflow: true });

    if (!refRect || !refRectFull) return new Point([0, 0]);

    const refRectMax = refRect.clone({ x: refRectFull.width - refRect.width, y: refRectFull.height - refRect.height });

    return new Point([refRectMax.left, refRectMax.top]);
  }

  /**
   * Gets the minimum position of the scroll target.
   *
   * @return Minimum postiion of the scroll target.
   */
  get scrollTargetMinPosition(): Point | undefined {
    const scrollTarget = this.scrollTargetGetter && this.scrollTargetGetter();
    if (!scrollTarget) return undefined;
    return new Point([0, 0]);
  }

  /**
   * Gets the maximum position of the scroll target.
   *
   * @return Maximum position of the scroll target.
   */
  get scrollTargetMaxPosition(): Point | undefined {
    const scrollTarget = this.scrollTargetGetter && this.scrollTargetGetter();
    if (!scrollTarget) return undefined;

    const targetRectMin = Rect.from(scrollTarget, { reference: scrollTarget, overflow: false });
    if (!targetRectMin) return undefined;

    const targetRectFull = Rect.from(scrollTarget, { reference: scrollTarget, overflow: true });
    if (!targetRectFull) return undefined;

    const targetRectMax = targetRectMin.clone({ x: targetRectFull.width - targetRectMin.width, y: targetRectFull.height - targetRectMin.height });

    return new Point({
      x: targetRectMax.left,
      y: targetRectMax.top,
    });
  }

  /**
   * Sets scroll breaks for this delegate.
   */
  set scrollBreaks(val: (info: { minPos: Point, maxPos: Point }) => ScrollBreakDescriptor) {
    this.scrollBreakGetter = val;
  }

  /**
   * Sets the scroll target for this delegate.
   */
  set scrollTarget(val: () => HTMLElement | undefined | null) {
    this.scrollTargetGetter = val;
  }

  /**
   * Associates a scroll container to this delegate.
   */
  set scrollContainer(val: () => HTMLElement | undefined | null) {
    this.scrollContainerGetter = val;
  }

  /**
   * Creates a new ScrollDelegate instance.
   *
   * @param delegator - The object to create this scroll delegate for.
   * @param descriptors - Map of responsive descriptors.
   */
  constructor(delegator: UpdateDelegator, descriptors: { [key: string]: number | true | ResponsiveDescriptor } = { [EventType.SCROLL]: true, [EventType.RESIZE]: true }) {
    super(delegator, descriptors);
  }

  /** @inheritdoc */
  deinit() {
    super.deinit();

    this.scrollTargetGetter = undefined;
    this.scrollContainerGetter = undefined;
    this.scrollBreakGetter = undefined;
  }

  /**
   * Gets the scroll step relative to a child in the scroll target.
   *
   * @param index - The index of the child in the scroll target.
   * @param currStep - The current overall scroll step.
   *
   * @return The relative scroll step to the child.
   */
  getRelativeStepOfChildAt(index: number, currStep: Point): Point | undefined {
    const scrollTarget = this.scrollTargetGetter && this.scrollTargetGetter();
    const rect = Rect.fromChildAt(index, scrollTarget);

    if (!rect) return undefined;

    return this.getRelativeStepOfRect(rect, currStep);
  }

  /**
   * Gets the scroll step relative to a Rect in the scroll target.
   *
   * @param rect - The Rect in the scroll target.
   * @param currStep - The current overall scroll step.
   *
   * @return The relative scroll step to the Rect.
   */
  getRelativeStepOfRect(rect: Rect, currStep: Point): Point | undefined {
    const scrollTarget = this.scrollTargetGetter && this.scrollTargetGetter();
    const targetRectMin = Rect.from(scrollTarget);
    const position = this.stepToNaturalPosition(currStep);

    if (!scrollTarget || !targetRectMin || !position) return undefined;

    let x = NaN;
    let y = NaN;

    if ((position.x + targetRectMin.width) <= rect.left) {
      x = 0;
    }
    else if ((position.x + targetRectMin.width) >= rect.right) {
      x = 1;
    }
    else {
      x = ((position.x + targetRectMin.width) - rect.left) / (rect.right - rect.left);
    }

    if ((position.y + targetRectMin.height) <= rect.top) {
      y = 0;
    }
    else if ((position.y + targetRectMin.height) >= rect.bottom) {
      y = 1;
    }
    else {
      y = ((position.y + targetRectMin.height) - rect.top) / (rect.bottom - rect.top);
    }

    return new Point({ x, y });
  }

  /**
   * Gets the relative step of a horizontal scroll break at the provided index.
   *
   * @param index - Scroll break index.
   * @param currStep - The current overall scroll step.
   *
   * @return The relative horizontal step.
   */
  getRelativeStepOfHorizontalScrollBreakAt(index: number, currStep: Point): number {
    const { x: scrollBreaks } = this.getScrollBreaks();

    if (!scrollBreaks) return NaN;
    if (index < 0) return NaN;
    if (index >= scrollBreaks.length) return NaN;

    const maxPosition = this.scrollTargetMaxPosition;
    if (!maxPosition) return NaN;

    const position = this.stepToVirtualPosition(currStep);
    if (!position) return NaN;

    const scrollBreak = scrollBreaks[index];

    const aggregatedLengths = scrollBreaks.reduce((out, curr) => {
      if (curr.step < scrollBreak.step) return out + curr.length;
      return out;
    }, 0);

    const min = scrollBreak.step * maxPosition.x + aggregatedLengths;
    const max = min + scrollBreak.length;

    if (position.x <= min) return 0;
    if (position.x >= max) return 1;

    return (position.x - min) / (max - min);
  }

  /**
   * Gets the relative step of a vertical scroll break at the provided index.
   *
   * @param index - Scroll break index.
   * @param currStep - The current overall scroll step.
   *
   * @return The relative vertical step.
   */
  getRelativeStepOfVerticalScrollBreakAt(index: number, currStep: Point): number {
    const { y: scrollBreaks } = this.getScrollBreaks();

    if (!scrollBreaks) return NaN;
    if (index < 0) return NaN;
    if (index >= scrollBreaks.length) return NaN;

    const maxPosition = this.scrollTargetMaxPosition;
    if (!maxPosition) return NaN;

    const position = this.stepToVirtualPosition(currStep);
    if (!position) return NaN;

    const scrollBreak = scrollBreaks[index];

    const aggregatedLengths = scrollBreaks.reduce((out, curr) => {
      if (curr.step < scrollBreak.step) return out + curr.length;
      return out;
    }, 0);

    const min = scrollBreak.step * maxPosition.y + aggregatedLengths;
    const max = min + scrollBreak.length;

    if (position.y <= min) return 0;
    if (position.y >= max) return 1;

    return (position.y - min) / (max - min);
  }

  /** @inheritdoc */
  protected updateSizeInfo() {
    const scrollTarget = this.scrollTargetGetter && this.scrollTargetGetter();
    if (!scrollTarget) return;

    const targetRectMin = Rect.from(scrollTarget);
    const targetRectMax = Rect.from(scrollTarget, { overflow: true });
    const aggregatedScrollBreaks = new Size([this.aggregateHorizontalScrollBreaks(), this.aggregateVerticalScrollBreaks()]);

    if (targetRectMin && targetRectMax) {
      const targetAggregatedMaxSize = targetRectMax.size.add(aggregatedScrollBreaks);

      this.dirtyInfo[DirtyType.SIZE] = {
        ...this.dirtyInfo[DirtyType.SIZE] || {},
        targetMinSize: targetRectMin.size,
        targetMaxSize: targetRectMax.size,
        targetAggregatedMaxSize,
      };

      this.updateScrollContainerSize(targetAggregatedMaxSize);
    }

    super.updateSizeInfo();
  }

  /** @inheritdoc */
  protected updatePositionInfo(reference?: HTMLElement | Window) {
    super.updatePositionInfo(reference);

    const info = this.dirtyInfo[DirtyType.POSITION] || {};
    const targetPos = this.stepToNaturalPosition(info.step);

    if (!targetPos) return;

    this.dirtyInfo[DirtyType.POSITION] = {
      ...info,
      minTargetPos: this.scrollTargetMinPosition,
      maxTargetPos: this.scrollTargetMaxPosition,
      targetPos,
    };

    this.updateScrollTargetPosition(targetPos);
  }

  /**
   * Updates the size of the scroll container, if provided.
   *
   * @param size - The size to apply to the scroll container.
   */
  protected updateScrollContainerSize(size: Size) {
    const scrollContainer = this.scrollContainerGetter && this.scrollContainerGetter();
    if (!scrollContainer) return;

    if (scrollContainer) {
      scrollContainer.style.width = `${size.width}px`;
      scrollContainer.style.height = `${size.height}px`;
    }
  }

  /**
   * Updates the scroll target position, if applicable.
   *
   * @param position - The position to apply to the scroll target.
   */
  protected updateScrollTargetPosition(position: Point) {
    if (!this.shouldAutoUpdateScrollTarget) return;

    const scrollTarget = this.scrollTargetGetter && this.scrollTargetGetter();
    if (!scrollTarget) return;

    scrollTarget.style.transform = `translate3d(-${isNaN(position.x) ? 0 : position.x}px, -${isNaN(position.y) ? 0 : position.y}px, 0)`;
  }

  /**
   * Converts a scroll step to a virtual position. A virtual position is a
   * coordinate in the scroll target that includes all scroll breaks.
   *
   * @param point - Scroll step.
   *
   * @return The corresponding virtual position.
   */
  protected stepToVirtualPosition(step: Point | undefined): Point | undefined {
    const scrollTarget = this.scrollTargetGetter && this.scrollTargetGetter();

    if (!step || !scrollTarget) return undefined;

    const targetRectMin = Rect.from(scrollTarget, { reference: scrollTarget, overflow: false })!.clone({ x: 0, y: 0});
    const targetRectFull = Rect.from(scrollTarget, { reference: scrollTarget, overflow: true });
    const aggregatedScrollBreaks = new Size([this.aggregateHorizontalScrollBreaks(), this.aggregateVerticalScrollBreaks()]);

    if (!targetRectFull) return undefined;

    const targetRectFullWithScrollBreaks = Rect.fromPointAndSize(new Point([0, 0]), targetRectFull.size.add(aggregatedScrollBreaks));

    const position = new Point({
      x: step.x * (targetRectFullWithScrollBreaks.width - targetRectMin.width),
      y: step.y * (targetRectFullWithScrollBreaks.height - targetRectMin.height),
    });

    return position;
  }

  /**
   * Converts a scroll step to a natural position. A natural position is a
   * coordinate in the scroll target that excludes all scroll breaks.
   *
   * @param step - Scroll step.
   *
   * @return The corresponding natural position.
   */
  private stepToNaturalPosition(step: Point | undefined): Point | undefined {
    return this.virtualPositionToNaturalPosition(this.stepToVirtualPosition(step));
  }

  /**
   * Converts a virtual position to a scroll step. A virtual position is a
   * coordinate in the scroll target that includes all scroll breaks.
   *
   * @param point - Virtual position.
   *
   * @return The corresponding scroll step.
   */
  private virtualPositionToStep(position: Point | undefined): Point | undefined {
    const scrollTarget = this.scrollTargetGetter && this.scrollTargetGetter();

    if (!position || !scrollTarget) return undefined;

    const targetRectMin = Rect.from(scrollTarget, { reference: scrollTarget, overflow: false })!.clone({ x: 0, y: 0});
    const targetRectFull = Rect.from(scrollTarget, { reference: scrollTarget, overflow: true });
    const aggregatedScrollBreaks = new Size([this.aggregateHorizontalScrollBreaks(), this.aggregateVerticalScrollBreaks()]);

    if (!targetRectFull) return undefined;

    const targetRectFullWithScrollBreaks = Rect.fromPointAndSize(new Point([0, 0]), targetRectFull.size.add(aggregatedScrollBreaks));

    return new Point({
      x: position.x / (targetRectFullWithScrollBreaks.width - targetRectMin.width),
      y: position.y / (targetRectFullWithScrollBreaks.height - targetRectMin.height),
    });
  }

  /**
   * Converts a virtual position to a natural position. A virtual position is a
   * coordinate in the scroll target that includes all scroll breaks, while a
   * natural position is a coordinate in the scroll target that excludes all
   * scroll breaks.
   *
   * @param position - Virtual position.
   *
   * @return The corresponding natural position.
   */
  private virtualPositionToNaturalPosition(position: Point | undefined): Point | undefined {
    if (!position) return undefined;

    const maxPosition = this.scrollTargetMaxPosition;
    if (!maxPosition) return undefined;

    const scrollBreaks = this.getScrollBreaks();

    let x = position.x;
    let y = position.y;

    if (scrollBreaks.x) {
      const ascScrollBreaks = [...scrollBreaks.x].sort((a, b) => a.step - b.step);

      let aggregatedLength = 0;

      for (const { step, length } of ascScrollBreaks) {
        const minX = step * maxPosition.x + aggregatedLength;
        const maxX = minX + length;

        if (position.x <= maxX) {
          x = Math.min(position.x, minX) - aggregatedLength;
          break;
        }

        aggregatedLength += length;
        x = position.x - aggregatedLength;
      }
    }

    if (scrollBreaks.y) {
      const ascScrollBreaks = [...scrollBreaks.y].sort((a, b) => a.step - b.step);

      let aggregatedLength = 0;

      for (const scrollBreak of ascScrollBreaks) {
        const { step, length } = scrollBreak;
        const minY = step * maxPosition.y + aggregatedLength;
        const maxY = minY + length;

        if (position.y <= maxY) {
          y = Math.min(position.y, minY) - aggregatedLength;
          break;
        }

        aggregatedLength += length;
        y = position.y - aggregatedLength;
      }
    }

    return new Point({ x, y });
  }

  /**
   * Adds up and returns the total of all horizontal scroll break lengths.
   *
   * @return The total of all horizontal scroll break lengths.
   */
  private aggregateHorizontalScrollBreaks(): number {
    return (this.getScrollBreaks().x || []).reduce((out, curr) => out + curr.length, 0);
  }

  /**
   * Adds up and returns the total of all vertical scroll break lengths.
   *
   * @return The total of all vertical scroll break lengths.
   */
  private aggregateVerticalScrollBreaks(): number {
    return (this.getScrollBreaks().y || []).reduce((out, curr) => out + curr.length, 0);
  }

  private aggregateVerticalScrollBreaksBeforeBreakStep(step: number): number {
    const { y: scrollBreaks } = this.getScrollBreaks();

    if (!scrollBreaks) return 0;

    const ascScrollBreaks = [...scrollBreaks].sort((a, b) => a.step - b.step);
    const maxPosition = this.scrollTargetMaxPosition;

    if (!maxPosition) return 0;

    const n = ascScrollBreaks.length;

    let aggregatedLength = 0;

    for (let i = 0; i < n; i++) {
      const scrollBreak = ascScrollBreaks[i];
      const minY = scrollBreak.step * maxPosition.y + aggregatedLength;
      const maxY = minY + scrollBreak.length;

      if ((step * maxPosition.y) <= minY) break;

      aggregatedLength += scrollBreak.length;
    }

    return aggregatedLength;
  }

  /**
   * Finds the nearest horizontal scroll break defined for this delegate without
   * exceeding the provided virtual x-position.
   *
   * @param position - The virtual x-position.
   *
   * @return The nearest vertical scroll break.
   */
  private findNearestHorizontalScrollBreakByVirtualPosition(position: number): ScrollBreak {
    const zero = { step: 0, length: 0 };

    return zero;
  }

  /**
   * Finds the nearest vertical scroll break defined for this delegate without
   * exceeding the provided virtual y-position.
   *
   * @param position - The virtual y-position.
   *
   * @return The nearest vertical scroll break.
   */
  private findNearestVerticalScrollBreakByVirtualPosition(position: number): ScrollBreak {
    const zero = { step: 0, length: 0 };
    const { y: scrollBreaks } = this.getScrollBreaks();

    if (!scrollBreaks) return zero;

    const ascScrollBreaks = [...scrollBreaks].sort((a, b) => a.step - b.step);
    const maxPosition = this.scrollTargetMaxPosition;

    if (!maxPosition) return zero;

    const n = ascScrollBreaks.length;

    let aggregatedLength = 0;
    let index = -1;

    for (let i = 0; i < n; i++) {
      const { step, length } = ascScrollBreaks[i];
      const minY = step * maxPosition.y + aggregatedLength;

      if (position < minY) break;

      aggregatedLength += length;
      index++;
    }

    if (index < 0) return zero;

    return ascScrollBreaks[index];
  }

  /**
   * Gets all the scroll breaks defined for this delegate, sorted by step.
   *
   * @return Descriptor of scroll breaks.
   */
  private getScrollBreaks(): ScrollBreakDescriptor {
    if (!this.scrollBreakGetter) return {};

    const minPos = this.scrollTargetMinPosition;
    const maxPos = this.scrollTargetMaxPosition;

    if (!minPos || !maxPos) return {};

    return this.scrollBreakGetter({ minPos, maxPos });
  }
}
