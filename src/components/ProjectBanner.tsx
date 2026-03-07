import { MapPin } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useSheet } from "@/context/SheetContext";
import { useProjectImages, projectImageUrl } from "@/hooks/useProjectImages";

function ProjectCard({ name, fileId }: { name: string; fileId: string }) {
  const [error, setError] = useState(false);
  if (error) return null;

  return (
    <div className="relative flex-1 min-w-0 rounded-2xl overflow-hidden shadow-md border border-white/20 dark:border-zinc-800/50" style={{ minHeight: "200px" }}>
      <Image
        src={projectImageUrl(fileId)}
        alt={name}
        fill
        className="object-cover"
        onError={() => setError(true)}
        unoptimized
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 px-4 py-3.5">
        <div className="flex items-center gap-1.5">
          <div className="p-1 bg-white/20 backdrop-blur-sm rounded-md shrink-0">
            <MapPin className="w-3 h-3 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[8px] font-black uppercase tracking-widest text-white/60 leading-none mb-0.5">
              Proyecto
            </p>
            <h3 className="text-sm font-black text-white tracking-tight leading-tight truncate">
              {name}
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectBanner() {
  const { selectedProjects } = useSheet();
  const { images, loading } = useProjectImages();

  if (selectedProjects.length === 0) return null;

  // Only show projects that have an image
  const projectsWithImages = selectedProjects.filter((p) => images[p]);

  if (loading) {
    return (
      <div className="flex gap-3">
        {selectedProjects.map((p) => (
          <div key={p} className="flex-1 h-52 bg-white/30 dark:bg-zinc-900/30 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (projectsWithImages.length === 0) return null;

  // Single project: tall banner. Multiple: side-by-side cards
  const isSingle = projectsWithImages.length === 1;

  return (
    <div
      className={`flex gap-3 ${isSingle ? "h-52 sm:h-64" : projectsWithImages.length >= 4 ? "flex-wrap" : ""}`}
      style={!isSingle ? { minHeight: "200px" } : undefined}
    >
      {projectsWithImages.map((name) => (
        <ProjectCard key={name} name={name} fileId={images[name]} />
      ))}
    </div>
  );
}
