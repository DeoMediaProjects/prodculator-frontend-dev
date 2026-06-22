import { useEffect } from 'react';

/**
 * Locks background scrolling of the page while `locked` is true.
 *
 * MUI's modal components (Drawer, Menu, Dialog) lock scroll by setting
 * `overflow: hidden` on `<body>`. That works on desktop but is silently
 * ignored by touch scrolling on iOS Safari — so an open mobile drawer/menu
 * still lets the page scroll underneath. This hook uses the `position: fixed`
 * technique, which actually pins the body on mobile, and restores the previous
 * scroll position when unlocked.
 *
 * Pair it with `disableScrollLock` on the MUI component so the two locks don't
 * fight over the body's inline styles.
 */
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;

    const { body } = document;
    const scrollY = window.scrollY;

    // Remember whatever was set inline so we can put it back exactly.
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';

    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      // Re-pinning the body shifted the viewport to the top; restore it.
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}
