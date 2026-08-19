import { Skeleton } from "@/components/ui/Skeleton";

export default function LessonLoading() {
  return (
    <div className="flex min-h-[calc(100vh-57px)] animate-fade-in">
      <div className="w-full shrink-0 border-r border-border bg-surface p-4 lg:w-72">
        <Skeleton className="mb-1 h-3 w-32" />
        <Skeleton className="mb-4 h-1.5 w-full rounded-full" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="mb-2 h-4 w-3/4" />
              <div className="ml-2 space-y-2 border-l border-border pl-3">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 p-8">
        <Skeleton className="mb-4 h-7 w-64" />
        <Skeleton className="mb-6 h-40 w-full rounded-xl" />
        <Skeleton className="h-10 w-40 rounded-md" />
      </div>
    </div>
  );
}
