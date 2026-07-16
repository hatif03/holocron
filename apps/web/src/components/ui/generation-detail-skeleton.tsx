import { Skeleton } from "@/components/ui/skeleton";

export function GenerationDetailSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-4 pt-4 sm:px-6">
        <div className="flex items-start gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-3/4 max-w-md" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-9 w-24 hidden sm:block" />
        </div>
      </div>
      <div className="shrink-0 px-4 py-3 sm:px-6">
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <div className="grid min-h-0 flex-1 gap-4 px-4 pb-4 sm:px-6 lg:grid-cols-[1fr_1fr_1.2fr]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex h-full min-h-[200px] flex-col rounded-xl border border-border p-4 lg:min-h-0">
            <Skeleton className="mb-3 h-4 w-24" />
            <div className="min-h-0 flex-1 space-y-2">
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={j} className="h-12 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
