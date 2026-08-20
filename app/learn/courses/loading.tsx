import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function BrowseCoursesLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-fade-in px-4 py-12">
      <Skeleton className="mb-2 h-7 w-32" />
      <Skeleton className="mb-8 h-4 w-64" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
