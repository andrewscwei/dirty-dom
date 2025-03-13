import debug from 'debug'
import { DirtyType, StickyCrossScrollDelegate, StickyScrollDelegate, type DirtyInfo } from 'dirty-dom'
import { Rect } from 'spase'

window.localStorage.debug = 'position,size,input'

const versionNode = document.getElementById('version')

versionNode!.innerHTML = `v${import.meta.env.VERSION}`

const mainNode = document.getElementById('main')

const stickyScrollDelegate = new StickyScrollDelegate(({ [DirtyType.POSITION]: dirtyPosition, [DirtyType.SIZE]: dirtySize, [DirtyType.INPUT]: dirtyInput }: DirtyInfo) => {
  if (dirtySize) {
    // Debug('size')(dirtySize);
  }

  if (dirtyPosition) {
    // Debug('position')(dirtyPosition);
  }
})

stickyScrollDelegate.scrollTarget = () => document.getElementById('main')
stickyScrollDelegate.scrollContainer = () => document.getElementById('scroller')
stickyScrollDelegate.scrollBreaks = info => {
  const { height: h } = Rect.from(mainNode)!

  return {
    y: [{
      step: (Rect.fromChildAt(1, mainNode)!.bottom - h) / info.maxPos.y,
      length: 1000,
    }, {
      step: (Rect.fromChildAt(6, mainNode)!.bottom - h) / info.maxPos.y,
      length: 2000,
    }],
  }
}

const stickyCrossScrollDelegate = new StickyCrossScrollDelegate(({ [DirtyType.POSITION]: dirtyPosition, [DirtyType.SIZE]: dirtySize, [DirtyType.INPUT]: dirtyInput }: DirtyInfo) => {
  if (dirtySize) {
    debug('size')(dirtySize)
  }

  if (dirtyPosition) {
    // Debug('position')((delegate as StickyScrollDelegate).getRelativeStepOfHorizontalScrollBreakAt(0, dirtyPosition.step));
    // Debug('position')(dirtyPosition);
  }
})

stickyCrossScrollDelegate.scrollTarget = () => document.getElementById('main')
stickyCrossScrollDelegate.scrollContainer = () => document.getElementById('scroller')
stickyCrossScrollDelegate.scrollBreaks = info => {
  const { width: w, height: h } = Rect.from(mainNode)!

  return {
    x: [{
      step: (Rect.fromChildAt(1, mainNode)!.right - w) / info.maxPos.x,
      length: 1000,
    }, {
      step: (Rect.fromChildAt(6, mainNode)!.right - w) / info.maxPos.x,
      length: 2000,
    }],
  }
}

// StickyScrollDelegate.init();
stickyCrossScrollDelegate.init()

window.addEventListener('click', () => {
  stickyCrossScrollDelegate.scrollToBottom()
})
