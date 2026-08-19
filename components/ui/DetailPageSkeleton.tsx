import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";

export function DetailPageSkeleton({ maxWidth = "max-w-2xl" }: { maxWidth?: string }) {
  return (
    <div className={`mx-auto ${maxWidth} animate-fade-in px-4 py-12`}>
      <Skeleton className="mb-8 h-7 w-56" />
      <Card>
        <SkeletonText lines={4} />
      </Card>
    </div>
  );
}
