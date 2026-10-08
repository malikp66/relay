import { requireUser } from "@/server/auth";
import { masterData } from "@/server/queries";
import { MasterCrud } from "@/components/relay/master-crud";

export const metadata = { title: "Lokasi & pelanggan" };

export default async function LocationsPage() {
  await requireUser(["admin"]);
  const md = await masterData();
  const custName = (id: unknown) => md.customers.find((c) => c.id === id)?.name;
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <MasterCrud
        kind="sites"
        title="Lokasi / site"
        searchable
        rows={md.sites.map((r) => ({ ...r, customerId: r.customerId ?? "", _primary: r.name, _secondary: `${custName(r.customerId) ? `${custName(r.customerId)} · ` : "Infrastruktur · "}${r.address} · radius ${r.radiusM} m` }))}
        fields={[
          { key: "name", label: "Nama lokasi", placeholder: "mis. ODC Cibubur-03 atau Rumah Ahmad Fauzi" },
          { key: "customerId", label: "Pelanggan", type: "select", emptyLabel: "Infrastruktur (bukan pelanggan)", placeholder: "Pilih pelanggan", options: md.customers.map((c) => ({ id: c.id, name: c.name })), hint: "Kosongkan untuk ODC, BTS, headend, dan aset lain." },
          { key: "point", label: "Titik di peta", type: "location", hint: "Dipakai untuk memastikan teknisi benar-benar di lokasi saat check-in." },
          { key: "address", label: "Alamat", type: "textarea", placeholder: "Terisi otomatis dari peta, bisa diubah" },
          { key: "radiusM", label: "Radius check-in", type: "number", suffix: "meter", defaultValue: 200, half: true, hint: "Umumnya 100 sampai 300 m. Terlihat sebagai lingkaran di peta." },
        ]}
      />
      <MasterCrud
        kind="customers"
        title="Pelanggan"
        searchable
        rows={md.customers.map((r) => ({ ...r, _primary: r.name, _secondary: `${r.customerNo} · ${r.service ?? ""}` }))}
        fields={[
          { key: "name", label: "Nama pelanggan", placeholder: "Nama orang atau perusahaan" },
          { key: "customerNo", label: "No. pelanggan", half: true, placeholder: "mis. CUST-00123" },
          { key: "phone", label: "No. HP", half: true, optional: true, inputMode: "tel", placeholder: "08xx-xxxx-xxxx" },
          { key: "service", label: "Layanan", optional: true, placeholder: "mis. Internet 50 Mbps" },
          { key: "address", label: "Alamat", type: "textarea", optional: true },
        ]}
      />
    </div>
  );
}
