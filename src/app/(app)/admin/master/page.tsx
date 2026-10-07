import { masterData } from "@/server/queries";
import { MasterCrud } from "@/components/relay/master-crud";

export const metadata = { title: "Referensi" };

export default async function MasterPage() {
  const md = await masterData();
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <MasterCrud
        kind="categories"
        title="Kategori"
        rows={md.categories.map((r) => ({ ...r, _primary: `${r.name} (${r.code})`, _secondary: `${r.isScheduled ? "Terjadwal" : "Reaktif"} · ${r.description ?? ""}` }))}
        fields={[
          { key: "name", label: "Nama", half: true },
          { key: "code", label: "Kode", half: true, placeholder: "TS" },
          { key: "isScheduled", label: "Pekerjaan terjadwal (maintenance)", type: "checkbox" },
          { key: "description", label: "Deskripsi", type: "textarea" },
        ]}
      />
      <MasterCrud kind="products" title="Produk" rows={md.products.map((r) => ({ ...r, _primary: r.name, _secondary: `Kode ${r.code}` }))} fields={[{ key: "name", label: "Nama", half: true }, { key: "code", label: "Kode", half: true }]} />
      <MasterCrud
        kind="priorities"
        title="Prioritas & SLA"
        rows={md.priorities.map((r) => ({ ...r, _primary: r.name, _secondary: `Level ${r.level} · SLA ${r.slaHours >= 24 ? `${r.slaHours / 24} hari` : `${r.slaHours} jam`}` }))}
        fields={[
          { key: "name", label: "Nama" },
          { key: "level", label: "Level (1 sampai 4)", type: "number", half: true },
          { key: "slaHours", label: "SLA (jam)", type: "number", half: true },
        ]}
      />
    </div>
  );
}
