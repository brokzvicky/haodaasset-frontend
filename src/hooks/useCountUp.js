import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from 0 (or its previous value) up to `target`.
 * Re-triggers whenever `target` changes (e.g. fresh API data).
 */
export default function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const end = Number(target) || 0;
    const start = fromRef.current;
    if (start === end) { setValue(end); return; }

    let raf;
    let startTime = null;

    const tick = (ts) => {
      if (startTime === null) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      const current = Math.round(start + (end - start) * eased);
      setValue(current);
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = end;
      }
    };

    raf = requestAnimationFrame(tick);
    return () => raf && cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}
