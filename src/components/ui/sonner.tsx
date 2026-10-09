"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * Kontainer notifikasi: kanan atas, tanpa gaya bawaan (kartu digambar oleh `notify`).
 * Ditumpuk 3D (expand=false): hanya kartu terdepan yang terbaca, sisanya mengintip di belakang.
 * Arahkan kursor / ketuk tumpukan untuk membukanya. Gaya kartu belakang: globals.css (data-sonner-toast).
 */
const Toaster = (props: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      position="top-right"
      expand={false}
      visibleToasts={3}
      gap={14}
      offset={{ top: 72, right: 20 }}
      mobileOffset={{ top: "calc(env(safe-area-inset-top) + 64px)", left: 12, right: 12 }}
      swipeDirections={["right", "top"]}
      toastOptions={{ unstyled: true, classNames: { toast: "w-full sm:w-[360px]" } }}
      {...props}
    />
  )
}

export { Toaster }
