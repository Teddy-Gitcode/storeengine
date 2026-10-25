import Skeleton from '@/components/Skeleton';

/* Every page in this admin is force-dynamic and fetches on the server, so a
   slow API used to mean a blank frame for as long as it took. There was no
   loading.tsx anywhere in the app and Skeleton.tsx was written but unused. */
export default function Loading() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="ak-card space-y-3 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    </div>
  );
}
