"use client"

import { toast as sonnerToast } from "sonner"

type ToastVariant = "default" | "destructive"

type ToastPayload = {
  title?: string
  description?: string
  variant?: ToastVariant
}

function showToast(payload: ToastPayload) {
  const { title, description, variant = "default" } = payload
  return sonnerToast(title ?? "Notification", {
    description,
    className:
      variant === "destructive"
        ? "border-red-700 bg-red-600 text-white"
        : undefined,
  })
}

export const toast = showToast

export function useToast() {
  return {
    toast: showToast,
    dismiss: sonnerToast.dismiss,
  }
}
