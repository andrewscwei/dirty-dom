/**
 * Returns a function that, as long as it continues to be invoked, will not be
 * triggered. The function will be called after it stops being called for N
 * milliseconds. If 'leading' is passed, the function will be triggered on the
 * leading edge instead of the trailing.
 *
 * @param method - Method to be debounced.
 * @param delay - Debounce rate in milliseconds.
 * @param leading - Indicates whether the method is triggered on the leading
 *                  edge instead of the trailing.
 *
 * @return The debounced method.
 */
export default function debounce(method: (...args: any[]) => void, delay: number = 0, leading: boolean = false): () => void {
  let timeout: number | undefined;

  return function debounced() {
    const args = arguments;

    const later = () => {
      timeout = undefined;
      if (!leading) method.apply(undefined, args as any);
    };

    const shouldCallNow = leading && !timeout;
    window.clearTimeout(timeout);
    timeout = window.setTimeout(later, delay);

    if (shouldCallNow) method.apply(context, args as any);
  };
}
