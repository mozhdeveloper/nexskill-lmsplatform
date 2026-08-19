import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";

export default function CourseLoading() {
  return (
    <div className="animate-fade-in">
      <div className="mx-auto max-w-3xl px-4 pb-6 pt-14 sm:px-6">
        <div className="mb-3 flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="mb-3 h-9 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
      </div>
      <div className="mx-auto grid max-w-3xl grid-cols-1 gap-8 px-4 pb-24 sm:px-6 lg:max-w-5xl lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <SkeletonText lines={3} />
          <Card>
            <Skeleton className="mb-3 h-5 w-1/3" />
            <SkeletonText lines={2} />
          </Card>
          <Card>
            <Skeleton className="mb-3 h-5 w-1/3" />
            <SkeletonText lines={2} />
          </Card>
        </div>
        <Card>
          <Skeleton className="mb-2 h-8 w-20" />
          <Skeleton className="mb-4 h-4 w-32" />
          <Skeleton className="h-10 w-full rounded-md" />
        </Card>
      </div>
    </div>
  );
}
