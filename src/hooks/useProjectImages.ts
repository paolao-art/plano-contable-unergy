import { useEffect, useState } from "react";

export type ProjectImages = Record<string, string>; // project name → Drive file ID

// Module-level cache shared across all hook instances
let _cache: ProjectImages | null = null;
let _promise: Promise<ProjectImages> | null = null;

function fetchImages(): Promise<ProjectImages> {
  if (_cache) return Promise.resolve(_cache);
  if (_promise) return _promise;
  _promise = fetch("/api/project-images")
    .then((r) => r.json())
    .then((data) => {
      const imgs: ProjectImages = data.success ? data.images : {};
      _cache = imgs;
      return imgs;
    })
    .catch(() => {
      _promise = null;
      return {};
    });
  return _promise;
}

export function useProjectImages() {
  const [images, setImages] = useState<ProjectImages>(_cache ?? {});
  const [loading, setLoading] = useState(_cache === null);

  useEffect(() => {
    if (_cache !== null) return;
    fetchImages().then((imgs) => {
      setImages(imgs);
      setLoading(false);
    });
  }, []);

  return { images, loading };
}

export function projectImageUrl(fileId: string): string {
  return `/api/drive/image?fileId=${encodeURIComponent(fileId)}`;
}
