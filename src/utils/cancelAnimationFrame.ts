/**
 * Cancels an animation frame, a custom implementation of the native
 * `cancelAnimationFrame` function. If the browser has no native
 * `cancelAnimationFrame` function defined, this function will simulate its
 * behavior using a timeout.
 *
 * @param requestId - The request ID as a result of `requestAnimationFrame` or
 *                    `setTimeout` (native `requestAnimationFrame` is
 *                    unavailable) of which the animation frame request is to be
 *                    cancelled.
 */
export default function cancelAnimationFrame(requestId: number) {
  const win = window as any

  let caf = win.cancelAnimationFrame || win.webkitCancelAnimationFrame || win.mozCancelAnimationFrame || win.oCancelAnimationFrame || win.msCancelAnimationFrame || null

  if (!caf) {
    caf = (handler: number) => {
      window.clearTimeout(handler)
    }
  }

  return caf(requestId)
}
