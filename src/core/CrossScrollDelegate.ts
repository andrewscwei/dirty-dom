import { Point, Rect, Size } from 'spase';
import DirtyType from '../enums/DirtyType';
import ScrollDelegate from './ScrollDelegate';

export default class CrossScrollDelegate extends ScrollDelegate {
  /** @inheritdoc */
  protected updatePositionInfo(reference?: HTMLElement | Window) {
    super.updatePositionInfo(reference);

    const info = this.dirtyInfo[DirtyType.POSITION];

    try {
      const step = info!.step as Point;

      this.dirtyInfo[DirtyType.POSITION] = {
        ...info,
        targetPos: this.stepToNaturalPosition(step),
        targetStep: step.invert(),
      };
    }
    catch (err) {

    }
  }

  /** @inheritdoc */
  protected stepToVirtualPosition(step: Point | undefined): Point | undefined {
    if (!step || !this.scrollTarget) return undefined;

    const targetRectMin = Rect.from(this.scrollTarget, { reference: this.scrollTarget, overflow: false })!.clone({ x: 0, y: 0});
    const targetRectFull = Rect.from(this.scrollTarget, { reference: this.scrollTarget, overflow: true });
    const aggregatedScrollBreaks = new Size([this.aggregateHorizontalScrollBreaks(), this.aggregateVerticalScrollBreaks()]);

    if (!targetRectFull) return undefined;

    const targetRectFullWithScrollBreaks = Rect.fromPointAndSize(new Point([0, 0]), targetRectFull.size.add(aggregatedScrollBreaks));

    const position = new Point({
      x: step.y * (targetRectFullWithScrollBreaks.width - targetRectMin.width),
      y: step.x * (targetRectFullWithScrollBreaks.height - targetRectMin.height),
    });

    return position;
  }

  /** @inheritdoc */
  protected virtualPositionToStep(position: Point | undefined): Point | undefined {
    if (!position || !this.scrollTarget) return undefined;

    const targetRectMin = Rect.from(this.scrollTarget, { reference: this.scrollTarget, overflow: false })!.clone({ x: 0, y: 0});
    const targetRectFull = Rect.from(this.scrollTarget, { reference: this.scrollTarget, overflow: true });
    const aggregatedScrollBreaks = new Size([this.aggregateHorizontalScrollBreaks(), this.aggregateVerticalScrollBreaks()]);

    if (!targetRectFull) return undefined;

    const targetRectFullWithScrollBreaks = Rect.fromPointAndSize(new Point([0, 0]), targetRectFull.size.add(aggregatedScrollBreaks));

    return new Point({
      x: position.y / (targetRectFullWithScrollBreaks.height - targetRectMin.height),
      y: position.x / (targetRectFullWithScrollBreaks.width - targetRectMin.width),
    });
  }

  /** @inheritdoc */
  protected virtualPositionToNaturalPosition(position: Point | undefined): Point | undefined {
    if (!position || !this.scrollTarget) return undefined;

    const step = this.virtualPositionToStep(position);

    if (!step) return undefined;

    const horizontalScrollBreak = this.getHorizontalScrollBreakAt(step.y) || this.getNearestHorizontalScrollBreakBefore(step.y) || { step: 0, length: 0 };
    const verticalScrollBreak = this.getHorizontalScrollBreakAt(step.x) || this.getNearestVerticalScrollBreakBefore(step.x) || { step: 0, length: 0 };
    const scrollBreakStep = new Point({ x: horizontalScrollBreak.step, y: verticalScrollBreak.step });
    const scrollBreakPosition = this.stepToVirtualPosition(scrollBreakStep.invert()) || new Point();

    const assumedPosition = new Point({
      x: position.x - this.aggregateHorizontalScrollBreaksBefore(step.y),
      y: position.y - this.aggregateVerticalScrollBreaksBefore(step.x),
    });

    const normalizedPosition = new Point({
      x: position.x > (scrollBreakPosition.x + horizontalScrollBreak.length) ? assumedPosition.x : Math.min(assumedPosition.x + horizontalScrollBreak.length, scrollBreakPosition.x - this.aggregateHorizontalScrollBreaksBefore(horizontalScrollBreak.step)),
      y: position.y > (scrollBreakPosition.y + verticalScrollBreak.length) ? assumedPosition.y : Math.min(assumedPosition.y + verticalScrollBreak.length, scrollBreakPosition.y - this.aggregateVerticalScrollBreaksBefore(verticalScrollBreak.step)),
    });

    return normalizedPosition;
  }
}
