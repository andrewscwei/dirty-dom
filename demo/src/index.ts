/**
 * @file This is a very dumb demo. It needs to be revised, but for now, it's
 *       just a quick way during development to test the API.
 */

import { Rect } from 'spase';
import { DirtyInfo, DirtyType, EventType, ScrollDelegate } from '../../build';

window.localStorage.debug = 'position,size,input';

const mainNode = document.getElementById('main');
const numSections = mainNode!.children.length;
const scrollerNode = document.getElementById('scroller');

const delegate = new ScrollDelegate({
  update(info: DirtyInfo) {
    const { [DirtyType.POSITION]: position, [DirtyType.SIZE]: size, [DirtyType.INPUT]: input } = info;

    if (size) {
      // debug('size')(size);
      scrollerNode!.style.height = size.targetMaxSize.height + size.aggregatedScrollBreaks.height;
    }

    if (position) {
      // debug('position')(position);
      mainNode!.style.transform = `translate3d(0, -${position.targetPos.y}px, 0)`;
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

delegate.scrollBreaks = info => {
  const { height: h } = Rect.from(mainNode)!;

  return {
    y: [{
      step: (Rect.fromChildAt(1, mainNode)!.bottom - h) / info.maxPos.y,
      length: 1000,
    }, {
      step: (Rect.fromChildAt(6, mainNode)!.bottom - h + 1000) / info.maxPos.y,
      length: 2000,
    }],
  };
};

delegate.init();
