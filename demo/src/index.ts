/**
 * @file This is a very dumb demo. It needs to be revised, but for now, it's
 *       just a quick way during development to test the API.
 */

import debug from 'debug';
import { Rect } from 'spase';
import { CrossScrollDelegate, DirtyInfo, DirtyType, ScrollDelegate, UpdateDelegate, EventType } from '../../build';

window.localStorage.debug = 'position,size,input';

const mainNode = document.getElementById('main');

const scrollDelegate = new ScrollDelegate({
  update(info: DirtyInfo, delegate: UpdateDelegate) {
    const { [DirtyType.POSITION]: position, [DirtyType.SIZE]: size, [DirtyType.INPUT]: input } = info;

    if (size) {
      // debug('size')(size);
    }

    if (position) {
      // debug('position')(position);
    }
  },
});

scrollDelegate.scrollTarget = () => document.getElementById('main');
scrollDelegate.scrollContainer = () => document.getElementById('scroller');
// scrollDelegate.scrollBreaks = info => {
//   const { height: h } = Rect.from(mainNode)!;

//   return {
//     y: [{
//       step: (Rect.fromChildAt(1, mainNode)!.bottom - h) / info.maxPos.y,
//       length: 1000,
//     }, {
//       step: (Rect.fromChildAt(6, mainNode)!.bottom - h) / info.maxPos.y,
//       length: 2000,
//     }],
//   };
// };

const crossScrollDelegate = new CrossScrollDelegate({
  update(info: DirtyInfo, delegate: UpdateDelegate) {
    const { [DirtyType.POSITION]: position, [DirtyType.SIZE]: size, [DirtyType.INPUT]: input } = info;

    if (size) {
      debug('size')(size);
    }

    if (position) {
      // console.log((delegate as ScrollDelegate).getRelativeStepOfHorizontalScrollBreakAt(0, position.step));
      // debug('position')(position);
    }
  },
});

crossScrollDelegate.scrollTarget = () => document.getElementById('main');
crossScrollDelegate.scrollContainer = () => document.getElementById('scroller');
crossScrollDelegate.scrollBreaks = info => {
  const { width: w, height: h } = Rect.from(mainNode)!;

  return {
    x: [{
      step: (Rect.fromChildAt(1, mainNode)!.right - w) / info.maxPos.x,
      length: 1000,
    }, {
      step: (Rect.fromChildAt(6, mainNode)!.right - w) / info.maxPos.x,
      length: 2000,
    }],
  };
};

// scrollDelegate.init();
crossScrollDelegate.init();

window.addEventListener('click', () => {
  crossScrollDelegate.scrollToBottom();
});
