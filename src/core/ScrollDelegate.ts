import { Rect } from 'spase';
import DirtyType from '../enums/DirtyType';
import EventType from '../enums/EventType';
import { DirtyInfo, ResponsiveDescriptor, UpdateDelegator } from '../types';
import UpdateDelegate from './UpdateDelegate';

class ScrollDelegate extends UpdateDelegate {
  protected static DEFAULT_DIRTY_INFO: DirtyInfo = {
    ...UpdateDelegate.DEFAULT_DIRTY_INFO,
    [DirtyType.POSITION]: {
      x: NaN,
      minX: NaN,
      maxX: NaN,
      stepX: NaN,
      cx: NaN,
      minCX: NaN,
      maxCX: NaN,
      stepCX: NaN,
      y: NaN,
      minY: NaN,
      maxY: NaN,
      stepY: NaN,
      cy: NaN,
      minCY: NaN,
      maxCY: NaN,
      stepCY: NaN,
      maxWidth: NaN,
      maxHeight: NaN,
    },
  };

  private referenceElement?: HTMLElement;

  constructor(delegator: UpdateDelegator, referenceElement?: HTMLElement, descriptors: { [key: string]: number | true | ResponsiveDescriptor } = { [EventType.SCROLL]: true }) {
    super(delegator, descriptors);

    this.referenceElement = referenceElement;
  }

  destroy() {
    super.destroy();

    this.referenceElement = undefined;
  }

  onScroll(event: Event) {
    const { left: x, top: y, width: w, height: h } = Rect.from(event.currentTarget as HTMLElement | Window) || new Rect();
    const { width: maxWidth, height: maxHeight } = this.referenceElement ? (Rect.fromChildrenOf(this.referenceElement) || new Rect()) : { width: w, height: h};

    this.dirtyInfo[DirtyType.POSITION] = {
      ...this.dirtyInfo[DirtyType.POSITION] || {},
      x,
      minX: 0,
      maxX: maxWidth - w,
      stepX: x / (maxWidth - w),
      cx: x,
      minCX: 0,
      maxCX: maxHeight - w,
      stepCX: x / (maxHeight - w),
      y,
      minY: 0,
      maxY: maxHeight - h,
      stepY: y / (maxHeight - h),
      cy: y,
      minCY: 0,
      maxCY: maxWidth - h,
      stepCY: y / (maxWidth - h),
      maxWidth,
      maxHeight,
    };

    super.onScroll(event);
  }
}

export default ScrollDelegate;
