import { Skeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";

export default function ReviewQueueLoading() {
  return (
    <div className="mx-auto max-w-3xl animate-fade-in px-4 py-12">
      <Skeleton className="mb-8 h-7 w-40" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="flex items-center justify-between">
            <div className="flex-1">
              <Skeleton className="mb-2 h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}
