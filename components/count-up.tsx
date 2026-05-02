'use client';

import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  target: number;
  decimals?: number;
  duration?: number;
  delay?: number;
}

export function CountUp({ target, decimals = 1, duration = 1200, delay = 250 }: CountUpProps) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);
  const startRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    startRef.current = undefined;

    const animate = (ts: number) => {
      if (startRef.current === undefined) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(eased * target);
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };

    const timeoutId = setTimeout(() => {
      rafRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, delay]);

  return <>{value.toFixed(decimals)}</>;
}
