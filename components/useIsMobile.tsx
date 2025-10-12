"use client";
import { useEffect, useState } from "react";

export function useIsMobile(breakpoint = 640) {
  // Tailwind 'sm' breakpoint
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);

  return isMobile;
}
