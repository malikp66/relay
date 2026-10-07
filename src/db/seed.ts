import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import type { DB } from "./index";
import * as s from "./schema";
import type { ChecklistType, ReportField, TaskStatus } from "./schema";

/**
 * Data dummy untuk demo ke PM. Semua tanggal relatif terhadap waktu seed,
 * sehingga demo selalu terlihat "hari ini". Password semua akun: relay123
 */

export const DEMO_PASSWORD = "relay123";

const HOUR = 3600_000;
const DAY = 24 * HOUR;

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ───────────── Master data ───────────── */

const USERS = [
  { key: "admin", name: "Rina Kusuma", username: "admin", role: "admin", title: "Admin Operasional" },
  { key: "budi", name: "Budi Santoso", username: "spv.budi", role: "supervisor", title: "Supervisor Crew A" },
  { key: "sari", name: "Sari Wulandari", username: "spv.sari", role: "supervisor", title: "Supervisor Crew B" },
  { key: "andi", name: "Andi Pratama", username: "tek.andi", role: "technician", title: "Teknisi Crew A" },
  { key: "dedi", name: "Dedi Hermawan", username: "tek.dedi", role: "technician", title: "Teknisi Crew A" },
  { key: "eko", name: "Eko Saputra", username: "tek.eko", role: "technician", title: "Teknisi Crew A" },
  { key: "fajar", name: "Fajar Nugroho", username: "tek.fajar", role: "technician", title: "Teknisi Crew A" },
  { key: "gilang", name: "Gilang Ramadhan", username: "tek.gilang", role: "technician", title: "Teknisi Crew B" },
  { key: "hendra", name: "Hendra Wijaya", username: "tek.hendra", role: "technician", title: "Teknisi Crew B" },
  { key: "indra", name: "Indra Kurniawan", username: "tek.indra", role: "technician", title: "Teknisi Crew B" },
  { key: "joko", name: "Joko Susilo", username: "tek.joko", role: "technician", title: "Teknisi Crew B" },
] as const;

const CREW_A_TECH = ["andi", "dedi", "eko", "fajar"];
const CREW_B_TECH = ["gilang", "hendra", "indra", "joko"];

const PRODUCTS = [
  { key: "FO", name: "Fiber Optic" },
  { key: "RD", name: "Radio" },
  { key: "IP", name: "IPTV" },
  { key: "DT", name: "Digital TV" },
  { key: "OT", name: "Other" },
] as const;

const PRIORITIES = [
  { key: "low", name: "Low", level: 1, slaHours: 168 },
  { key: "medium", name: "Medium", level: 2, slaHours: 72 },
  { key: "high", name: "High", level: 3, slaHours: 24 },
  { key: "urgent", name: "Urgent", level: 4, slaHours: 4 },
] as const;

const CUSTOMERS = [
  { name: "Ahmad Fauzi", no: "CUST-10231", phone: "0812-8890-1123", service: "Internet Fiber 50 Mbps", address: "Perum Griya Asri Blok C2 No. 5, Bekasi Timur", lat: -6.2349, lng: 107.0124 },
  { name: "Dewi Lestari", no: "CUST-10388", phone: "0813-1122-3344", service: "Internet Fiber 100 Mbps + IPTV", address: "Jl. Mawar Raya No. 17, Cibubur", lat: -6.3712, lng: 106.8956 },
  { name: "Hendro Gunawan", no: "CUST-10412", phone: "0857-2211-9087", service: "Internet Radio 20 Mbps", address: "Kp. Babakan RT 03/RW 05, Cileungsi", lat: -6.3964, lng: 106.9612 },
  { name: "Maya Anggraini", no: "CUST-10567", phone: "0821-4455-6677", service: "IPTV Paket Keluarga", address: "Apartemen Kalibata City Tower Flamboyan 12F, Jakarta Selatan", lat: -6.2575, lng: 106.8513 },
  { name: "PT Sinar Logistik", no: "CUST-20019", phone: "021-8834-5521", service: "Dedicated Fiber 200 Mbps", address: "Kawasan Industri MM2100 Blok J-3, Cikarang Barat", lat: -6.2987, lng: 107.0856 },
  { name: "Rudi Hartono", no: "CUST-10698", phone: "0812-7766-5544", service: "Digital TV + Internet 30 Mbps", address: "Jl. Kenanga No. 8, Depok II Tengah", lat: -6.3889, lng: 106.8321 },
  { name: "Siti Aminah", no: "CUST-10744", phone: "0838-9900-1122", service: "Internet Fiber 30 Mbps", address: "Perum Villa Nusa Indah 2 Blok S5/12, Gunung Putri", lat: -6.3651, lng: 106.9408 },
  { name: "Klinik Sehat Bersama", no: "CUST-20045", phone: "021-8590-4433", service: "Internet Fiber 100 Mbps", address: "Jl. Raya Hankam No. 45, Pondok Gede", lat: -6.2876, lng: 106.9187 },
  { name: "Yusuf Maulana", no: "CUST-10802", phone: "0819-3344-2211", service: "Internet Radio 10 Mbps", address: "Desa Cikahuripan RT 01/RW 02, Klapanunggal", lat: -6.4472, lng: 106.9719 },
  { name: "Lina Marlina", no: "CUST-10856", phone: "0822-6677-8899", service: "IPTV + Fiber 50 Mbps", address: "Cluster Harmoni Jl. Harmoni 3 No. 21, Harapan Indah", lat: -6.1854, lng: 106.9771 },
];

