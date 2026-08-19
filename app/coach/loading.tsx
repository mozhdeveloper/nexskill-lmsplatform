import { Skeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";

export default function CoachDashboardLoading() {
  return (
    <div className="mx-auto max-w-4xl animate-fade-in px-4 py-12">
      <Skeleton className="mb-8 h-7 w-48" />
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <Skeleton className="mb-2 h-3.5 w-32" />
            <Skeleton className="h-8 w-12" />
          </Card>
        ))}
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}
