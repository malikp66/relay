"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

/** Kontainer notifikasi: kanan atas, tanpa gaya bawaan (kartu digambar oleh `notify`). */
const Toaster = (props: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      position="top-right"
      expand
      visibleToasts={3}
      gap={10}
      offset={{ top: 72, right: 20 }}
      mobileOffset={{ top: "calc(env(safe-area-inset-top) + 64px)", left: 12, right: 12 }}
      swipeDirections={["right", "top"]}
      toastOptions={{ unstyled: true, classNames: { toast: "w-full sm:w-[360px]" } }}
      {...props}
    />
  )
}

export { Toaster }
