/**
 * @file This is a very dumb demo. It needs to be revised, but for now, it's
 *       just a quick way during development to test the API.
 */

import debug from 'debug';
import { DirtyInfo, DirtyType, EventType, ScrollDelegate } from '../../build';

window.localStorage.debug = 'position,size,input';

const delegate = new ScrollDelegate({
  update(info: DirtyInfo) {
    const { [DirtyType.POSITION]: position, [DirtyType.SIZE]: size, [DirtyType.INPUT]: input } = info;

    if (position) {
      debug('position')(position);
      const mainNode = document.getElementById('main');
      mainNode!.style.transform = `translate3d(0, -${position.targetPos.y}px, 0)`;
    }

    if (size) {
      const scrollerNode = document.getElementById('scroller');
      debug('size')(size);
      scrollerNode!.style.height = size.targetMaxSize.height;
    }

    if (input) {
      // debug('input')(input);
    }
  },
}, document.getElementById('main')!, {
  [EventType.SCROLL]: true,
  [EventType.RESIZE]: true,
  // [EventType.MOUSE_MOVE]: true,
});

delegate.init();
