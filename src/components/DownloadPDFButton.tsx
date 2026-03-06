import { FileDown } from "lucide-react";
import { useState } from "react";

export default function DownloadPDFButton() {
  const [preparing, setPreparing] = useState(false);

  function handlePrint() {
    setPreparing(true);
    // Short delay lets React re-render (hides the button itself) before the
    // print dialog opens, so the button doesn't flash in the PDF.
    setTimeout(() => {
      window.print();
      setPreparing(false);
    }, 120);
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      disabled={preparing}
      data-no-print
      className="
        group flex items-center gap-2 px-4 py-2.5
        bg-gradient-to-br from-[#915BD8] to-[#6B3FAF]
        hover:from-[#a06de0] hover:to-[#7c4fc2]
        active:scale-[0.97]
        text-white text-xs font-black
        rounded-2xl shadow-md shadow-[#915BD8]/30
        transition-all duration-150
        disabled:opacity-60 disabled:cursor-not-allowed
        print:hidden
      "
    >
      <FileDown
        className={`w-3.5 h-3.5 transition-transform duration-300 ${preparing ? "animate-bounce" : "group-hover:-translate-y-0.5"}`}
      />
      {preparing ? "Preparando…" : "Exportar PDF"}
    </button>
  );
}
