import { Point, Rect } from 'spase'
import { ScrollOptions, typeIsWindow } from '../types'
import cancelAnimationFrame from './cancelAnimationFrame'
import requestAnimationFrame from './requestAnimationFrame'

export interface ScrollInstance {
  target: Window | HTMLElement
  animationFrame: number
  options: ScrollOptions
}

let scrollDict: { target: Window | HTMLElement; animationFrame: number; options: ScrollOptions }[] = []

export function scrollToTop(target: Window | HTMLElement = window, options?: ScrollOptions) {
  vscrollTo(0, target, options)
}

export function scrollToBottom(target: Window | HTMLElement = window, options?: ScrollOptions) {
  const frect = Rect.from(target, { overflow: true })
  const rect = typeIsWindow(target) ? Rect.fromViewport() : Rect.from(target)

  if (!frect || !rect) return

  const y = frect.height - rect.height

  vscrollTo(y, target, options)
}

export function scrollToLeft(target: Window | HTMLElement = window, options?: ScrollOptions) {
  hscrollTo(0, target, options)
}

export function scrollToRight(target: Window | HTMLElement = window, options?: ScrollOptions) {
  const frect = Rect.from(target, { overflow: true })
  const rect = typeIsWindow(target) ? Rect.fromViewport() : Rect.from(target)

  if (!frect || !rect) return

  const x = frect.width - rect.width

  hscrollTo(x, target, options)
}

export function hscrollTo(x: number, target: Window | HTMLElement = window, options?: ScrollOptions) {
  const pos = new Point([x, typeIsWindow(target) ? target.scrollY : target.scrollTop])
  scrollTo(pos, target, options)
}

export function vscrollTo(y: number, target: Window | HTMLElement = window, options?: ScrollOptions) {
  const pos = new Point([typeIsWindow(target) ? target.scrollX : target.scrollLeft, y])
  scrollTo(pos, target, options)
}

export function scrollTo(position: Point, target: Window | HTMLElement = window, { easing = true, ...opts }: ScrollOptions = {}) {
  if (easing) {
    easeScrollTo(position, target, { easing, ...opts })
  }
  else {
    linearScrollTo(position, target, { easing, ...opts })
  }
}

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
    cancelAnimationFrame(scrollInstance.animationFrame)
  }

  if (index > -1) {
    scrollDict.splice(index, 1)
  }
}

export function cancelAllScrolls() {
  const n = scrollDict.length

  for (let i = 0; i < n; i++) {
    const scrollInstance = scrollDict[i]
    scrollInstance.options.onCancel?.()
    cancelAnimationFrame(scrollInstance.animationFrame)
  }

  scrollDict = []
}


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

    setScrollInstance({ target, options: { duration, easing, onProgress, onCancel, onComplete }, animationFrame: requestAnimationFrame(step) })
  }

  setScrollInstance({ target, options: { duration, easing, onProgress, onCancel, onComplete }, animationFrame: requestAnimationFrame(step) })
}

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

    setScrollInstance({ target, options: { duration, easing, onProgress, onCancel, onComplete }, animationFrame: requestAnimationFrame(step) })
  }

  setScrollInstance({ target, options: { duration, easing, onProgress, onCancel, onComplete }, animationFrame: requestAnimationFrame(step) })
}

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

function setScrollInstance({ target, options, animationFrame }: ScrollInstance) {
  const scrollInstance = getScrollInstanceByTarget(target)

  if (scrollInstance) {
    cancelAnimationFrame(scrollInstance.animationFrame)
    scrollInstance.options = options
    scrollInstance.animationFrame = animationFrame
  }
  else {
    scrollDict.push({ target, options, animationFrame })
  }
}

