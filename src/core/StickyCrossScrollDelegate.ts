import { type Point, type Size } from 'spase'
import { StickyScrollDelegate } from './StickyScrollDelegate'

/**
 * A special {@link StickyScrollDelegate} that displaces the adjecent axis
 * instead while scrolling, i.e. if scrolling vertically, the scroll target will
 * be displaced horizontally.
 */
export class StickyCrossScrollDelegate extends StickyScrollDelegate {
  /** @inheritdoc */
  protected stepToVirtualPosition(step: Point) {
    return super.stepToVirtualPosition(step.invert())
  }

  /** @inheritdoc */
  protected updateScrollContainerSize(size: Size) {
    super.updateScrollContainerSize(size.invert())
  }
}
