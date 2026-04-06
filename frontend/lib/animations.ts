export const revealDirections = {
  up: "translate-y-8",
  left: "-translate-x-8",
  right: "translate-x-8",
} as const;

export const revealThreshold = 0.18;

export const revealTransitionClass =
  "transition-all duration-700 ease-[cubic-bezier(.16,1,.3,1)]";
