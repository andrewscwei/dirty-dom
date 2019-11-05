import { Point, Size } from 'spase';
import ScrollDelegate from './ScrollDelegate';

export default class CrossScrollDelegate extends ScrollDelegate {
  /** @inheritdoc */
  protected stepToNaturalPosition(step: Point) {
    return super.stepToNaturalPosition(step.invert());
  }

  /** @inheritdoc */
  protected updateScrollContainerSize(size: Size) {
    super.updateScrollContainerSize(size.invert());
  }
}
