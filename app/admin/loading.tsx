import { Skeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";

export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-3xl animate-fade-in px-4 py-12">
      <Skeleton className="mb-8 h-7 w-24" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <Skeleton className="mb-2 h-3.5 w-40" />
            <Skeleton className="h-8 w-10" />
          </Card>
        ))}
      </div>
    </div>
  );
}
