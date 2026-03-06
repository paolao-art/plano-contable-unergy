import Head from "next/head";
import { Menu, Zap } from "lucide-react";
import { Geist, Geist_Mono } from "next/font/google";
import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToFirstScrollableAncestor } from "@dnd-kit/modifiers";

import Sidebar from "@/components/Sidebar";
import ProjectSummary from "@/components/ProjectSummary";
import MonthlyStats from "@/components/MonthlyStats";
import TransactionsTable from "@/components/TransactionsTable";
import DashboardHeader from "@/components/DashboardHeader";
import FilterToolbar from "@/components/FilterToolbar";
import SheetStatus from "@/components/SheetStatus";
import { SheetDataProvider } from "@/context/SheetContext";
import SortableItem from "@/components/Draggable";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const DEFAULT_ORDER = ["project-summary", "monthly-stats", "transactions-table"];

export default function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [items, setItems] = useState<string[]>(DEFAULT_ORDER);
  const [isMounted, setIsMounted] = useState(false);

  // Load order on mount
  useEffect(() => {
    const savedOrder = localStorage.getItem("dashboard-order");
    if (savedOrder) {
      setItems(JSON.parse(savedOrder));
    }
    setIsMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((prevItems) => {
        const oldIndex = prevItems.indexOf(active.id as string);
        const newIndex = prevItems.indexOf(over.id as string);
        const newOrder = arrayMove(prevItems, oldIndex, newIndex);
        localStorage.setItem("dashboard-order", JSON.stringify(newOrder));
        return newOrder;
      });
    }
  };

  const renderComponent = (id: string) => {
    switch (id) {
      case "project-summary":
        return <ProjectSummary />;
      case "monthly-stats":
        return <MonthlyStats />;
      case "transactions-table":
        return <TransactionsTable />;
      default:
        return null;
    }
  };

  if (!isMounted) return null;

  return (
    <SheetDataProvider>
      <div className={`${geistSans.className} ${geistMono.className} relative min-h-screen bg-[#FDFAF7] dark:bg-black text-zinc-900 dark:text-zinc-100 transition-colors overflow-hidden`}>
        {/* Decorative background blobs */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[#915BD8]/30 blur-3xl dark:bg-[#915BD8]/15" />
          <div className="absolute -bottom-40 -right-40 w-[550px] h-[550px] rounded-full bg-[#F6FF72]/40 blur-3xl dark:bg-[#F6FF72]/10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] rounded-full bg-[#915BD8]/15 blur-3xl dark:bg-[#915BD8]/8" />
          <div className="absolute top-1/4 right-0 w-[300px] h-[300px] rounded-full bg-[#F6FF72]/25 blur-2xl dark:bg-[#F6FF72]/5" />
        </div>
        <Head>
          <title>Panel Contable - Unergy</title>
        </Head>

        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

        <main className="relative z-10 lg:pl-64 transition-all duration-300">
          <div className="lg:hidden flex items-center justify-between p-4 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border-b border-white/40 dark:border-zinc-800/50 sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <div className="bg-[#915BD8] p-1.5 rounded-xl text-white shadow-md">
                <Zap className="w-4 h-4 fill-current" />
              </div>
              <span className="text-lg font-bold tracking-tight">Unergy</span>
            </div>
            <button 
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <DashboardHeader />
              <FilterToolbar />
            </div>

            <SheetStatus />

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToFirstScrollableAncestor]}
            >
              <SortableContext items={items} strategy={verticalListSortingStrategy}>
                <div className="space-y-6 flex flex-col">
                  {items.map((id) => (
                    <SortableItem key={id} id={id}>
                      {renderComponent(id)}
                    </SortableItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </main>
      </div>
    </SheetDataProvider>
  );
}
