import { Point, Rect } from 'spase'
import { ScrollOptions, typeIsWindow } from '../types'
import cancelAnimationFrame from './cancelAnimationFrame'
import requestAnimationFrame from './requestAnimationFrame'

/**
 * A type describing an active scrolling operation.
 */
export interface ScrollInstance {

  /**
   * The target element that is actively scrolling.
   */
  target: Window | HTMLElement

  /**
   * The animation frame (from `requestAnimationFrame` or `setTimeout`) request ID.
   */
  animationFrameRequestId: number

  /**
   * Scrolling options.
   */
  options: ScrollOptions
}

let scrollDict: { target: Window | HTMLElement; animationFrameRequestId: number; options: ScrollOptions }[] = []

/**
 * Scrolls to the top bound inside the target element.
 *
 * @param target The target element.
 * @param options @see ScrollOptions
 */
export function scrollToTop(target: Window | HTMLElement = window, options?: ScrollOptions) {
  vscrollTo(0, target, options)
}

/**
 * Scrolls  to the bottom bound inside the target element.
 *
 * @param target The target element.
 * @param options @see ScrollOptions
 */
export function scrollToBottom(target: Window | HTMLElement = window, options?: ScrollOptions) {
  const frect = Rect.from(target, { overflow: true })
  const rect = typeIsWindow(target) ? Rect.fromViewport() : Rect.from(target)

  if (!frect || !rect) return

  const y = frect.height - rect.height

  vscrollTo(y, target, options)
}

/**
 * Scrolls to the left bound inside the target element.
 *
 * @param target The target element.
 * @param options @see ScrollOptions
 */
export function scrollToLeft(target: Window | HTMLElement = window, options?: ScrollOptions) {
  hscrollTo(0, target, options)
}

/**
 * Scrolls to the right bound inside the target element.
 *
 * @param target The target element.
 * @param options @see ScrollOptions
 */
export function scrollToRight(target: Window | HTMLElement = window, options?: ScrollOptions) {
  const frect = Rect.from(target, { overflow: true })
  const rect = typeIsWindow(target) ? Rect.fromViewport() : Rect.from(target)

  if (!frect || !rect) return

  const x = frect.width - rect.width

  hscrollTo(x, target, options)
}

/**
 * Horizontally scrolls to the specified `x` position inside the target element.
 *
 * @param x The `x` position to scroll to (relative to the target element's coordinate space).
 * @param target The target element.
 * @param options @see ScrollOptions
 */
export function hscrollTo(x: number, target: Window | HTMLElement = window, options?: ScrollOptions) {
  const pos = new Point([x, typeIsWindow(target) ? target.scrollY : target.scrollTop])
  scrollTo(pos, target, options)
}

/**
 * Vertically scrolls to the specified `y` position inside the target element..
 *
 * @param y The `y` position to scroll to (relative to the target element's coordinate space).
 * @param target The target element.
 * @param options @see ScrollOptions
 */
export function vscrollTo(y: number, target: Window | HTMLElement = window, options?: ScrollOptions) {
  const pos = new Point([typeIsWindow(target) ? target.scrollX : target.scrollLeft, y])
  scrollTo(pos, target, options)
}

/**
 * Scrolls to the specified `Point` inside the target element.
 *
 * @param position The target position.
 * @param target The target element.
 * @param param2 @see ScrollOptions
 */
export function scrollTo(position: Point, target: Window | HTMLElement = window, { easing = true, ...opts }: ScrollOptions = {}) {
  if (easing) {
    easeScrollTo(position, target, { easing, ...opts })
  }
  else {
    linearScrollTo(position, target, { easing, ...opts })
  }
}

/**
 * Cancels all active scrolling operations (that are managed by `dirty-dom` inside the target
 * element.
 *
 * @param target The target element.
 */
export function cancelScroll(target: Window | HTMLElement) {
  const n = scrollDict.length
  let index = -1
  let scrollInstance

  for (let i = 0; i < n; i++) {
    scrollInstance = scrollDict[i]

    if (scrollInstance.target === target) {
      index = i
      break
    }
  }

  if (scrollInstance) {
    scrollInstance.options.onCancel?.()
    cancelAnimationFrame(scrollInstance.animationFrameRequestId)
  }

  if (index > -1) {
    scrollDict.splice(index, 1)
  }
}

/**
 * Cancels all active scrolling operations (that are managed by `dirty-dom`).
 */
export function cancelAllScrolls() {
  const n = scrollDict.length

  for (let i = 0; i < n; i++) {
    const scrollInstance = scrollDict[i]
    scrollInstance.options.onCancel?.()
    cancelAnimationFrame(scrollInstance.animationFrameRequestId)
  }

  scrollDict = []
}

