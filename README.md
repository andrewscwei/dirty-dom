# Dirty DOM [![npm](https://img.shields.io/npm/v/dirty-dom.svg)](https://www.npmjs.com/package/dirty-dom) [![CI](https://github.com/andrewscwei/dirty-dom/workflows/CI/badge.svg)](https://github.com/andrewscwei/dirty-dom/actions?query=workflow%3ACI) [![CD](https://github.com/andrewscwei/dirty-dom/workflows/CD/badge.svg)](https://github.com/andrewscwei/dirty-dom/actions?query=workflow%3ACD)

Micro library for handling dirty DOM updates frame-by-frame.

## Usage

```js
import { DirtyType, EventType, UpdateDelegate } from 'dirty-dom';

class Foo {
  get bar() {
    return this._bar;
  }

  set bar(newValue) {
    this._bar = newValue;

    // Marks `LAYOUT` as dirty, which will trigger `update` in the next frame.
    this.updateDelegate.setDirty(DirtyType.LAYOUT);
  }

  constructor {
    // Instantiate the update delegate, enable default handlers if needed.
    updateDelegate = new UpdateDelegate(this, {
      // Invokes `update` on every frame.
      [EventType.ENTER_FRAME]: true,

      // Invokes `update` whenever the window resizes, debounced by 10ms.
      [EventType.RESIZE]: 10,

      // Invokes `update` whenever the device orientation changes (supported
      // devices only), debounced by 0ms (as in no debouncing at all).
      [EventType.ORIENTATION_CHANGE]: 0,

      // Invokes `update` whenever the scroll position of the element with ID
      // 'foo' changes, debounced by 10ms.
      [EventType.SCROLL]: {
        target: document.getElementById('foo'),
        refreshRate: 10,
      },

      // Invokes `update` whenever the mouse wheel event is triggered.
      [EventType.MOUSE_WHEEL]: true,

      // Invokes `update` whenever the mouse moves.
      [EventType.MOUSE_MOVE]: true,

      // Invokes `update` whenever the key up event is triggered.
      [EventType.KEY_UP]: true,

      // Invokes `update` whenever the key down event is triggered.
      [EventType.KEY_DOWN]: true,

      // Invokes `update` whenever the key press event is triggered.
      [EventType.KEY_PRESS]: true,
    });

    updateDelegate.init();
  }

  deinit() {
    // Clean up the update delegate if needed.
    this.updateDelegate.deinit();
  }

  /**
   * This function is managed by the browser's `requestAnimationFrame()` method
   * and is only invoked if something is marked as dirty. The `info` param
   * tells you what is dirty in the current animation frame.
   */
  update(info) {
    if (info[DirtyType.POSITION]) {
      // Triggered if manually marked as dirty or whenever the window or an
      // element scrolls, if enabled on init.

      console.log(info[DirtyType.POSITION]);

      // Prints:
      // {
      //   minPos: _,
      //   maxPos: _,
      //   pos: _,
      //   step: _,
      // }
    }

    if (info[DirtyType.SIZE]) {
      // Triggered if manually marked as dirty or whenever the window resizes,
      // if enabled on init.

      console.log(info[DirtyType.SIZE]);

      // Prints:
      // {
      //   minSize: _,
      //   maxSize: _,
      // }
    }

    if (info[DirtyType.LAYOUT]) {
      // Triggered if manually marked as dirty.
    }

    if (info[DirtyType.STATE]) {
      // Triggered if manually marked as dirty.
    }

    if (info[DirtyType.DATA]) {
      // Triggered if manually marked as dirty.
    }

    if (info[DirtyType.LOCALE]) {
      // Triggered if manually marked as dirty.
    }

    if (info[DirtyType.CONFIG]) {
      // Triggered if manually marked as dirty.
    }

    if (info[DirtyType.STYLE]) {
      // Triggered if manually marked as dirty.
    }

    if (info[DirtyType.INPUT]) {
      // Triggered if manually marked as dirty (not recommended) or whenever a
      // key event or mouse event is detected, if enabled on init.

      console.log(info[DirtyType.INPUT]);

      // Prints:
      // {
      //   keyUp: [...keyCodes],
      //   keyDown: [...keyCodes],
      //   keyPress: [...keyCodes],
      //   mouse: _,
      //   mouseWheel: _,
      // }
    }

    if (info[DirtyType.ORIENTATION]) {
      // Triggered if manually marked as dirty (not recommended) or whenever the
      // device  orientation changes, if enabled on init.

      console.log(info[DirtyType.ORIENTATION]);
      // Prints:
      // {
      //   x: _,
      //   y: _,
      //   z: _,
      // }
    }

    if (info[DirtyType.FRAME]) {
      // Triggered if manually marked as dirty (not recommended) or on every
      // frame, if enabled on init.
    }
}
```

## Release Notes

### `v4.0.0`

- **WARNING** The NPM package has been renamed to `dirty-dom`.

### `v3.0.0`

- **BREAKING**: Dirty info API for `DirtyType.INPUT` changed. Instead of `mouseX`, `mouseY`, `mouseWheelX` and `mouseWheelY`, it's now just `mouse` and `mousewheel` where each is an instance of `Point`.

### `v2.0.0`

- `UpdateDelegate` no longer starts automatically, you must manually invoke `init()`
- Added `ScrollDelegate` and `CrossScrollDelegate`
- Added dirty info for `DirtyType.POSITION` and `DirtyType.SIZE`
