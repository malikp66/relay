/**
 * Token motion Relay (dipakai bersama `motion/react`).
 * Prinsip: ease-out untuk masuk, < 300 ms, animasikan transform/opacity saja,
 * spring tanpa pantulan untuk indikator yang bergeser.
 */
export const ease = {
  out: [0.23, 1, 0.32, 1] as const,
  inOut: [0.77, 0, 0.175, 1] as const,
  drawer: [0.32, 0.72, 0, 1] as const,
};

/** Indikator aktif (tab, nav pill): cepat, tanpa memantul. */
export const slide = { type: "spring", duration: 0.32, bounce: 0 } as const;

/** Elemen kecil yang muncul (badge, ikon). */
export const pop = { type: "spring", duration: 0.28, bounce: 0.15 } as const;

export const fade = { duration: 0.18, ease: ease.out } as const;
