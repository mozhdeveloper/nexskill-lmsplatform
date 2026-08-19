import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";

export default function CourseBuilderLoading() {
  return (
    <div className="mx-auto max-w-3xl animate-fade-in px-4 py-12">
      <Skeleton className="mb-2 h-7 w-64" />
      <Skeleton className="mb-8 h-4 w-48" />
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <Skeleton className="mb-3 h-5 w-1/3" />
            <SkeletonText lines={2} />
          </Card>
        ))}
      </div>
    </div>
  );
}
