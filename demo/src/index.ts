/**
 * @file This is a very dumb demo. It needs to be revised, but for now, it's
 *       just a quick way during development to test the API.
 */

import { DirtyStatus, DirtyType, EventType, UpdateDelegate } from '../../build';

UpdateDelegate.from({
  update(status: DirtyStatus) {
    if (status[DirtyType.POSITION]) {
      console.log(pageYOffset);
    }
  }
}, {
  [EventType.SCROLL]: true,
});