const INFRA_SITES = [
  { name: "ODC Cibubur-03", address: "Jl. Alternatif Cibubur KM 3, Depok", lat: -6.3681, lng: 106.9012, product: "FO" },
  { name: "ODC Bekasi Timur-07", address: "Jl. Pahlawan Bekasi Timur, Bekasi", lat: -6.2412, lng: 107.0055, product: "FO" },
  { name: "BTS Radio Cileungsi", address: "Bukit Cileungsi Hijau, Bogor", lat: -6.3934, lng: 106.9653, product: "RD" },
  { name: "BTS Radio Klapanunggal", address: "Puncak Klapanunggal, Bogor", lat: -6.4521, lng: 106.9801, product: "RD" },
  { name: "Headend IPTV Kuningan", address: "Gedung NOC Lt. 3, Kuningan, Jakarta Selatan", lat: -6.2244, lng: 106.8304, product: "IP" },
  { name: "Pemancar Digital TV Cimanggis", address: "Jl. Raya Bogor KM 30, Cimanggis", lat: -6.3712, lng: 106.8632, product: "DT" },
  { name: "POP Cikarang", address: "Ruko Union Square Blok A-5, Cikarang", lat: -6.2899, lng: 107.1503, product: "OT" },
];

type TplItem = [label: string, type: ChecklistType, required: boolean, unit?: string];

const CHECKLIST_TEMPLATES: Record<string, TplItem[]> = {
  "TS-FO": [
    ["Ukur redaman di ONT", "data", true, "dBm"],
    ["Cek & bersihkan konektor", "tick", true],
    ["Sambung ulang kabel drop (jika perlu)", "tick", false],
    ["Foto hasil splice / konektor", "photo", true],
    ["Tes kecepatan internet", "data", true, "Mbps"],
    ["Konfirmasi layanan normal ke pelanggan", "tick", true],
  ],
  "TS-RD": [
    ["Cek alignment antena", "tick", true],
    ["Ukur RSSI", "data", true, "dBm"],
    ["Cek kabel LAN & PoE", "tick", true],
    ["Foto posisi antena", "photo", true],
    ["Tes ping ke gateway", "data", false, "ms"],
  ],
  "TS-IP": [
    ["STB menyala & terhubung jaringan", "tick", true],
    ["Cek multicast / IGMP", "tick", true],
    ["Ukur bitrate channel", "data", false, "Mbps"],
    ["Foto layar TV menampilkan siaran", "photo", true],
    ["Reset & update firmware STB", "tick", false],
  ],
  "TS-DT": [
    ["Ukur kualitas sinyal antena", "data", true, "dB"],
    ["Scan ulang channel", "tick", true],
    ["Cek kabel coaxial & konektor", "tick", true],
    ["Foto kualitas gambar", "photo", true],
  ],
  "TS-OT": [
    ["Identifikasi sumber masalah", "tick", true],
    ["Lakukan tindakan perbaikan", "tick", true],
    ["Foto bukti pekerjaan", "photo", true],
  ],
  "MT-FO": [
    ["Cek kondisi fisik ODC/ODP", "tick", true],
    ["Foto kondisi sebelum", "photo", true],
    ["Ukur redaman dengan OTDR", "data", true, "dB"],
    ["Rapikan & labeling kabel", "tick", true],
    ["Bersihkan konektor patch panel", "tick", true],
    ["Foto kondisi sesudah", "photo", true],
  ],
  "MT-RD": [
    ["Cek kondisi tower & mounting", "tick", true],
    ["Ukur RSSI link", "data", true, "dBm"],
    ["Cek grounding & arrester", "tick", true],
    ["Kencangkan konektor", "tick", false],
    ["Foto antena & perangkat", "photo", true],
  ],
  "MT-IP": [
    ["Ukur suhu ruang headend", "data", true, "°C"],
    ["Cek encoder & server streaming", "tick", true],
    ["Backup konfigurasi", "tick", true],
    ["Foto rack perangkat", "photo", true],
  ],
  "MT-DT": [
    ["Cek kondisi transmitter", "tick", true],
    ["Ukur daya pancar", "data", true, "W"],
    ["Cek UPS & baterai", "tick", true],
    ["Foto panel transmitter", "photo", true],
  ],
  "MT-OT": [
    ["Pemeriksaan umum perangkat", "tick", true],
    ["Pembersihan perangkat", "tick", false],
    ["Foto kondisi perangkat", "photo", true],
  ],
};

