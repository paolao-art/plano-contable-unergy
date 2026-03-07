import { SunMedium } from "lucide-react";

export default function DashboardHeader() {
  return (
    <header className="space-y-1">
      <div className="relative inline-block">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          Sun Money
        </h1>
        <SunMedium
          className="absolute -top-3 left-[2.85rem] text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.9)]"
          style={{ width: 26, height: 26 }}
          strokeWidth={2}
        />
      </div>
    </header>
  );
}
