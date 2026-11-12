"use client";

import { useEffect } from "react";
import { soundForClick } from "@/lib/sfx";

/** One listener gives every button and link its sound; data-sfx picks a special one. */
export function SfxAgent() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => soundForClick(e.target);
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
