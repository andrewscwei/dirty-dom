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
      targetMinSize: null,
      targetMaxSize: null,
      targetAggregatedMaxSize: null,
    },
    [DirtyType.POSITION]: {
      ...UpdateDelegate.DEFAULT_DIRTY_INFO[DirtyType.POSITION],
      targetPos: null,
      targetMinPos: null,
      targetMaxPos: null,
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
  private scrollBreakGetter?: (info: { minPos: Point, maxPos: Point, pos: Point, step: Point }) => ScrollBreakDescriptor;

  /**
   * Sets scroll breaks for this delegate.
   */
  set scrollBreaks(val: (info: { minPos: Point, maxPos: Point, pos: Point, step: Point }) => ScrollBreakDescriptor) {
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

  /** @inheritdoc */
  deinit() {
    super.deinit();

    this.scrollTargetGetter = undefined;
    this.scrollContainerGetter = undefined;
    this.scrollBreakGetter = undefined;
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

    const scrollTarget = this.scrollTargetGetter && this.scrollTargetGetter();

    if (!scrollTarget) return;

    const info = this.dirtyInfo[DirtyType.POSITION] || {};
    const targetRectFull = Rect.from(scrollTarget, { reference: scrollTarget, overflow: true });

    if (!targetRectFull) return;

    const targetRectMin = (Rect.from(scrollTarget, { reference: scrollTarget, overflow: false }) || new Rect()).clone({ x: 0, y: 0});
    const targetRectMax = targetRectFull.clone({ x: targetRectFull.width - targetRectMin.width, y: targetRectFull.height - targetRectMin.height });
    const targetPos = this.stepToNaturalPosition(info.step);

    if (!targetPos) return;

    this.dirtyInfo[DirtyType.POSITION] = {
      ...info,
      minTargetPos: new Point([targetRectMin.left, targetRectMin.top]),
      maxTargetPos: new Point([targetRectMax.left, targetRectMax.top]),
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
   * Converts a scroll step to a natural position. A natural position is a
   * coordinate in the scroll target that excludes all scroll breaks.
   *
   * @param step - Scroll step.
   *
   * @return The corresponding natural position.
   */
  protected stepToNaturalPosition(step: Point | undefined): Point | undefined {
    return this.virtualPositionToNaturalPosition(this.stepToVirtualPosition(step));
  }

  /**
   * Converts a scroll step to a virtual position. A virtual position is a
   * coordinate in the scroll target that includes all scroll breaks.
   *
   * @param point - Scroll step.
   *
   * @return The corresponding virtual position.
   */
  private stepToVirtualPosition(step: Point | undefined): Point | undefined {
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

    const step = this.virtualPositionToStep(position);

    if (!step) return undefined;

    const horizontalScrollBreak = this.getHorizontalScrollBreakAt(step.x) || this.getNearestHorizontalScrollBreakBefore(step.x) || { step: 0, length: 0 };
    const verticalScrollBreak = this.getVerticalScrollBreakAt(step.y) || this.getNearestVerticalScrollBreakBefore(step.y) || { step: 0, length: 0 };
    const scrollBreakStep = new Point({ x: horizontalScrollBreak.step, y: verticalScrollBreak.step });
    const scrollBreakPosition = this.stepToVirtualPosition(scrollBreakStep) || new Point();

    const rawPosition = new Point({
      x: position.x - this.aggregateHorizontalScrollBreaksBefore(step.x),
      y: position.y - this.aggregateVerticalScrollBreaksBefore(step.y),
    });

    const normalizedPosition = new Point({
      x: position.x > (scrollBreakPosition.x + horizontalScrollBreak.length) ? rawPosition.x : Math.min(rawPosition.x + horizontalScrollBreak.length, scrollBreakPosition.x - this.aggregateHorizontalScrollBreaksBefore(horizontalScrollBreak.step)),
      y: position.y > (scrollBreakPosition.y + verticalScrollBreak.length) ? rawPosition.y : Math.min(rawPosition.y + verticalScrollBreak.length, scrollBreakPosition.y - this.aggregateVerticalScrollBreaksBefore(verticalScrollBreak.step)),
    });

    return normalizedPosition;
  }

  /**
   * Gets the horizontal scroll break at the specified scroll step on the
   * x-axis.
   *
   * @param step - The scroll step on the x-axis.
   *
   * @return The scroll break.
   */
  private getHorizontalScrollBreakAt(step: number): ScrollBreak | undefined {
    if (isNaN(step)) return undefined;
    return (this.getScrollBreaks().x || []).find(val => val.step === step);
  }

  /**
   * Gets the vertical scroll break at the specified scroll step on the y-axis.
   *
   * @param step - The scroll step on the y-axis.
   *
   * @return The scroll break.
   */
  private getVerticalScrollBreakAt(step: number): ScrollBreak | undefined {
    if (isNaN(step)) return undefined;
    return (this.getScrollBreaks().y || []).find(val => val.step === step);
  }

  /**
   * Gets the nearest horizontal scroll break before the provided step on the
   * x-axis.
   *
   * @param step - The scroll step on the x-axis.
   *
   * @return The scroll break.
   */
  private getNearestHorizontalScrollBreakBefore(step: number): ScrollBreak | undefined {
    if (isNaN(step)) return undefined;

    let out;
    const scrollBreaks = this.getScrollBreaks().x || [];
    const n = scrollBreaks.length;

    for (let i = 0; i < n; i++) {
      const t = scrollBreaks[i];
      if (t.step > step) break;
      out = t;
    }

    return out;
  }

  /**
   * Gets the nearest vertical scroll break before the provided step on the
   * y-axis.
   *
   * @param step - The scroll step on the y-axis.
   *
   * @return The scroll break.
   */
  private getNearestVerticalScrollBreakBefore(step: number): ScrollBreak | undefined {
    if (isNaN(step)) return undefined;

    let out;
    const scrollBreaks = this.getScrollBreaks().y || [];
    const n = scrollBreaks.length;

    for (let i = 0; i < n; i++) {
      const t = scrollBreaks[i];
      if (t.step >= step) break;
      out = t;
    }

    return out;
  }

  /**
   * Gets the nearest horizontal scroll break after the provided step on the
   * x-axis.
   *
   * @param step - The scroll step on the x-axis.
   *
   * @return The scroll break.
   */
  private getNearestHorizontalScrollBreakAfter(step: number): ScrollBreak | undefined {
    if (isNaN(step)) return undefined;

    const scrollBreaks = this.getScrollBreaks().x || [];
    const n = scrollBreaks.length;

    for (let i = 0; i < n; i++) {
      const t = scrollBreaks[i];
      if (t.step > step) return t;
    }

    return undefined;
  }

  /**
   * Gets the nearest vertical scroll break after the provided step on the
   * y-axis.
   *
   * @param step - The scroll step on the y-axis.
   *
   * @return The scroll break.
   */
  private getNearestVertticalScrollBreakAfter(step: number): ScrollBreak | undefined {
    if (isNaN(step)) return undefined;

    const scrollBreaks = this.getScrollBreaks().y || [];
    const n = scrollBreaks.length;

    for (let i = 0; i < n; i++) {
      const t = scrollBreaks[i];
      if (t.step > step) return t;
    }

    return undefined;
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

  /**
   * Adds up and returns the total of all horizontal scroll break lengths
   * before the specified scroll step.
   *
   * @param step - The scroll step on the x-axis.
   *
   * @return The resulting total scroll break lengths.
   */
  private aggregateHorizontalScrollBreaksBefore(step: number): number {
    if (isNaN(step)) return 0;

    return (this.getScrollBreaks().x || []).reduce((out, curr) => {
      if (curr.step < step) return out + curr.length;
      return out;
    }, 0);
  }

  /**
   * Adds up and returns the total of all vertical scroll break lengths before
   * the specified scroll step.
   *
   * @param step - The scroll step on the y-axis.
   *
   * @return The resulting total scroll break lengths.
   */
  private aggregateVerticalScrollBreaksBefore(step: number): number {
    if (isNaN(step)) return 0;

    return (this.getScrollBreaks().y || []).reduce((out, curr) => {
      if (curr.step < step) return out + curr.length;
      return out;
    }, 0);
  }

  /**
   * Adds up and returns the total of all horizontal scroll break lengths
   * after the specified scroll step.
   *
   * @param step - The scroll step on the x-axis.
   *
   * @return The resulting total scroll break lengths.
   */
  private aggregateHorizontalScrollBreaksAfter(step: number): number {
    if (isNaN(step)) return 0;

    return (this.getScrollBreaks().x || []).reduce((out, curr) => {
      if (step > curr.step) return out + curr.length;
      return out;
    }, 0);
  }

  /**
   * Adds up and returns the total of all vertical scroll break lengths after
   * the specified scroll step.
   *
   * @param step - The scroll step on the y-axis.
   *
   * @return The resulting total scroll break lengths.
   */
  private aggregateVerticalScrollBreaksAfter(step: number): number {
    if (isNaN(step)) return 0;

    return (this.getScrollBreaks().y || []).reduce((out, curr) => {
      if (step > curr.step) return out + curr.length;
      return out;
    }, 0);
  }

  /**
   * Gets all the scroll breaks defined for this delegate, sorted by step.
   *
   * @return Descriptor of scroll breaks.
   */
  private getScrollBreaks(): ScrollBreakDescriptor {
    if (!this.scrollBreakGetter) return {};

    const refEl = this.eventTargetTable.scroll || window;
    const refRect = (typeIsWindow(refEl) ? Rect.fromViewport() : (Rect.from(refEl) || new Rect()).clone({ x: refEl.scrollLeft, y: refEl.scrollTop }));
    const refRectMin = refRect.clone({ x: 0, y: 0 });
    const refRectFull = Rect.from(refEl, { overflow: true });

    if (!refRectFull) return {};

    const refRectMax = refRectMin.clone({ x: refRectFull.width - refRect.width, y: refRectFull.height - refRect.height });
    const step = new Point([refRect.left / refRectMax.left, refRect.top / refRectMax.top]);
    const val = this.scrollBreakGetter({
      minPos: new Point([refRectMin.left, refRectMin.top]),
      maxPos: new Point([refRectMax.left, refRectMax.top]),
      pos: new Point([refRect.left, refRect.top]),
      step,
    });

    return {
      x: [...val.x || []].sort((a, b) => a.step - b.step),
      y: [...val.y || []].sort((a, b) => a.step - b.step),
    };
  }
}
