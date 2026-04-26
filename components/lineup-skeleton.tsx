"use client";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton displayed while optimization API fetches data.
 * Matches FormationPitch dimensions for seamless transition.
 */
export function LineupSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header skeleton */}
        <div className="text-center space-y-4">
          <Skeleton className="h-16 w-32 mx-auto bg-white/10" />
          <Skeleton className="h-6 w-48 mx-auto bg-white/10" />
          <Skeleton className="h-4 w-40 mx-auto bg-white/10" />
        </div>

        {/* Optimizing text */}
        <div className="text-center">
          <p className="text-lg font-medium text-emerald-300 animate-pulse">
            Optimizing lineup...
          </p>
        </div>

        {/* Responsive grid layout matching main page */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formation pitch skeleton - spans 2 columns */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-4">
              {/* Simplified 4-4-2 formation skeleton */}
              <div className="space-y-4">
                {/* Forwards row */}
                <div className="flex justify-center gap-4">
                  {[1, 2].map((i) => (
                    <Skeleton
                      key={`fwd-${i}`}
                      className="w-16 h-20 sm:w-20 sm:h-24 bg-white/10 rounded-lg"
                    />
                  ))}
                </div>

                {/* Midfielders row */}
                <div className="flex justify-center gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton
                      key={`mid-${i}`}
                      className="w-16 h-20 sm:w-20 sm:h-24 bg-white/10 rounded-lg"
                    />
                  ))}
                </div>

                {/* Defenders row */}
                <div className="flex justify-center gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton
                      key={`def-${i}`}
                      className="w-16 h-20 sm:w-20 sm:h-24 bg-white/10 rounded-lg"
                    />
                  ))}
                </div>

                {/* Goalkeeper row */}
                <div className="flex justify-center">
                  <Skeleton className="w-16 h-20 sm:w-20 sm:h-24 bg-white/10 rounded-lg" />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar skeletons */}
          <div className="space-y-6">
            {/* Transfer targets skeleton */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-4">
              <Skeleton className="h-6 w-40 bg-white/10" />
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={`target-${i}`} className="h-12 w-full bg-white/10" />
                ))}
              </div>
            </div>

            {/* Fixture outlook skeleton */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-4">
              <Skeleton className="h-6 w-40 bg-white/10" />
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={`fixture-${i}`} className="h-16 w-full bg-white/10" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