export const TS_REPORT_FIELDS: ReportField[] = [
  { key: "keluhan", label: "Keluhan pelanggan", type: "textarea", required: true },
  { key: "gejala", label: "Gejala yang ditemukan", type: "textarea", required: true },
  {
    key: "akar_masalah",
    label: "Akar masalah",
    type: "select",
    required: true,
    options: ["Kabel putus", "Konektor kotor/rusak", "Perangkat pelanggan", "Perangkat jaringan", "Power/listrik", "Interferensi", "Konfigurasi", "Lainnya"],
  },
  { key: "tindakan", label: "Tindakan yang dilakukan", type: "textarea", required: true },
  { key: "perangkat_diganti", label: "Perangkat yang diganti", type: "text", required: false, placeholder: "mis. Patchcord SC/UPC 3m" },
  { key: "status_layanan", label: "Status layanan setelah perbaikan", type: "select", required: true, options: ["Normal", "Sebagian", "Belum normal"] },
  { key: "penerima", label: "Nama penerima di lokasi", type: "text", required: false },
];

export const MT_REPORT_FIELDS: ReportField[] = [
  { key: "kondisi_sebelum", label: "Kondisi sebelum pekerjaan", type: "textarea", required: true },
  { key: "pekerjaan", label: "Pekerjaan yang dilakukan", type: "textarea", required: true },
  { key: "kondisi_sesudah", label: "Kondisi setelah pekerjaan", type: "textarea", required: true },
  { key: "temuan", label: "Temuan / potensi masalah", type: "textarea", required: false },
  { key: "rekomendasi", label: "Rekomendasi tindak lanjut", type: "textarea", required: false },
  { key: "perlu_tindak_lanjut", label: "Perlu task lanjutan?", type: "boolean", required: false },
];

const TS_TITLES: Record<string, string[]> = {
  FO: ["Internet mati total", "Internet lambat & putus-putus", "Lampu LOS merah di ONT", "Kabel drop putus terkena pohon"],
  RD: ["Koneksi radio sering putus", "Sinyal radio lemah setelah hujan", "Internet radio tidak bisa connect"],
  IP: ["IPTV tidak ada siaran", "Gambar IPTV patah-patah", "STB IPTV restart terus"],
  DT: ["Siaran digital TV hilang", "Gambar TV kotak-kotak"],
  OT: ["Router pelanggan bermasalah", "Pindah posisi perangkat"],
};
const MT_TITLES: Record<string, string[]> = {
  FO: ["Maintenance rutin ODC", "Perapihan kabel ODP", "Pengukuran OTDR berkala"],
  RD: ["Maintenance rutin BTS radio", "Pengecekan grounding tower"],
  IP: ["Maintenance headend IPTV", "Backup konfigurasi encoder"],
  DT: ["Maintenance pemancar digital", "Pengecekan UPS pemancar"],
  OT: ["Pemeriksaan perangkat POP"],
};

const DEMO_PHOTOS = ["/demo/foto-1.svg", "/demo/foto-2.svg", "/demo/foto-3.svg", "/demo/foto-4.svg", "/demo/foto-5.svg", "/demo/foto-6.svg"];

const TS_REPORT_SAMPLE = {
  keluhan: "Pelanggan melaporkan internet mati sejak pagi, lampu LOS menyala merah.",
  gejala: "Redaman di ONT -32 dBm, konektor di roset kotor dan patchcord tertekuk.",
  akar_masalah: "Konektor kotor/rusak",
  tindakan: "Membersihkan konektor, mengganti patchcord, re-splice kabel drop di roset. Redaman kembali normal -19 dBm.",
  perangkat_diganti: "Patchcord SC/UPC 3m",
  status_layanan: "Normal",
  penerima: "Pelanggan langsung",
};
const MT_REPORT_SAMPLE = {
  kondisi_sebelum: "Kabel di dalam ODC kurang rapi, beberapa label hilang, konektor berdebu.",
  pekerjaan: "Merapikan kabel, memasang label baru, membersihkan konektor patch panel, pengukuran OTDR seluruh core aktif.",
  kondisi_sesudah: "ODC rapi dan berlabel, hasil OTDR dalam batas normal.",
  temuan: "Satu core cadangan memiliki redaman tinggi.",
  rekomendasi: "Jadwalkan penggantian core cadangan bulan depan.",
  perlu_tindak_lanjut: true,
};

const REVISION_COMMENTS = [
  "Foto hasil splice kurang jelas, mohon foto ulang lebih dekat.",
  "Nilai redaman belum diisi setelah perbaikan. Mohon dilengkapi.",
  "Tindakan yang dilakukan kurang detail, sebutkan perangkat yang diganti.",
  "Foto sebelum & sesudah tertukar, mohon diperbaiki.",
];

/* ───────────── Seeder ───────────── */

