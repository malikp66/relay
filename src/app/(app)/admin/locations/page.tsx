import { masterData } from "@/server/queries";
import { MasterCrud } from "@/components/relay/master-crud";

export const metadata = { title: "Lokasi & pelanggan" };

export default async function LocationsPage() {
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
          { key: "name", label: "Nama" },
          { key: "address", label: "Alamat", type: "textarea" },
          { key: "lat", label: "Latitude", type: "number", half: true },
          { key: "lng", label: "Longitude", type: "number", half: true },
          { key: "radiusM", label: "Radius check-in (m)", type: "number", half: true },
          { key: "customerId", label: "Pelanggan (opsional)", type: "select", half: true, options: md.customers.map((c) => ({ id: c.id, name: c.name })) },
        ]}
      />
      <MasterCrud
        kind="customers"
        title="Pelanggan"
        searchable
        rows={md.customers.map((r) => ({ ...r, _primary: r.name, _secondary: `${r.customerNo} · ${r.service ?? ""}` }))}
        fields={[
          { key: "name", label: "Nama" },
          { key: "customerNo", label: "No. pelanggan", half: true },
          { key: "phone", label: "Telepon", half: true },
          { key: "service", label: "Layanan" },
          { key: "address", label: "Alamat", type: "textarea" },
        ]}
      />
    </div>
  );
}
