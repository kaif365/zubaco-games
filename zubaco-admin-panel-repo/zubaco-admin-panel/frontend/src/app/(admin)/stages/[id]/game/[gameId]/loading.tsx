import { Skeleton } from "@/components/ui/skeleton";

export default function StageGameDetailLoading() {
  return (
    <div className="space-y-5 px-6 py-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-8 w-72" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-36 w-full lg:col-span-2" />
        <Skeleton className="h-36 w-full" />
      </div>
      <Skeleton className="h-[360px] w-full" />
    </div>
  );
}
