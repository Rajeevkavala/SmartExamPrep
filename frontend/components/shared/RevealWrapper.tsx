"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import {
  revealDirections,
  revealThreshold,
  revealTransitionClass,
} from "@/lib/animations";
import { cn } from "@/lib/utils";

type RevealDirection = keyof typeof revealDirections;

type RevealWrapperProps = {
  children: ReactNode;
  className?: string;
  direction?: RevealDirection;
  delayMs?: number;
};

export default function RevealWrapper({
  children,
  className,
  direction = "up",
  delayMs = 0,
}: RevealWrapperProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: revealThreshold }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        revealTransitionClass,
        isVisible ? "translate-x-0 translate-y-0 opacity-100" : "opacity-0",
        !isVisible ? revealDirections[direction] : "",
        className
      )}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}
