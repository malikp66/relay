"use client";

import { motion } from "motion/react";
import { ease } from "@/lib/motion";

/**
 * Transisi antar halaman: fade 180 ms ease-out.
 * Sengaja tanpa transform — transform pada pembungkus akan merusak elemen position:fixed
 * (sticky action bar & FAB) selama animasi.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18, ease: ease.out }}>
      {children}
    </motion.div>
  );
}
