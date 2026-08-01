import { useEffect, useRef, useState } from 'react';
import frame1 from '../assets/animated/hello/1.png';
import frame2 from '../assets/animated/hello/2.png';
import frame3 from '../assets/animated/hello/3.png';
import frame4 from '../assets/animated/hello/4.png';
import frame5 from '../assets/animated/hello/5.png';
import frame6 from '../assets/animated/hello/6.png';

const FRAMES = [frame1, frame2, frame3, frame4, frame5, frame6];
const FRAME_MS = 180; // ~5.5 fps

export function AlaniaHello({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const raf = useRef(0);
  const last = useRef(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    function tick(now: number) {
      if (now - last.current >= FRAME_MS) {
        last.current = now;
        setIndex(i => (i + 1) % FRAMES.length);
      }
      raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  return (
    <img
      src={FRAMES[index]}
      alt="AlanIA saludando"
      className={className}
      draggable={false}
    />
  );
}
