import { Skeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";

export default function VerifyLoading() {
  return (
    <div className="mx-auto max-w-xl animate-fade-in px-4 py-20">
      <div className="mb-6 text-center">
        <Skeleton className="mx-auto h-7 w-56" />
      </div>
      <Card>
        <Skeleton className="mb-4 h-5 w-16 rounded-full" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="mb-1.5 h-3 w-24" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
