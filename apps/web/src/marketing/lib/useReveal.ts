import { useEffect, useRef, useState } from "react";

/**
 * useReveal — drives the `diffuse-in` scroll reveal (DESIGN.md §6). Returns a ref
 * to attach to the element and a boolean that flips true once it scrolls ~15% into
 * the viewport. Reduced motion / no-IO support resolve to visible immediately.
 *
 * Pair with the `.reveal` / `.revealIn` classes in marketing.module.css.
 */
export function useReveal<T extends Element>() {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, shown };
}
