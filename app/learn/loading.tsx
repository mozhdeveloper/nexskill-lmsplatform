import { Skeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";

export default function LearnLoading() {
  return (
    <div className="mx-auto max-w-4xl animate-fade-in px-4 py-12">
      <div className="mb-10">
        <Skeleton className="mb-2 h-7 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <Skeleton className="mb-3 h-3.5 w-32" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <Skeleton className="h-5 w-3/4" />
        </Card>
        <Card>
          <Skeleton className="h-5 w-2/3" />
        </Card>
      </div>
    </div>
  );
}
