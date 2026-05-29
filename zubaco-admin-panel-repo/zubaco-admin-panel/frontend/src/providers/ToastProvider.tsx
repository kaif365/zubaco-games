"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { X } from "lucide-react";

type ToastVariant = "default" | "success" | "destructive";
const UNAUTHORIZED_TOAST_EVENT = "app:unauthorized-toast";

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  toast: (opts: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function createToastId() {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();

  // Fallback for older browsers / restricted runtimes.
  if (c?.getRandomValues) {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    // UUID v4: set version and variant bits.
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex
      .slice(4, 6)
      .join("")}-${hex.slice(6, 8).join("")}-${hex
      .slice(8, 10)
      .join("")}-${hex.slice(10, 16).join("")}`;
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function ToastView({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  const variant = item.variant ?? "default";
  const variantClasses =
    variant === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
      : variant === "destructive"
        ? "border-red-200 bg-red-50 text-red-950"
        : "border-border bg-card text-foreground";

  return (
    <div
      className={`pointer-events-auto w-80 max-w-[calc(100vw-2rem)] rounded-md border shadow-md p-3 ${variantClasses}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <div className="text-sm font-semibold leading-5">{item.title}</div>
          {item.description ? (
            <div className="text-xs opacity-90 leading-4">
              {item.description}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="rounded-md p-1.5 opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 flex items-center justify-center shrink-0"
          onClick={onDismiss}
          aria-label="Dismiss toast"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const handle = timersRef.current.get(id);
    if (handle) window.clearTimeout(handle);
    timersRef.current.delete(id);
  }, []);

  const toast = useCallback(
    (opts: ToastOptions) => {
      const id = createToastId();
      const item: ToastItem = {
        id,
        variant: "default",
        durationMs: 3500,
        ...opts,
      };
      setToasts((prev) => [item, ...prev].slice(0, 3));

      const handle = window.setTimeout(
        () => dismiss(id),
        item.durationMs ?? 3500,
      );
      timersRef.current.set(id, handle);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  useEffect(() => {
    const onUnauthorized = (event: Event) => {
      const custom = event as CustomEvent<
        Partial<Pick<ToastOptions, "title" | "description" | "variant">>
      >;
      toast({
        title: custom.detail?.title ?? "Unauthorized",
        description:
          custom.detail?.description ?? "Please login again to continue.",
        variant: custom.detail?.variant ?? "destructive",
      });
    };

    window.addEventListener(UNAUTHORIZED_TOAST_EVENT, onUnauthorized);
    return () => {
      window.removeEventListener(UNAUTHORIZED_TOAST_EVENT, onUnauthorized);
    };
  }, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastView key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
