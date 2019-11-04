import { Point, Rect } from 'spase';
import DirtyType from '../enums/DirtyType';
import EventType from '../enums/EventType';
import { DirtyInfo, ResponsiveDescriptor, typeIsWindow, UpdateDelegator } from '../types';
import UpdateDelegate from './UpdateDelegate';

class ScrollDelegate extends UpdateDelegate {
  protected static DEFAULT_DIRTY_INFO: DirtyInfo = {
    ...UpdateDelegate.DEFAULT_DIRTY_INFO,
    [DirtyType.SIZE]: {
      ...UpdateDelegate.DEFAULT_DIRTY_INFO[DirtyType.SIZE],
      targetMinSize: null,
      targetMaxSize: null,
    },
    [DirtyType.POSITION]: {
      ...UpdateDelegate.DEFAULT_DIRTY_INFO[DirtyType.POSITION],
      targetPos: null,
      targetMinPos: null,
      targetMaxPos: null,
    },
  };

  private scrollTarget?: HTMLElement;

  constructor(delegator: UpdateDelegator, scrollTarget?: HTMLElement, descriptors: { [key: string]: number | true | ResponsiveDescriptor } = { [EventType.SCROLL]: true, [EventType.RESIZE]: true }) {
    super(delegator, descriptors);
    this.scrollTarget = scrollTarget;
  }

  deinit() {
    super.deinit();

    this.scrollTarget = undefined;
  }

  updateSizeInfo() {
    try {
      const targetRectMin = Rect.from(this.scrollTarget);
      const targetRectMax = Rect.from(this.scrollTarget, { overflow: true });

      if (targetRectMin && targetRectMax) {
        this.dirtyInfo[DirtyType.SIZE] = {
          ...this.dirtyInfo[DirtyType.SIZE] || {},
          targetMinSize: targetRectMin.size,
          targetMaxSize: targetRectMax!.size,
        };
      }
    }
    catch (err) {

    }

    super.updateSizeInfo();
  }

  updatePositionInfo(reference?: HTMLElement | Window) {
    try {
      const refEl = reference || window;
      const refRect = (typeIsWindow(refEl) ? Rect.fromViewport() : Rect.from(refEl)!.clone({ x: refEl.scrollLeft, y: refEl.scrollTop }));
      const refRectMin = refRect.clone({ x: 0, y: 0 });
      const refRectFull = Rect.from(refEl, { overflow: true });
      const refRectMax = refRectMin.clone({ x: refRectFull!.width - refRect.width, y: refRectFull!.height - refRect.height });
      const step = new Point([refRect.left / refRectMax.left, refRect.top / refRectMax.top]);
      const targetRectFull = Rect.from(this.scrollTarget, { reference: this.scrollTarget, overflow: true });
      const targetRectMin = Rect.from(this.scrollTarget, { reference: this.scrollTarget, overflow: false })!.clone({ x: 0, y: 0});
      const targetRectMax = targetRectFull!.clone({ x: targetRectFull!.width - targetRectMin.width, y: targetRectFull!.height - targetRectMin.height });

      this.dirtyInfo[DirtyType.POSITION] = {
        ...this.dirtyInfo[DirtyType.POSITION] || {},
        minPos: new Point([refRectMin.left, refRectMin.top]),
        maxPos: new Point([refRectMax.left, refRectMax.top]),
        pos: new Point([refRect.left, refRect.top]),
        minTargetPos: new Point([targetRectMin.left, targetRectMin.top]),
        maxTargetPos: new Point([targetRectMax.left, targetRectMax.top]),
        targetPos: new Point([step.x * targetRectMax.left, step.y * targetRectMax.top]),
        step,
      };
    }
    catch (err) {
      super.updatePositionInfo(reference);
    }
  }
}

export default ScrollDelegate;
