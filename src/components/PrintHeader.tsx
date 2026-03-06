/**
 * Visible only in print / PDF — never rendered on screen.
 * Shows Unergy branding, applied filters and generation timestamp.
 */
import Image from "next/image";
import logo from "../../public/logo.png";
import { useSheet } from "@/context/SheetContext";

export default function PrintHeader() {
  const { selectedInvestor, selectedMonths, selectedProjects } = useSheet();

  const periodo =
    selectedMonths.length === 1
      ? selectedMonths[0]
      : `${selectedMonths[0]} – ${selectedMonths[selectedMonths.length - 1]}`;

  const proyecto =
    selectedProjects.length === 0
      ? "Consolidado"
      : selectedProjects.join(", ");

  const now = new Date();
  const fecha = now.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const hora = now.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="hidden print:block mb-6">
      {/* Top row: logo + title + date */}
      <div className="flex items-center justify-between pb-3 border-b-2 border-[#915BD8]">
        <div className="flex items-center gap-3">
          <Image src={logo} alt="Unergy" width={36} height={36} />
          <div>
            <p className="text-xl font-black text-[#915BD8] leading-none">Unergy</p>
            <p className="text-[10px] font-semibold text-zinc-500 leading-none mt-0.5">
              Energía Digital S.A.S E.S.P
            </p>
            <p className="text-[9px] font-medium text-zinc-400 leading-none mt-0.5">
              Sun Money
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-zinc-700">{fecha}</p>
          <p className="text-[10px] text-zinc-400">{hora}</p>
        </div>
      </div>

      {/* Filter summary row */}
      <div className="flex items-center gap-6 mt-3">
        <FilterPill label="Inversionista" value={selectedInvestor} />
        <FilterPill label="Periodo" value={`${periodo} ${now.getFullYear()}`} />
        <FilterPill label="Proyecto" value={proyecto} />
      </div>
    </div>
  );
}

function FilterPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
        {label}
      </span>
      <span className="text-xs font-bold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded">
        {value}
      </span>
    </div>
  );
}
