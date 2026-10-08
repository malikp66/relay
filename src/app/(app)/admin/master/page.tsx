import { requireUser } from "@/server/auth";
import { masterData } from "@/server/queries";
import { productIconLabel } from "@/lib/product-icons";
import { MasterCrud } from "@/components/relay/master-crud";
import { humanizeHours } from "@/lib/format";

export const metadata = { title: "Referensi" };

export default async function MasterPage() {
  await requireUser(["admin"]);
  const md = await masterData();
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <MasterCrud
        kind="categories"
        title="Kategori"
        rows={md.categories.map((r) => ({ ...r, _primary: `${r.name} (${r.code})`, _secondary: `${r.isScheduled ? "Terjadwal" : "Reaktif"} · ${r.description ?? ""}` }))}
        fields={[
          { key: "name", label: "Nama", half: true, placeholder: "mis. Troubleshoot" },
          { key: "code", label: "Kode", half: true, upper: true, placeholder: "mis. TS", hint: "Dipakai di nomor task, mis. TS-2610-0001." },
          { key: "isScheduled", label: "Pekerjaan terjadwal", type: "checkbox", hint: "Nyalakan untuk maintenance rutin; matikan untuk pekerjaan dari komplain." },
          { key: "description", label: "Deskripsi", type: "textarea", optional: true, placeholder: "Penjelasan singkat untuk supervisor" },
        ]}
      />
      <MasterCrud kind="products" title="Produk" rows={md.products.map((r) => ({ ...r, icon: r.icon ?? "box", _primary: r.name, _secondary: `Kode ${r.code} · Ikon ${productIconLabel(r.icon).toLowerCase()}`, _icon: r.icon ?? "box" }))} fields={[
          { key: "name", label: "Nama", half: true, placeholder: "mis. Fiber Optic" },
          { key: "code", label: "Kode", half: true, upper: true, placeholder: "mis. FO" },
          { key: "icon", label: "Ikon", type: "icon", hint: "Tampil di chip produk saat membuat task dan di template." },
        ]}
      />
      <MasterCrud
        kind="priorities"
        title="Prioritas & SLA"
        rows={md.priorities.map((r) => ({ ...r, _primary: r.name, _secondary: `Level ${r.level} · SLA ${humanizeHours(r.slaHours)}` }))}
        fields={[
          { key: "name", label: "Nama", half: true, placeholder: "mis. High" },
          { key: "level", label: "Level", type: "number", half: true, placeholder: "1 sampai 9", hint: "Urutan prioritas: 1 paling rendah, angka lebih besar lebih mendesak." },
          { key: "slaHours", label: "Batas waktu (SLA)", type: "duration", hint: "Lama waktu dari jadwal mulai sampai deadline task. Dihitung otomatis saat membuat task." },
        ]}
      />
    </div>
  );
}
