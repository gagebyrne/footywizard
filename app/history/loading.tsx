export default function HistoryLoading() {
  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] px-6 sm:px-10 lg:px-14 py-7">
      <div className="max-w-[1200px] mx-auto space-y-8">
        <div
          className="py-5"
          style={{ borderTop: '3px solid var(--ink)', borderBottom: '1px solid var(--ink)' }}
        >
          <div
            className="h-3 w-64 animate-pulse"
            style={{ background: 'var(--paper-lo)' }}
          />
          <div
            className="h-12 w-[420px] max-w-full animate-pulse mt-3.5"
            style={{ background: 'var(--paper-lo)' }}
          />
        </div>

        <div
          className="grid grid-cols-1 sm:grid-cols-3"
          style={{ borderTop: '1px solid var(--ink)', borderBottom: '1px solid var(--ink)' }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="px-5 py-7"
              style={{ borderRight: i < 2 ? '1px solid var(--paper-lo)' : 'none' }}
            >
              <div
                className="h-3 w-32 animate-pulse"
                style={{ background: 'var(--paper-lo)' }}
              />
              <div
                className="h-10 w-24 animate-pulse mt-2"
                style={{ background: 'var(--paper-lo)' }}
              />
              <div
                className="h-3 w-40 animate-pulse mt-2"
                style={{ background: 'var(--paper-lo)' }}
              />
            </div>
          ))}
        </div>

        <div
          className="p-6"
          style={{ background: 'var(--paper-hi)', border: '2px solid var(--ink)' }}
        >
          <div
            className="h-4 w-48 animate-pulse mb-4"
            style={{ background: 'var(--paper-lo)' }}
          />
          <div
            className="h-[280px] w-full animate-pulse"
            style={{ background: 'var(--paper-lo)' }}
          />
        </div>
      </div>
    </div>
  );
}
