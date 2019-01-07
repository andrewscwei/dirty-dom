/**
 * Custom requestAnimationFrame implementation.
 *
 * @param callback
 */
export default function requestAnimationFrame(callback: () => void): number {
  const win = window as any;
  let raf = (win.requestAnimationFrame || win.webkitRequestAnimationFrame || win.mozRequestAnimationFrame || win.oRequestAnimationFrame || win.msRequestAnimationFrame) || null;
  if (!raf) raf = (handler: () => void): number => (win.setTimeout(handler, 10.0));
  return raf(callback);
}
