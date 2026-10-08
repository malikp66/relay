import { z } from "zod";
import { PRODUCT_ICON_IDS } from "@/lib/product-icons";

/**
 * Aturan validasi master data — SATU sumber untuk form (cek langsung di layar) dan server action (cek ulang).
 * Pesan ditulis untuk admin non-teknis: sebut apa yang salah dan contoh yang benar.
 */

const name = z.string().trim().min(2, "Minimal 2 huruf.").max(80, "Maksimal 80 huruf.");
const code = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{2,12}$/, "2 sampai 12 huruf besar, angka, atau tanda minus. Contoh: FO, CREW-C.");
const optionalText = (max: number) => z.string().trim().max(max, `Maksimal ${max} huruf.`).optional().or(z.literal(""));
const phone = z
  .string()
  .trim()
  .regex(/^(\+62|62|0)8[0-9 -]{7,14}$/, "Nomor HP diawali 08 atau +628, contoh 0812-3456-7890.")
  .optional()
  .or(z.literal(""));

/** Batas wilayah Indonesia (dengan sedikit kelonggaran) untuk titik lokasi. */
export const ID_BOUNDS = { south: -11.5, west: 94, north: 6.5, east: 141.5 } as const;

export const SLA_MAX_HOURS = 24 * 30;

/** Koordinat: kosong/null harus terbaca "belum dipilih", bukan angka 0 (yang lalu dianggap di luar Indonesia). */
const point = z.preprocess((v) => (v === null || v === "" || v === undefined ? undefined : Number(v)), z.number({ message: "Tentukan titik di peta." }));

export const masterSchemas = {
  categories: z.object({
    name,
    code,
    isScheduled: z.boolean().default(false),
    description: optionalText(200),
  }),
  products: z.object({ name, code, icon: z.enum(PRODUCT_ICON_IDS, { message: "Pilih ikon produk." }) }),
  priorities: z.object({
    name,
    level: z.coerce.number({ message: "Isi angka level." }).int("Level harus bilangan bulat.").min(1, "Level 1 sampai 9.").max(9, "Level 1 sampai 9."),
    slaHours: z.coerce.number({ message: "Isi lama SLA." }).int("SLA dalam jam bulat.").min(1, "SLA minimal 1 jam.").max(SLA_MAX_HOURS, "SLA maksimal 30 hari."),
  }),
  customers: z.object({
    name,
    customerNo: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9-]{3,20}$/, "3 sampai 20 huruf/angka, contoh CUST-00123."),
    phone,
    service: optionalText(80),
    address: optionalText(240),
  }),
  sites: z.object({
    name,
    address: z.string().trim().min(5, "Tulis alamat lengkap (min. 5 huruf).").max(240, "Maksimal 240 huruf."),
    lat: point.pipe(z.number().min(ID_BOUNDS.south, "Titik harus di wilayah Indonesia.").max(ID_BOUNDS.north, "Titik harus di wilayah Indonesia.")),
    lng: point.pipe(z.number().min(ID_BOUNDS.west, "Titik harus di wilayah Indonesia.").max(ID_BOUNDS.east, "Titik harus di wilayah Indonesia.")),
    radiusM: z.coerce.number({ message: "Isi radius." }).int("Radius dalam meter bulat.").min(20, "Radius 20 sampai 5000 m.").max(5000, "Radius 20 sampai 5000 m."),
    customerId: z.string().optional(),
  }),
} as const;
export type MasterKind = keyof typeof masterSchemas;

export const userSchema = z
  .object({
    id: z.string().optional(),
    name,
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9._]{3,30}$/, "3 sampai 30 huruf kecil, angka, titik, atau garis bawah. Contoh: tek.andi."),
    role: z.enum(["admin", "supervisor", "technician"], { message: "Pilih role." }),
    title: optionalText(80),
    phone,
    groupId: z.string().optional(),
  })
  .refine((u) => u.role === "admin" || !!u.groupId, { path: ["groupId"], message: "Teknisi dan supervisor harus masuk crew." });

export const groupSchema = z.object({
  id: z.string().optional(),
  name,
  code,
  description: optionalText(200),
  categoryIds: z.array(z.string()),
});

/** Kode unik di database → field form mana yang harus ditandai. */
export const UNIQUE_FIELDS: Record<string, { field: string; message: string }> = {
  users_username_unique: { field: "username", message: "Username ini sudah dipakai." },
  products_code_unique: { field: "code", message: "Kode ini sudah dipakai produk lain." },
  categories_code_unique: { field: "code", message: "Kode ini sudah dipakai kategori lain." },
  groups_code_unique: { field: "code", message: "Kode ini sudah dipakai crew lain." },
  customers_customer_no_unique: { field: "customerNo", message: "No. pelanggan ini sudah terdaftar." },
};

export type FieldErrors = Record<string, string>;

/** Ambil satu pesan per field (yang pertama). */
export function toFieldErrors(err: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const i of err.issues) {
    const k = String(i.path[0] ?? "_");
    out[k] ??= i.message;
  }
  return out;
}

export function check<T extends z.ZodTypeAny>(schema: T, data: unknown): { ok: true; data: z.output<T> } | { ok: false; errors: FieldErrors } {
  const r = schema.safeParse(data);
  return r.success ? { ok: true, data: r.data } : { ok: false, errors: toFieldErrors(r.error) };
}
