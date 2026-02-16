export default function LoadingScreen({ type = "full" }) {
  if (type === "full") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-100 via-pink-100 to-sky-100">
        <div className="text-center">
          <div className="inline-flex h-16 w-16 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
          <p className="mt-4 text-sm font-medium text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (type === "portal") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-sky-100">
        <header className="sticky top-0 z-20 border-b border-white/50 bg-white/40 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/alora.png" alt="Alora Group Indonesia" className="h-16 lg:h-20" />
                <div>
                  <div className="h-5 w-48 animate-pulse rounded bg-white/70" />
                  <div className="mt-1 h-3 w-36 animate-pulse rounded bg-white/60" />
                </div>
              </div>
              <div className="h-11 w-11 animate-pulse rounded-full bg-white/70" />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
          <div className="rounded-3xl border border-white/60 bg-white/40 p-6 backdrop-blur-xl shadow-xl">
            <div className="h-12 w-full animate-pulse rounded-2xl bg-white/70 mb-4" />
            <div className="flex gap-3">
              <div className="h-9 w-24 animate-pulse rounded-full bg-white/70" />
              <div className="h-9 w-24 animate-pulse rounded-full bg-white/70" />
              <div className="h-9 w-24 animate-pulse rounded-full bg-white/70" />
            </div>
          </div>
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mt-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-3xl border border-white/60 bg-white/50 p-6 backdrop-blur-xl shadow-lg">
                <div className="h-14 w-14 animate-pulse rounded-2xl bg-white/70 mb-4" />
                <div className="h-5 w-32 animate-pulse rounded bg-white/70 mb-2" />
                <div className="h-4 w-full animate-pulse rounded bg-white/60" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (type === "profile" || type === "form") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-sky-100">
        <header className="sticky top-0 z-20 border-b border-white/50 bg-white/40 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="h-8 w-32 animate-pulse rounded bg-white/70" />
              <div className="h-10 w-24 animate-pulse rounded-xl bg-white/70" />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-10">
          <div className="mb-6 rounded-3xl border border-white/60 bg-white/50 p-6 backdrop-blur-xl shadow-lg">
            <div className="h-6 w-48 animate-pulse rounded bg-white/70 mb-3" />
            <div className="h-4 w-full animate-pulse rounded bg-white/60 mb-2" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-white/60" />
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="mb-6 rounded-3xl border border-white/60 bg-white/50 p-6 backdrop-blur-xl shadow-lg">
              <div className="h-5 w-40 animate-pulse rounded bg-white/70 mb-4" />
              <div className="space-y-4">
                <div className="h-12 w-full animate-pulse rounded-2xl bg-white/70" />
                <div className="h-12 w-full animate-pulse rounded-2xl bg-white/70" />
                <div className="h-12 w-full animate-pulse rounded-2xl bg-white/70" />
              </div>
            </div>
          ))}
        </main>
      </div>
    );
  }

  // default: spinner only
  return (
    <div className="flex items-center justify-center p-8">
      <div className="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
    </div>
  );
}