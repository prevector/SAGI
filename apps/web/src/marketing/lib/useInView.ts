import { useEffect, useState, type RefObject } from "react";

interface UseInViewOptions {
  /** Stop observing after the first time the element enters the viewport. */
  once?: boolean;
  /** Visible fraction (0–1) required to count as "in view". 0 = any pixel. */
  amount?: number;
}

/**
 * Minimal IntersectionObserver hook — a dependency-free stand-in for
 * framer-motion's `useInView`, used to drive/pause the landing visuals.
 */
export function useInView<T extends Element>(
  ref: RefObject<T | null>,
  { once = false, amount = 0 }: UseInViewOptions = {}
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      // No observer support → assume visible so content/animation still runs.
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold: amount }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, once, amount]);

  return inView;
}
