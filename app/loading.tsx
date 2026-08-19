import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function HomeLoading() {
  return (
    <div className="animate-fade-in">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Skeleton className="h-8 w-28" />
        <div className="hidden gap-8 md:flex">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      <div className="mx-auto max-w-5xl px-4 py-24 text-center sm:px-6 sm:py-32">
        <Skeleton className="mx-auto mb-6 h-7 w-64 rounded-full" />
        <Skeleton className="mx-auto mb-3 h-10 w-full max-w-xl" />
        <Skeleton className="mx-auto mb-8 h-10 w-2/3 max-w-md" />
        <Skeleton className="mx-auto h-5 w-full max-w-lg" />
        <div className="mt-10 flex items-center justify-center gap-3">
          <Skeleton className="h-12 w-40 rounded-md" />
          <Skeleton className="h-12 w-40 rounded-md" />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Skeleton className="mb-8 h-7 w-48" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}
