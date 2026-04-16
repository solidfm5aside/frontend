import { useEffect } from 'react';

/**
 * Sets up an IntersectionObserver that adds 'is-visible' to any
 * element with the 'reveal-on-scroll' class when it enters the viewport.
 *
 * @param deps - dependency array. Pass state that changes when new
 *               reveal-on-scroll elements are mounted (e.g. [matches, dayPage]).
 */
export function useRevealOnScroll(deps: unknown[] = []) {
  useEffect(() => {
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('is-visible');
      });
    }, observerOptions);

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
