import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
}

export default function SortableItem({ id, children }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group w-full"
    >
      {/* Handle de Arrastre */}
      <div 
        {...attributes}
        {...listeners}
        className="absolute top-3 right-3 p-1.5 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing bg-white/20 dark:bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 transition-all z-50 hover:scale-110"
        title="Reordenar sección"
      >
        <GripVertical className="w-4 h-4 text-zinc-400" />
      </div>
      
      {children}
    </div>
  );
}
