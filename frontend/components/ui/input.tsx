import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-full border border-white/10 bg-white/3 px-4 py-2 font-mono text-sm tracking-[0.08em] text-[var(--cream)] transition-colors outline-none placeholder:text-[rgba(194,186,176,0.48)] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Input };
