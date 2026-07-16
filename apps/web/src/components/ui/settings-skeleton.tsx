import { Skeleton } from "@/components/ui/skeleton";

export function SettingsSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-border p-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-9 w-24" />
        </div>
      ))}
    </div>
  );
}
