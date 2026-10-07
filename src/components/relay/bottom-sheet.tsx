"use client";

/**
 * Bottom sheet mobile. Animasi geser ditangani Vaul (kurva drawer iOS) —
 * sengaja TIDAK ditumpuk animasi lain supaya tidak terasa patah.
 * Diadaptasi dari KokonutUI Smooth Drawer (MIT) — https://kokonutui.com
 */
import type { ReactNode } from "react";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { CloseButton } from "./icon-button";

type Props = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
};

export function BottomSheet({ open, onOpenChange, trigger, title, description, children }: Props) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {trigger ? <DrawerTrigger asChild>{trigger}</DrawerTrigger> : null}
      <DrawerContent className="mx-auto max-w-lg rounded-t-[28px] border-x border-t shadow-[var(--shadow-pop)]">
        <div className="max-h-[78vh] overflow-y-auto overscroll-contain [scrollbar-width:none] px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <div className="sticky top-0 z-10 -mx-5 flex items-start gap-3 bg-background/95 px-5 pb-3 pt-3 backdrop-blur">
            <div className="min-w-0 flex-1">
              <DrawerTitle className="text-[17px] font-semibold tracking-tight">{title}</DrawerTitle>
              {description ? <DrawerDescription className="mt-0.5 text-sm leading-snug">{description}</DrawerDescription> : null}
            </div>
            <DrawerClose asChild>
              <CloseButton variant="subtle" className="-mr-1" />
            </DrawerClose>
          </div>
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
