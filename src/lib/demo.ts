/** Akun demo yang ditampilkan di layar login & menu "Ganti akun demo". Password: relay123 */
export const DEMO_ACCOUNTS = [
  { username: "admin", name: "Rina Kusuma", label: "Admin · semua crew", role: "admin" },
  { username: "spv.budi", name: "Budi Santoso", label: "Supervisor · Crew A (Troubleshoot)", role: "supervisor" },
  { username: "spv.sari", name: "Sari Wulandari", label: "Supervisor · Crew B (Maintenance)", role: "supervisor" },
  { username: "tek.andi", name: "Andi Pratama", label: "Teknisi · Crew A", role: "technician" },
  { username: "tek.gilang", name: "Gilang Ramadhan", label: "Teknisi · Crew B", role: "technician" },
] as const;
