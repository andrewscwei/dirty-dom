import { Point, Size } from 'spase'
import StickyScrollDelegate from './StickyScrollDelegate'

export default class StickyCrossScrollDelegate extends StickyScrollDelegate {

  /** @inheritdoc */
  protected stepToVirtualPosition(step: Point) {
    return super.stepToVirtualPosition(step.invert())
  }

  /** @inheritdoc */
  protected updateScrollContainerSize(size: Size) {
    super.updateScrollContainerSize(size.invert())
  }
}
