import { Point } from 'spase';
import DirtyType from '../enums/DirtyType';
import ScrollDelegate from './ScrollDelegate';

export default class CrossScrollDelegate extends ScrollDelegate {
  /** @inheritdoc */
  protected updatePositionInfo(reference?: HTMLElement | Window) {
    super.updatePositionInfo(reference);

    const info = this.dirtyInfo[DirtyType.POSITION] || {};
    const step = info.step as Point;

    if (!step) return;

    this.dirtyInfo[DirtyType.POSITION] = {
      ...info,
      targetPos: this.stepToNaturalPosition(step.invert()),
      targetStep: step.invert(),
    };
  }
}
