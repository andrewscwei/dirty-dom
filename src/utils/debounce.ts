/**
 * Returns a function that, as long as it continues to be invoked within the
 * allotted `delay`, its wrapped function will not be triggered. The wrapped
 * function will be invoked after the returned function stops being called for
 * some milliseconds as defined by `delay`. If 'leading' is enabled, the wrapped
 * function will be invoked on the leading edge instead of the trailing, meaning
 * that it will first be triggered, then subsequent invocations will not occur
 * until the `delay` has passed.
 *
 * @param fn Function to be debounced.
 * @param delay Debounce rate in milliseconds.
 * @param leading Indicates whether the function is triggered on the leading
 *                edge instead of the trailing edge.
 *
 * @returns The debounced wrapper function.
 */
export function debounce(fn: (...args: any[]) => void, delay = 0, leading = false): () => void {
  let timeout: number | undefined

  return (...args: any[]) => {
    const later = () => {
      timeout = undefined
      if (!leading) fn(...args)
    }

    const shouldCallNow = leading && !timeout
    window.clearTimeout(timeout)
    timeout = window.setTimeout(later, delay)

    if (shouldCallNow) fn(...args)
  }
}
