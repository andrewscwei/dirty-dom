/**
 * @file This is a very dumb demo. It needs to be revised, but for now, it's
 *       just a quick way during development to test the API.
 */

import { debug } from 'debug';
import { DirtyInfo, DirtyType, EventType, ScrollDelegate } from '../../build';

new ScrollDelegate({
  update(info: DirtyInfo) {
    const { [DirtyType.POSITION]: position, [DirtyType.INPUT]: input } = info;

    if (position) {
      debug('position')(position);
    }

    if (input) {
      debug('input')(input);
    }
  },
}, document.getElementById('a')!, {
  [EventType.SCROLL]: true,
  [EventType.MOUSE_MOVE]: true,
});
