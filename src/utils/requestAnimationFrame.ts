/**
 * Requests for an animation frame, then invokes a callback, a custom
 * implementation of the native `requestAnimationFrame` function. If a native
 * `requestAnimationFrame` is unavailable, this function will simulate its
 * behavior using timeouts.
 *
 * @param callback Handler invoked upon the next animation frame.
 *
 * @returns The request ID as a result of `requestAnimationFrame` or
 *          `setTimeout` (when native `requestAnimationFrame` is unavailable).
 */
export function requestAnimationFrame(callback: (...t: any) => void): number {
  const win = window as any
  let raf = win.requestAnimationFrame || win.webkitRequestAnimationFrame || win.mozRequestAnimationFrame || win.oRequestAnimationFrame || win.msRequestAnimationFrame || null
  if (!raf) raf = (handler: () => void): number => win.setTimeout(handler, 10.0)

  return raf(callback)
}