export async function seedIfEmpty(db: DB) {
  const res = await db.execute(sql`select count(*)::int as n from users`);
  const n = (res.rows[0] as { n: number }).n;
  if (n > 0) return;
  await seedDemo(db);
}

export async function resetDemo(db: DB) {
  await db.execute(sql`
    truncate table audit_logs, task_events, attendances, reviews, reports, checklist_responses,
      checklist_items, task_assignees, maintenance_plans, tasks, report_templates,
      checklist_template_items, checklist_templates, sites, customers, priorities, group_scopes,
      products, categories, group_members, groups, sessions, users cascade`);
  await seedDemo(db);
}

async function seedDemo(db: DB) {
  const rand = rng(20261006);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
  const now = Date.now();
  const at = (ms: number) => new Date(ms);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 8);

  /* Users */
  const userRows = await db
    .insert(s.users)
    .values(USERS.map((u, i) => ({ name: u.name, username: u.username, role: u.role, title: u.title, passwordHash, phone: `0812-${1000 + i * 37}-${2000 + i * 53}` })))
    .returning();
  const U = Object.fromEntries(USERS.map((u, i) => [u.key, userRows[i]])) as Record<string, (typeof userRows)[number]>;

  /* Categories, products, priorities */
  const [catTS, catMT] = await db
    .insert(s.categories)
    .values([
      { name: "Troubleshoot", code: "TS", isScheduled: false, description: "Pekerjaan reaktif dari komplain pelanggan" },
      { name: "Maintenance", code: "MT", isScheduled: true, description: "Pekerjaan terjadwal pada infrastruktur" },
    ])
    .returning();
  const productRows = await db.insert(s.products).values(PRODUCTS.map((p) => ({ name: p.name, code: p.key }))).returning();
  const P = Object.fromEntries(PRODUCTS.map((p, i) => [p.key, productRows[i]]));
  const prioRows = await db.insert(s.priorities).values(PRIORITIES.map((p) => ({ name: p.name, level: p.level, slaHours: p.slaHours }))).returning();
  const PR = Object.fromEntries(PRIORITIES.map((p, i) => [p.key, prioRows[i]]));

  /* Groups / org tree */
  const [root] = await db.insert(s.groups).values({ name: "Field Operations", code: "FIELD-OPS", description: "Seluruh tim lapangan" }).returning();
  const [crewA, crewB] = await db
    .insert(s.groups)
    .values([
      { name: "Crew A", code: "CREW-A", description: "Tim Troubleshoot (reaktif)", parentId: root.id },
      { name: "Crew B", code: "CREW-B", description: "Tim Maintenance (terjadwal)", parentId: root.id },
    ])
    .returning();
  await db.insert(s.groupScopes).values([
    { groupId: crewA.id, categoryId: catTS.id },
    { groupId: crewB.id, categoryId: catMT.id },
  ]);
  await db.insert(s.groupMembers).values([
    { groupId: crewA.id, userId: U.budi.id, memberRole: "supervisor" },
    { groupId: crewB.id, userId: U.sari.id, memberRole: "supervisor" },
    ...CREW_A_TECH.map((k) => ({ groupId: crewA.id, userId: U[k].id, memberRole: "technician" as const })),
    ...CREW_B_TECH.map((k) => ({ groupId: crewB.id, userId: U[k].id, memberRole: "technician" as const })),
  ]);

  /* Customers & sites */
  const custRows = await db
    .insert(s.customers)
    .values(CUSTOMERS.map((c) => ({ name: c.name, customerNo: c.no, phone: c.phone, address: c.address, service: c.service })))
    .returning();
  const custSites = await db
    .insert(s.sites)
    .values(CUSTOMERS.map((c, i) => ({ name: `Lokasi ${c.name}`, address: c.address, lat: c.lat, lng: c.lng, customerId: custRows[i].id })))
    .returning();
  const infraSites = await db
    .insert(s.sites)
    .values(INFRA_SITES.map((x) => ({ name: x.name, address: x.address, lat: x.lat, lng: x.lng, radiusM: 300 })))
    .returning();
  const infraByProduct = (code: string) => infraSites.filter((_, i) => INFRA_SITES[i].product === code);

  /* Templates */
  const tplItemsByKey: Record<string, TplItem[]> = CHECKLIST_TEMPLATES;
  for (const [key, items] of Object.entries(CHECKLIST_TEMPLATES)) {
    const [catCode, prodCode] = key.split("-");
    const cat = catCode === "TS" ? catTS : catMT;
    const [tpl] = await db
      .insert(s.checklistTemplates)
      .values({ name: `${cat.name} – ${P[prodCode].name}`, categoryId: cat.id, productId: P[prodCode].id })
      .returning();
    await db.insert(s.checklistTemplateItems).values(items.map(([label, type, required, unit], i) => ({ templateId: tpl.id, label, type, required, unit, sort: i })));
  }
  const [rtTS, rtMT] = await db
    .insert(s.reportTemplates)
    .values([
      { categoryId: catTS.id, name: "Laporan Troubleshoot", fields: TS_REPORT_FIELDS },
      { categoryId: catMT.id, name: "Laporan Maintenance", fields: MT_REPORT_FIELDS },
    ])
    .returning();

  /* Tasks */
  const seqByPrefix: Record<string, number> = {};
  const openAttendance = new Set<string>();

  type Spec = {
    cat: "TS" | "MT";
    product: string;
    status: TaskStatus;
    priority: keyof typeof PR;
    assignees: string[];
    createdAgoH: number; // berapa jam lalu task dibuat
    scheduledInH?: number; // relatif ke sekarang (bisa negatif)
    revisions?: number;
    title?: string;
    partial?: number; // proporsi checklist terisi untuk in_progress
    overdue?: boolean;
  };

  async function makeTask(spec: Spec) {
    const isTS = spec.cat === "TS";
    const cat = isTS ? catTS : catMT;
    const group = isTS ? crewA : crewB;
    const spv = isTS ? U.budi : U.sari;
    const prio = PR[spec.priority];
    const created = now - spec.createdAgoH * HOUR;
    const named = spec.title ? CUSTOMERS.findIndex((c) => spec.title!.includes(c.name)) : -1;
    const custIdx = named >= 0 ? named : Math.floor(rand() * CUSTOMERS.length);
    const site = isTS ? custSites[custIdx] : pick(infraByProduct(spec.product).length ? infraByProduct(spec.product) : infraSites);
    const customer = isTS ? custRows[custIdx] : null;
    const titles = (isTS ? TS_TITLES : MT_TITLES)[spec.product];
    const title = spec.title ?? `${pick(titles)}${isTS ? ` – ${customer!.name}` : ` – ${site.name}`}`;
    const scheduledFor = spec.scheduledInH !== undefined ? now + spec.scheduledInH * HOUR : isTS ? created + 1 * HOUR : created + 24 * HOUR;
    const dueAt = spec.overdue ? now - 3 * HOUR : (isTS ? created : scheduledFor) + prio.slaHours * HOUR;

    const d = new Date(created);
    const prefix = `${cat.code}-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}`;
    seqByPrefix[prefix] = (seqByPrefix[prefix] ?? 0) + 1;
    const code = `${prefix}-${String(seqByPrefix[prefix]).padStart(4, "0")}`;

    // Timeline
    const order: TaskStatus[] = ["assigned", "in_progress", "job_done", "submitted", "under_review", "approved", "finished"];
    const reached = (st: TaskStatus) => {
      if (spec.status === "revision") return ["assigned", "in_progress", "job_done", "submitted", "under_review"].includes(st);
      if (spec.status === "cancelled") return st === "assigned";
      return order.indexOf(st) <= order.indexOf(spec.status);
    };
    const span = Math.max(spec.createdAgoH * HOUR, 2 * HOUR);
    const startedAt = reached("in_progress") ? Math.max(created + Math.min(span * 0.15, 3 * HOUR), Math.min(scheduledFor + (rand() * 40 - 10) * 60_000, now - 30 * 60_000)) : null;
    const jobDoneAt = reached("job_done") && startedAt ? Math.min(startedAt + (1 + rand() * 3) * HOUR, now - 20 * 60_000) : null;
    const submittedAt = reached("submitted") && jobDoneAt ? Math.min(jobDoneAt + (0.3 + rand() * 6) * HOUR, now - 10 * 60_000) : null;
    const revisions = spec.revisions ?? 0;
    const reviewSpan = submittedAt ? Math.max(now - submittedAt, HOUR) : 0;
    const finishedAt = reached("approved") && submittedAt ? Math.min(submittedAt + reviewSpan * 0.6, now - 5 * 60_000) : null;

    const [task] = await db
      .insert(s.tasks)
      .values({
        code,
        title,
        description: isTS ? `Komplain via call center. Layanan: ${customer!.service}.` : `Pekerjaan maintenance terjadwal di ${site.name}.`,
        categoryId: cat.id,
        productId: P[spec.product].id,
        groupId: group.id,
        priorityId: prio.id,
        siteId: site.id,
        customerId: customer?.id ?? null,
        status: spec.status,
        source: isTS ? "complaint" : "maintenance_plan",
        createdBy: spv.id,
        dueAt: at(dueAt),
        scheduledFor: at(scheduledFor),
        startedAt: startedAt ? at(startedAt) : null,
        jobDoneAt: jobDoneAt ? at(jobDoneAt) : null,
        submittedAt: submittedAt ? at(submittedAt) : null,
        lastSubmittedAt: submittedAt ? at(submittedAt + (revisions ? reviewSpan * 0.4 : 0)) : null,
        approvedAt: finishedAt ? at(finishedAt) : null,
        finishedAt: spec.status === "finished" && finishedAt ? at(finishedAt) : null,
        cancelledAt: spec.status === "cancelled" ? at(created + 2 * HOUR) : null,
        cancelReason: spec.status === "cancelled" ? "Pelanggan membatalkan komplain, layanan sudah normal kembali." : null,
        revisionCount: spec.status === "revision" ? Math.max(1, revisions) : revisions,
        createdAt: at(created),
        updatedAt: at(Math.max(created, finishedAt ?? submittedAt ?? jobDoneAt ?? startedAt ?? created)),
      })
      .returning();

    await db.insert(s.taskAssignees).values(spec.assignees.map((k) => ({ taskId: task.id, userId: U[k].id, assignedAt: at(created) })));

    // Checklist
    const tplItems = tplItemsByKey[`${spec.cat}-${spec.product}`];
    const items = await db
      .insert(s.checklistItems)
      .values(tplItems.map(([label, type, required, unit], i) => ({ taskId: task.id, label, type, required, unit, sort: i })))
      .returning();
    const fillAll = reached("job_done");
    const fillRatio = fillAll ? 1 : spec.status === "in_progress" ? (spec.partial ?? 0.5) : 0;
    const toFill = Math.round(items.length * fillRatio);
    const respRows = items.slice(0, toFill).map((it, i) => {
      const by = U[spec.assignees[i % spec.assignees.length]].id;
      const when = at((startedAt ?? created) + (i + 1) * 12 * 60_000);
      return {
        itemId: it.id,
        checked: it.type === "tick" ? true : null,
        value: it.type === "data" ? demoValue(it.unit) : null,
        photos: it.type === "photo" ? [DEMO_PHOTOS[(i + spec.createdAgoH) % DEMO_PHOTOS.length]] : [],
        completedBy: by,
        completedAt: when,
      };
    });
    if (respRows.length) await db.insert(s.checklistResponses).values(respRows);

    // Attendance
    if (startedAt) {
      const lead = spec.assignees[0];
      const checkOut = jobDoneAt ? jobDoneAt + 10 * 60_000 : null;
      const open = !checkOut && !openAttendance.has(lead);
      if (open) openAttendance.add(lead);
      const late = startedAt > scheduledFor + 15 * 60_000;
      const outside = rand() < 0.08;
      await db.insert(s.attendances).values(
        spec.assignees.map((k, i) => ({
          userId: U[k].id,
          taskId: task.id,
          checkInAt: at(startedAt + i * 4 * 60_000),
          checkInLat: site.lat + (outside ? 0.004 : (rand() - 0.5) * 0.0008),
          checkInLng: site.lng + (outside ? 0.004 : (rand() - 0.5) * 0.0008),
          accuracyM: 8 + Math.round(rand() * 20),
          distanceM: outside ? 560 : Math.round(15 + rand() * 60),
          withinGeofence: !outside,
          isLate: late,
          checkOutAt: checkOut ? at(checkOut) : i === 0 && open ? null : at(startedAt + 90 * 60_000),
        })),
      );
    }

    // Report
    if (reached("job_done")) {
      const sample = isTS ? TS_REPORT_SAMPLE : MT_REPORT_SAMPLE;
      const draftOnly = spec.status === "job_done";
      await db.insert(s.reports).values({
        taskId: task.id,
        templateId: isTS ? rtTS.id : rtMT.id,
        fields: draftOnly ? Object.fromEntries(Object.entries(sample).slice(0, 2)) : sample,
        findings: draftOnly ? null : "Pekerjaan selesai sesuai checklist. Pelanggan/lokasi sudah dicek ulang.",
        submittedBy: submittedAt ? U[spec.assignees[0]].id : null,
        submittedAt: submittedAt ? at(submittedAt) : null,
        lastEditedBy: U[spec.assignees[0]].id,
      });
    }

    // Reviews
    let pass = 0;
    const revCount = spec.status === "revision" ? Math.max(1, revisions) : revisions;
    for (let r = 0; r < revCount; r++) {
      pass++;
      await db.insert(s.reviews).values({
        taskId: task.id,
        passNo: pass,
        reviewerId: spv.id,
        decision: "revision",
        comments: REVISION_COMMENTS[(r + spec.createdAgoH) % REVISION_COMMENTS.length],
        reviewedAt: at((submittedAt ?? now) + (r + 1) * Math.max(reviewSpan * 0.15, 15 * 60_000)),
      });
    }
    if (finishedAt) {
      pass++;
      await db.insert(s.reviews).values({
        taskId: task.id,
        passNo: pass,
        reviewerId: spv.id,
        decision: "approve",
        comments: pick(["Laporan lengkap, terima kasih.", "OK, approved.", "Bukti foto jelas. Approved.", null]),
        reviewedAt: at(finishedAt),
      });
    }

    // Events (riwayat)
    const ev: { type: string; from?: TaskStatus; to?: TaskStatus; actor: string; t: number; note?: string }[] = [
      { type: "created", to: "assigned", actor: spv.id, t: created, note: `Ditugaskan ke ${spec.assignees.map((k) => U[k].name).join(", ")}` },
    ];
    if (startedAt) ev.push({ type: "check_in", from: "assigned", to: "in_progress", actor: U[spec.assignees[0]].id, t: startedAt, note: "Check-in di lokasi" });
    if (jobDoneAt) ev.push({ type: "status", from: "in_progress", to: "job_done", actor: U[spec.assignees[0]].id, t: jobDoneAt });
    if (submittedAt) ev.push({ type: "status", from: "job_done", to: "submitted", actor: U[spec.assignees[0]].id, t: submittedAt, note: "Laporan dikirim" });
    if (submittedAt && reached("under_review")) {
      let t = submittedAt + 5 * 60_000;
      for (let r = 0; r < revCount; r++) {
        ev.push({ type: "status", from: r === 0 ? "submitted" : "revision", to: "under_review", actor: r === 0 ? spv.id : U[spec.assignees[0]].id, t });
        t += Math.max(reviewSpan * 0.15, 15 * 60_000);
        ev.push({ type: "status", from: "under_review", to: "revision", actor: spv.id, t, note: REVISION_COMMENTS[(r + spec.createdAgoH) % REVISION_COMMENTS.length] });
        t += 5 * 60_000;
      }
      if (spec.status !== "revision") {
        ev.push({ type: "status", from: revCount ? "revision" : "submitted", to: "under_review", actor: revCount ? U[spec.assignees[0]].id : spv.id, t, note: revCount ? "Laporan revisi dikirim ulang" : undefined });
      }
      if (finishedAt) {
        ev.push({ type: "status", from: "under_review", to: "approved", actor: spv.id, t: finishedAt });
        if (spec.status === "finished") ev.push({ type: "status", from: "approved", to: "finished", actor: spv.id, t: finishedAt + 1000, note: "Ditutup otomatis oleh sistem" });
      }
    }
    if (spec.status === "cancelled") ev.push({ type: "status", from: "assigned", to: "cancelled", actor: spv.id, t: created + 2 * HOUR, note: "Pelanggan membatalkan komplain" });
    await db.insert(s.taskEvents).values(ev.map((e) => ({ taskId: task.id, actorId: e.actor, type: e.type, fromStatus: e.from ?? null, toStatus: e.to ?? null, note: e.note ?? null, createdAt: at(e.t) })));
    return task;
  }

  /* — Showcase: kondisi yang terlihat saat demo — */
  const showcase: Spec[] = [
    // Crew A / Andi (teknisi demo utama)
    { cat: "TS", product: "FO", status: "in_progress", priority: "high", assignees: ["andi", "dedi"], createdAgoH: 3, scheduledInH: -1.5, partial: 0.5, title: "Internet mati total – Ahmad Fauzi" },
    { cat: "TS", product: "IP", status: "assigned", priority: "medium", assignees: ["andi"], createdAgoH: 1, scheduledInH: 2, title: "IPTV tidak ada siaran – Dewi Lestari" },
    { cat: "TS", product: "FO", status: "assigned", priority: "urgent", assignees: ["andi", "eko"], createdAgoH: 0.5, scheduledInH: 0.5, title: "Internet kantor down – PT Sinar Logistik" },
    { cat: "TS", product: "RD", status: "revision", priority: "medium", assignees: ["andi"], createdAgoH: 28, revisions: 1, title: "Sinyal radio lemah setelah hujan – Hendro Gunawan" },
    { cat: "TS", product: "DT", status: "job_done", priority: "low", assignees: ["andi"], createdAgoH: 6, title: "Gambar TV kotak-kotak – Rudi Hartono" },
    // Antrian review Budi
    { cat: "TS", product: "FO", status: "submitted", priority: "high", assignees: ["dedi"], createdAgoH: 7, title: "Lampu LOS merah di ONT – Siti Aminah" },
    { cat: "TS", product: "IP", status: "submitted", priority: "medium", assignees: ["eko", "fajar"], createdAgoH: 10 },
    { cat: "TS", product: "FO", status: "under_review", priority: "urgent", assignees: ["fajar"], createdAgoH: 9, revisions: 1, title: "Internet lambat & putus-putus – Klinik Sehat Bersama" },
    { cat: "TS", product: "RD", status: "in_progress", priority: "medium", assignees: ["eko"], createdAgoH: 4, scheduledInH: -2, partial: 0.4 },
    { cat: "TS", product: "OT", status: "assigned", priority: "low", assignees: ["fajar"], createdAgoH: 2, scheduledInH: 20 },
    { cat: "TS", product: "FO", status: "in_progress", priority: "high", assignees: ["dedi"], createdAgoH: 30, scheduledInH: -26, partial: 0.3, overdue: true },
    { cat: "TS", product: "FO", status: "finished", priority: "medium", assignees: ["dedi", "eko"], revisions: 1, createdAgoH: 20 },
    { cat: "TS", product: "OT", status: "cancelled", priority: "low", assignees: ["fajar"], createdAgoH: 26 },
    // Crew B / Sari
    { cat: "MT", product: "FO", status: "in_progress", priority: "medium", assignees: ["gilang", "hendra"], createdAgoH: 26, scheduledInH: -2, partial: 0.6 },
    { cat: "MT", product: "RD", status: "assigned", priority: "medium", assignees: ["indra"], createdAgoH: 48, scheduledInH: 3 },
    { cat: "MT", product: "IP", status: "assigned", priority: "low", assignees: ["joko"], createdAgoH: 30, scheduledInH: 26 },
    { cat: "MT", product: "DT", status: "assigned", priority: "medium", assignees: ["gilang"], createdAgoH: 20, scheduledInH: 50 },
    { cat: "MT", product: "FO", status: "assigned", priority: "low", assignees: ["hendra", "joko"], createdAgoH: 12, scheduledInH: 75 },
    { cat: "MT", product: "RD", status: "assigned", priority: "low", assignees: ["indra"], createdAgoH: 12, scheduledInH: 120 },
    { cat: "MT", product: "FO", status: "submitted", priority: "medium", assignees: ["indra", "joko"], createdAgoH: 30 },
    { cat: "MT", product: "DT", status: "revision", priority: "medium", assignees: ["joko"], createdAgoH: 50, revisions: 2 },
    { cat: "MT", product: "IP", status: "job_done", priority: "medium", assignees: ["hendra"], createdAgoH: 28 },
    { cat: "MT", product: "RD", status: "under_review", priority: "high", assignees: ["gilang"], createdAgoH: 29 },
  ];
  for (const sp of showcase) await makeTask(sp);

  /* — Riwayat 45 hari terakhir untuk statistik — */
  for (let i = 0; i < 70; i++) {
    const isTS = rand() < 0.6;
    const product = isTS ? pick(["FO", "FO", "FO", "RD", "IP", "IP", "DT", "OT"]) : pick(["FO", "FO", "RD", "IP", "DT", "OT"]);
    const techs = isTS ? CREW_A_TECH : CREW_B_TECH;
    const lead = pick(techs);
    const assignees = rand() < 0.3 ? [lead, pick(techs.filter((t) => t !== lead))] : [lead];
    const r = rand();
    const revisions = r < 0.6 ? 0 : r < 0.85 ? 1 : r < 0.96 ? 2 : 3;
    await makeTask({
      cat: isTS ? "TS" : "MT",
      product,
      status: "finished",
      priority: isTS ? pick(["medium", "medium", "high", "high", "urgent", "low"]) : pick(["low", "medium", "medium"]),
      assignees,
      createdAgoH: 24 * (2 + rand() * 43),
      revisions,
    });
  }

  /* Maintenance plans */
  await db.insert(s.maintenancePlans).values([
    { title: "Maintenance rutin ODC Cibubur-03", groupId: crewB.id, productId: P.FO.id, siteId: infraByProduct("FO")[0].id, priorityId: PR.medium.id, frequency: "weekly", nextDate: at(now + 3 * DAY), assigneeIds: [U.gilang.id, U.hendra.id], createdBy: U.sari.id },
    { title: "Pengecekan BTS Radio Cileungsi", groupId: crewB.id, productId: P.RD.id, siteId: infraByProduct("RD")[0].id, priorityId: PR.medium.id, frequency: "monthly", nextDate: at(now + 9 * DAY), assigneeIds: [U.indra.id], createdBy: U.sari.id },
    { title: "Maintenance Headend IPTV Kuningan", groupId: crewB.id, productId: P.IP.id, siteId: infraByProduct("IP")[0].id, priorityId: PR.high.id, frequency: "monthly", nextDate: at(now + 14 * DAY), assigneeIds: [U.joko.id], createdBy: U.sari.id },
    { title: "Pengecekan UPS Pemancar Cimanggis", groupId: crewB.id, productId: P.DT.id, siteId: infraByProduct("DT")[0].id, priorityId: PR.low.id, frequency: "weekly", nextDate: at(now + 5 * DAY), assigneeIds: [U.gilang.id], createdBy: U.sari.id },
  ]);

  await db.insert(s.auditLogs).values([
    { actorId: U.admin.id, entity: "group", action: "create", summary: "Membuat Crew A & Crew B" },
    { actorId: U.admin.id, entity: "user", action: "import", summary: "Import 11 user awal" },
    { actorId: U.admin.id, entity: "checklist_template", action: "create", summary: "Membuat 10 template checklist" },
  ]);
}

function demoValue(unit: string | null) {
  switch (unit) {
    case "dBm":
      return String(-(17 + Math.round(Math.random() * 6)));
    case "Mbps":
      return String(45 + Math.round(Math.random() * 50));
    case "dB":
      return (0.3 + Math.random() * 1.2).toFixed(2);
    case "ms":
      return String(4 + Math.round(Math.random() * 12));
    case "°C":
      return String(20 + Math.round(Math.random() * 4));
    case "W":
      return String(950 + Math.round(Math.random() * 100));
    default:
      return "OK";
  }
}
