import type { ElementType, ReactNode } from "react";

type RevealVariant = "rv" | "rvl" | "rvr";

type RevealWrapperProps<T extends ElementType> = {
  as?: T;
  variant?: RevealVariant;
  className?: string;
  children: ReactNode;
};

export default function RevealWrapper<T extends ElementType = "div">({
  as,
  variant = "rv",
  className,
  children,
}: RevealWrapperProps<T>) {
  const Component = (as ?? "div") as ElementType;
  const resolvedClassName = className
    ? `${variant} ${className}`
    : variant;

  return <Component className={resolvedClassName}>{children}</Component>;
}
