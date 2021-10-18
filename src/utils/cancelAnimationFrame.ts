/**
 * Custom cancelAnimationFrame implementation.
 *
 * @return callbackOrId
 */
export default function cancelAnimationFrame(callbackOrId: (() => void) | number) {
  const win = window as any

  let caf = (win.cancelAnimationFrame || win.webkitCancelAnimationFrame || win.mozCancelAnimationFrame || win.oCancelAnimationFrame || win.msCancelAnimationFrame) || null

  if (!caf) {
    caf = (handler: number) => {
      window.clearTimeout(handler)
    }
  }

  return caf(callbackOrId)
}
