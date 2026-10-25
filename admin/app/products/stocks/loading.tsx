import Skeleton from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="ak-card space-y-2 p-4">
        {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
      </div>
    </div>
  );
}
