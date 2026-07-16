import { Skeleton } from "@/components/ui/skeleton";

export function WorkListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border p-4 space-y-3">
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}
