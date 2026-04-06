"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const INTERACTIVE_SELECTOR =
  "a,button,.fc,.step,.fi,.tc,.pc,.pyq-item,.prob-card,.pyq-filter,.fq";

const setCursorDefaultStyles = (cursor: HTMLDivElement, ring: HTMLDivElement) => {
  cursor.style.width = "8px";
  cursor.style.height = "8px";
  cursor.style.background = "var(--fire)";
  cursor.style.border = "none";
  ring.style.width = "34px";
  ring.style.height = "34px";
  ring.style.border = "1px solid rgba(232,82,10,.35)";
};

export function useLandingInteractions() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  const [isNavSticky, setIsNavSticky] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const onScroll = () => {
      setIsNavSticky(window.scrollY > 60);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    const cursor = cursorRef.current;
    const ring = ringRef.current;

    if (!cursor || !ring) {
      return;
    }

    if (window.matchMedia("(pointer: coarse)").matches) {
      cursor.style.display = "none";
      ring.style.display = "none";
      return;
    }

    let mx = 0;
    let my = 0;
    let rx = 0;
    let ry = 0;
    let frameId = 0;

    const onMouseMove = (event: MouseEvent) => {
      mx = event.clientX;
      my = event.clientY;
      cursor.style.left = `${mx}px`;
      cursor.style.top = `${my}px`;
    };

    const animateRing = () => {
      rx += (mx - rx) * 0.13;
      ry += (my - ry) * 0.13;
      ring.style.left = `${rx}px`;
      ring.style.top = `${ry}px`;
      frameId = window.requestAnimationFrame(animateRing);
    };

    const onHoverStart = () => {
      cursor.style.width = "16px";
      cursor.style.height = "16px";
      cursor.style.background = "transparent";
      cursor.style.border = "1.5px solid var(--fire)";
      ring.style.width = "50px";
      ring.style.height = "50px";
    };

    const onHoverEnd = () => {
      setCursorDefaultStyles(cursor, ring);
    };

    const interactiveNodes = Array.from(
      document.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTOR),
    );

    interactiveNodes.forEach((node) => {
      node.addEventListener("mouseenter", onHoverStart);
      node.addEventListener("mouseleave", onHoverEnd);
    });

    document.addEventListener("mousemove", onMouseMove);
    frameId = window.requestAnimationFrame(animateRing);

    return () => {
      window.cancelAnimationFrame(frameId);
      document.removeEventListener("mousemove", onMouseMove);

      interactiveNodes.forEach((node) => {
        node.removeEventListener("mouseenter", onHoverStart);
        node.removeEventListener("mouseleave", onHoverEnd);
      });
    };
  }, []);

  useEffect(() => {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, index) => {
          if (entry.isIntersecting) {
            window.setTimeout(() => {
              entry.target.classList.add("in");
            }, index * 70);
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );

    const revealNodes = document.querySelectorAll(".rv,.rvl,.rvr");
    revealNodes.forEach((node) => revealObserver.observe(node));

    return () => {
      revealObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const statsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.3 },
    );

    const statNodes = document.querySelectorAll(".hstat");
    statNodes.forEach((node) => statsObserver.observe(node));

    return () => {
      statsObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const animateCounter = (element: HTMLElement) => {
      const target = Number(element.dataset.t ?? 0);
      const duration = 1600;
      const start = performance.now();

      const step = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = Math.floor(eased * target).toString();

        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else {
          element.textContent = target.toString();
        }
      };

      window.requestAnimationFrame(step);
    };

    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target
              .querySelectorAll<HTMLElement>(".counter")
              .forEach(animateCounter);
            counterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 },
    );

    const hero = document.querySelector("#hero");
    if (hero) {
      counterObserver.observe(hero);
    }

    return () => {
      counterObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const barObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target
              .querySelectorAll<HTMLElement>(".diag-bar-fill")
              .forEach((bar) => {
                const targetWidth =
                  bar.style.getPropertyValue("--w") || bar.style.width;
                if (targetWidth) {
                  bar.style.width = targetWidth;
                }
              });

            entry.target
              .querySelectorAll<HTMLElement>(".road-week-bar")
              .forEach((bar) => {
                const targetWidth = bar.style.width;
                bar.style.transition = "width 0.8s ease";
                bar.style.width = targetWidth;
              });

            barObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 },
    );

    const barNodes = document.querySelectorAll(".diag-visual,.road-visual");
    barNodes.forEach((node) => barObserver.observe(node));

    return () => {
      barObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      document.querySelectorAll<HTMLElement>(".diag-bar-fill").forEach((bar) => {
        const width = bar.classList.contains("weak")
          ? "28%"
          : bar.classList.contains("mid")
            ? "61%"
            : "85%";

        bar.style.width = width;
      });
    }, 1200);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  return {
    cursorRef,
    ringRef,
    isNavSticky,
    isMobileMenuOpen,
    toggleMobileMenu,
    closeMobileMenu,
  };
}
