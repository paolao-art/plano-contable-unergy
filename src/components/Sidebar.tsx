import { BarChart2, LayoutDashboard, LogOut, Settings, X } from "lucide-react";
import Image from "next/image";
import logo from "../../public/logo.png";
import React from "react";
import { useRouter } from "next/router";
import { sileo } from "sileo";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const router = useRouter();
  const menuItems = [
    { name: "Inicio", icon: LayoutDashboard, href: "/" },
    { name: "Gráficas", icon: BarChart2, href: "/graficas" },
  ];

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout");
      if (res.ok) {
        sileo.success({ title: "Sesión cerrada", description: "Vuelve pronto." });
        router.push("/login");
      }
    } catch (err) {
      sileo.error({ title: "Error", description: "No se pudo cerrar la sesión." });
    }
  };

  return (
    <>
      {/* Overlay para móviles */}
      {isOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 bg-black/10 z-40 lg:hidden backdrop-blur-sm transition-opacity w-full h-full border-none cursor-default"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container Compacto */}
      <aside className={`
        fixed top-3 left-3 bottom-3 z-50 w-60
        bg-gradient-to-b from-[#915BD8]/10 via-white/80 to-[#F6FF72]/10 dark:from-[#915BD8]/10 dark:via-zinc-900/90 dark:to-zinc-900/80 backdrop-blur-xl
        border border-[#915BD8]/20 dark:border-zinc-800/50 shadow-xl shadow-[#915BD8]/10
        rounded-3xl transform transition-all duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-[110%] lg:translate-x-0"}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo / Header */}
          <div className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image src={logo} alt="Unergy" width={28} height={28} className="rounded-lg shrink-0" />
              <div className="flex flex-col leading-tight">
                <span className="text-base font-black tracking-tight text-[#915BD8] dark:text-[#b07ee8]">
                  Unergy
                </span>
                <span className="text-[8px] font-semibold text-zinc-400 dark:text-zinc-500 tracking-tight leading-none">
                  Energía Digital S.A.S E.S.P
                </span>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setIsOpen(false)}
              className="lg:hidden p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-3 space-y-1 mt-2">
            {menuItems.map((item) => {
              const isActive = router.pathname === item.href;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all
                    ${isActive
                      ? "bg-[#915BD8] text-white shadow-md shadow-[#915BD8]/30 border border-[#915BD8]"
                      : "text-zinc-500 dark:text-zinc-400 hover:bg-white/40 dark:hover:bg-zinc-800/40 hover:text-zinc-900 dark:hover:text-zinc-200"}
                  `}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.name}</span>
                </a>
              );
            })}
          </nav>

          {/* User Profile Mock */}
          <div className="p-3">
            <div className="p-3 bg-white/40 dark:bg-zinc-800/40 border border-white/50 dark:border-zinc-700/50 rounded-2xl backdrop-blur-md">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#915BD8] to-[#6B3DB8] flex items-center justify-center text-white text-xs font-bold shadow-md">
                  JD
                </div>
                <div className="flex-1 overflow-hidden text-left">
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-50 truncate">John Doe</p>
                  <p className="text-[9px] uppercase tracking-tighter font-bold text-zinc-400">Admin</p>
                </div>
              </div>
              
              <div className="flex gap-1.5">
                <button 
                  type="button"
                  className="flex-1 flex items-center justify-center p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-white/80 dark:hover:bg-zinc-800/80 rounded-lg transition-all border border-transparent hover:border-white/50 dark:hover:border-zinc-700/50"
                  title="Ajustes"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
                <button 
                  type="button"
                  onClick={handleLogout}
                  className="flex-1 flex items-center justify-center p-1.5 text-red-500 dark:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
