/**
 * ui/breakpoints.js — the same screen-size steps as the CSS (Section 23.1), for code that must
 * decide layouts (for example: filters in a side panel or in a bottom sheet).
 */

export const BP = { sm: 480, md: 768, lg: 1024, xl: 1440 };

/** True when the screen is at least this wide: atLeast('lg'). */
export function atLeast(name) {
  return window.matchMedia(`(min-width: ${BP[name]}px)`).matches;
}

/** Calls fn(matches) now and every time the screen crosses the breakpoint. Returns an "unsubscribe". */
export function watch(name, fn) {
  const mq = window.matchMedia(`(min-width: ${BP[name]}px)`);
  const handler = () => fn(mq.matches);
  if (mq.addEventListener) mq.addEventListener('change', handler); else mq.addListener(handler);
  handler();
  return () => (mq.removeEventListener ? mq.removeEventListener('change', handler) : mq.removeListener(handler));
}