/**
 * Scrolls to the specified `Point` inside the target element linearly.
 *
 * @param position - The target position.
 * @param target - The target element.
 * @param options - @see ScrollOptions
 */
function linearScrollTo(position: Point, target: Window | HTMLElement = window, { duration = 400, easing = false, isOverwriteable = true, onProgress, onCancel, onComplete }: ScrollOptions = {}) {
  if (getScrollInstanceByTarget(target) && !isOverwriteable) return

  cancelScroll(target)

  const dx = ((typeIsWindow(target) ? target.scrollX : target.scrollLeft) - position.x)
  const dy = ((typeIsWindow(target) ? target.scrollY : target.scrollTop) - position.y)
  const t = performance.now()

  function step(timestamp: number) {
    if (!getScrollInstanceByTarget(target)) return

    const currentPos = typeIsWindow(target) ? new Point([target.scrollX, target.scrollY]) : new Point([target.scrollLeft, target.scrollTop])
    const elapsed = timestamp - t

    target.scrollTo(position.x + dx * (1 - (elapsed / duration)), position.y + dy * (1 - (elapsed / duration)))

    if ((elapsed > duration) || (currentPos.x === position.x && currentPos.y === position.y)) {
      target.scrollTo(position.x, position.y)
      onComplete?.()
      return
    }

    onProgress?.(elapsed / duration)

    setScrollInstance({ target, options: { duration, easing, onProgress, onCancel, onComplete }, animationFrameRequestId: requestAnimationFrame(step) })
  }

  setScrollInstance({ target, options: { duration, easing, onProgress, onCancel, onComplete }, animationFrameRequestId: requestAnimationFrame(step) })
}

/**
 * Scrolls to the specified `Point` inside the target element with easing.
 *
 * @param position - The target position.
 * @param target - The target element.
 * @param options - @see ScrollOptions
 */
function easeScrollTo(position: Point, target: Window | HTMLElement = window, { duration = 400, easing = true, isOverwriteable = true, onProgress, onCancel, onComplete }: ScrollOptions = {}) {
  if (getScrollInstanceByTarget(target) && !isOverwriteable) return

  cancelScroll(target)

  const startPos = new Point([typeIsWindow(target) ? target.scrollX : target.scrollLeft, typeIsWindow(target) ? target.scrollY : target.scrollTop])
  const startTime = performance.now()

  let c = 0
  let t = startTime

  function step(timestamp: number) {
    if (!getScrollInstanceByTarget(target)) return

    const currentPos = typeIsWindow(target) ? new Point([target.scrollX, target.scrollY]) : new Point([target.scrollLeft, target.scrollTop])
    const elapsed = timestamp - startTime

    c += Math.PI / (duration / (timestamp - t))

    const dx = startPos.x - position.x
    const dy = startPos.y - position.y
    const d2x = dx * 0.5
    const d2y = dy * 0.5

    target.scrollTo(Math.round(startPos.x - (d2x - d2x * Math.cos(c))), Math.round(startPos.y - (d2y - d2y * Math.cos(c))))

    if ((c >= Math.PI) || (elapsed > duration) || (currentPos.x === position.x && currentPos.y === position.y)) {
      target.scrollTo(position.x, position.y)
      onComplete?.()
      return
    }

    t = timestamp

    onProgress?.(elapsed / duration)

    setScrollInstance({ target, options: { duration, easing, onProgress, onCancel, onComplete }, animationFrameRequestId: requestAnimationFrame(step) })
  }

  setScrollInstance({ target, options: { duration, easing, onProgress, onCancel, onComplete }, animationFrameRequestId: requestAnimationFrame(step) })
}

/**
 * Retrieves the active scrolling operation (that is managed by `dirty-dom`), if any.
 *
 * @param target - The target element.
 *
 * @returns The active `ScrollInstance` if there is one.
 */
function getScrollInstanceByTarget(target: Window | HTMLElement): ScrollInstance | undefined {
  const n = scrollDict.length

  for (let i = 0; i < n; i++) {
    const v = scrollDict[i]

    if (v.target === target) {
      return v
    }
  }

  return undefined
}

/**
 * Registers an active scrolling operation for an element to be managed by `dirty-dom`.
 *
 * @param scrollInstance - @see ScrollInstance
 */
function setScrollInstance({ target, options, animationFrameRequestId }: ScrollInstance) {
  const scrollInstance = getScrollInstanceByTarget(target)

  if (scrollInstance) {
    cancelAnimationFrame(scrollInstance.animationFrameRequestId)
    scrollInstance.options = options
    scrollInstance.animationFrameRequestId = animationFrameRequestId
  }
  else {
    scrollDict.push({ target, options, animationFrameRequestId })
  }
}

