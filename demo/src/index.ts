/**
 * @file This is a very dumb demo. It needs to be revised, but for now, it's
 *       just a quick way during development to test the API.
 */

import { Rect } from 'spase';
import { CrossScrollDelegate, DirtyInfo, DirtyType, EventType, ScrollDelegate } from '../../build';

window.localStorage.debug = 'position,size,input';

const mainNode = document.getElementById('main');
const scrollerNode = document.getElementById('scroller');

const scrollDelegate = new ScrollDelegate({
  update(info: DirtyInfo) {
    const { [DirtyType.POSITION]: position, [DirtyType.SIZE]: size, [DirtyType.INPUT]: input } = info;

    if (size) {
      // debug('size')(size);
      scrollerNode!.style.height = size.targetAggregatedMaxSize.height;
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

const crossScrollDelegate = new CrossScrollDelegate({
  update(info: DirtyInfo) {
    const { [DirtyType.POSITION]: position, [DirtyType.SIZE]: size, [DirtyType.INPUT]: input } = info;
    if (size) {
      // debug('size')(size);
      scrollerNode!.style.height = size.targetAggregatedMaxSize.width;
    }

    if (position) {
      // debug('position')(position);
      mainNode!.style.transform = `translate3d(-${position.targetPos.x}px, 0, 0)`;
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

scrollDelegate.scrollBreaks = info => {
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

crossScrollDelegate.scrollBreaks = info => {
  const { width: w, height: h } = Rect.from(mainNode)!;

  return {
    x: [{
      step: (Rect.fromChildAt(1, mainNode)!.right - w) / info.maxPos.y,
      length: 1000,
    }, {
      step: (Rect.fromChildAt(6, mainNode)!.right - w + 1000) / info.maxPos.y,
      length: 2000,
    }],
  };
};

// scrollDelegate.init();
crossScrollDelegate.init();
