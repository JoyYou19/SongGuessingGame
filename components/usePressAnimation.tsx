"use client";

import { RefObject } from "react";
import gsap from "gsap";

export function usePressAnimation<T extends HTMLElement>(
  ref: RefObject<T | null>,
) {
  const pressIn = () => {
    if (!ref.current) return;

    gsap.killTweensOf(ref.current);

    gsap.to(ref.current, {
      scale: 0.94,
      y: 1, // subtle depth press
      duration: 0.12,
      ease: "power3.out",
      boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
    });

    // Apple-style highlight bloom
    gsap.fromTo(
      ref.current,
      { filter: "brightness(1)" },
      {
        filter: "brightness(1.08)",
        duration: 0.08,
        yoyo: true,
        repeat: 1,
        ease: "power1.out",
      },
    );
  };

  const pressOut = () => {
    if (!ref.current) return;

    gsap.killTweensOf(ref.current);

    gsap.to(ref.current, {
      scale: 1,
      y: 0,
      duration: 0.25,
      ease: "elastic.out(1, 0.6)", // 👈 Apple-like spring
      boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
    });
  };

  return {
    onPointerDown: pressIn,
    onPointerUp: pressOut,
    onPointerLeave: pressOut,
  };
}
