/**
 * Loading skeleton for history page
 * 
 * Shows while history data is being fetched.
 * Matches the layout structure of the main page with pulsing placeholders.
 */
export default function HistoryLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-10 w-64 bg-white/10 rounded-lg animate-pulse" />
            <div className="h-4 w-48 bg-white/10 rounded animate-pulse" />
          </div>
          <div className="h-10 w-40 bg-white/10 rounded-lg animate-pulse" />
        </div>

        {/* Metrics cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <div className="h-4 w-32 bg-white/10 rounded animate-pulse mb-4" />
              <div className="h-8 w-20 bg-white/10 rounded animate-pulse" />
              <div className="h-3 w-24 bg-white/10 rounded animate-pulse mt-2" />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <div className="h-6 w-48 bg-white/10 rounded animate-pulse mb-2" />
            <div className="h-4 w-40 bg-white/10 rounded animate-pulse" />
          </div>

          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-5 w-12 bg-white/10 rounded animate-pulse" />
                <div className="h-5 w-24 bg-white/10 rounded animate-pulse" />
                <div className="h-5 w-16 bg-white/10 rounded animate-pulse ml-auto" />
                <div className="h-5 w-16 bg-white/10 rounded animate-pulse" />
                <div className="h-5 w-16 bg-white/10 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
