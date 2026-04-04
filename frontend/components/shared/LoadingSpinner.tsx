import { Loader2 } from "lucide-react";

type LoadingSpinnerProps = {
  message?: string;
};

export default function LoadingSpinner({
  message = "Loading...",
}: LoadingSpinnerProps) {
  return (
    <div className="flex min-h-80 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-400" aria-hidden />
      <p className="text-sm text-slate-300">{message}</p>
    </div>
  );
}
