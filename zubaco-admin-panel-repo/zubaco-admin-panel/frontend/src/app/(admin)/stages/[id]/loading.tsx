import { Skeleton } from "@/components/ui/skeleton";

export default function StageDetailLoading() {
  return (
    <div className="space-y-4 px-6 py-4">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-[440px] w-full" />
    </div>
  );
}
