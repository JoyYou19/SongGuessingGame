"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function LoadingPulse() {
  const barsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        barsRef.current,
        { scaleY: 0.3, opacity: 0.4 },
        {
          scaleY: 1,
          opacity: 1,
          duration: 0.8,
          ease: "sine.inOut",
          stagger: {
            each: 0.12,
            repeat: -1,
            yoyo: true,
          },
        },
      );
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="flex items-end gap-2 h-12">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            if (el) barsRef.current[i] = el;
          }}
          className="w-2 rounded-full bg-[#1DB954]/90 shadow-[0_0_20px_rgba(29,185,84,0.4)]"
          style={{ height: `${16 + i * 6}px` }}
        />
      ))}
    </div>
  );
}
