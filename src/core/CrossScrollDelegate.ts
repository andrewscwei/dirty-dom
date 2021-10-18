import { Point, Size } from 'spase'
import ScrollDelegate from './ScrollDelegate'

export default class CrossScrollDelegate extends ScrollDelegate {
  /** @inheritdoc */
  protected stepToVirtualPosition(step: Point) {
    return super.stepToVirtualPosition(step.invert())
  }

  /** @inheritdoc */
  protected updateScrollContainerSize(size: Size) {
    super.updateScrollContainerSize(size.invert())
  }
}
