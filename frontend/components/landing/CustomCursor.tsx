"use client";

import type { RefObject } from "react";

type CustomCursorProps = {
  cursorRef: RefObject<HTMLDivElement>;
  ringRef: RefObject<HTMLDivElement>;
};

export default function CustomCursor({
  cursorRef,
  ringRef,
}: CustomCursorProps) {
  return (
    <>
      <div id="cur" ref={cursorRef} />
      <div id="cur-ring" ref={ringRef} />
    </>
  );
}
