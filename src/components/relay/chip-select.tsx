"use client";

import { Select as SelectPrimitive } from "radix-ui";
import { forwardRef, useRef, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Trigger dropdown bergaya chip (filter, tipe field).
 * Tidak memakai SelectTrigger shadcn: gaya fokusnya (border + cincin 3px) bertumpuk dengan gaya chip terpilih.
 * Fokus memakai outline milik utility `chip` saja.
 */
export const ChipSelectTrigger = forwardRef<HTMLButtonElement, ComponentProps<typeof SelectPrimitive.Trigger>>(function ChipSelectTrigger({ className, ...props }, ref) {
  return <SelectPrimitive.Trigger ref={ref} className={cn("chip outline-none", className)} {...props} />;
});

/**
 * Radix mengembalikan fokus ke trigger saat dropdown ditutup. Setelah dipilih dengan mouse/jari,
 * browser lalu menampilkan cincin fokus seolah pakai keyboard. Hook ini: kalau dibuka dengan pointer,
 * fokus tetap kembali ke trigger (urutan Tab tidak hilang) tapi tanpa cincin; dengan keyboard, cincin tetap tampil.
 */
export function useQuietFocusReturn() {
  const byPointer = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return {
    triggerProps: {
      ref: trigger,
      onPointerDown: () => {
        byPointer.current = true;
      },
      onKeyDown: () => {
        byPointer.current = false;
      },
    },
    onCloseAutoFocus: (e: Event) => {
      if (!byPointer.current) return;
      e.preventDefault();
      trigger.current?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
    },
  };
}
