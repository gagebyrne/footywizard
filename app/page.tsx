import Image from 'next/image';
import Link from 'next/link';

const features = [
  {
    icon: '⚡',
    title: 'Optimal Lineup',
    description:
      'An integer linear programming solver evaluates every possible combination of your squad and returns the highest-scoring 11 automatically.',
  },
  {
    icon: '📅',
    title: 'Fixture Intelligence',
    description:
      'See difficulty-rated fixtures for the next three gameweeks at a glance. Color-coded badges make it easy to spot who to start and who to bench.',
  },
  {
    icon: '🔄',
    title: 'Transfer Targets',
    description:
      'Data-driven recommendations rank the best available players outside your squad by expected points, so every transfer decision is backed by numbers.',
  },
  {
    icon: '📈',
    title: 'Prediction History',
    description:
      'Track how accurate the algorithm has been over the season. Mean absolute error, captain hit rate, and point correlation — all in one place.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-teal-900 to-slate-900">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <Image src="/wizard-icon.png" alt="FootyWizard" width={32} height={32} unoptimized />
          <span className="font-black text-white text-xl tracking-tight">FootyWizard</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/5"
          >
            Sign In
          </Link>
          <Link
            href="/login"
            className="text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-400 transition-colors px-4 py-2 rounded-lg shadow-lg shadow-emerald-500/20"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-4 pt-20 pb-24 max-w-4xl mx-auto">
        <div className="flex justify-center mb-6">
          <Image
            src="/wizard-icon.png"
            alt=""
            width={96}
            height={96}
            unoptimized
            className="drop-shadow-2xl"
          />
        </div>
        <h1 className="text-6xl sm:text-7xl font-black tracking-tight text-white leading-none mb-3">
          FootyWizard
        </h1>
        <p className="text-2xl sm:text-3xl text-emerald-300 italic font-medium mb-6">
          football made magic
        </p>
        <p className="text-slate-300 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
          Stop guessing your Fantasy Premier League lineup. FootyWizard uses smart optimization
          to pick your best possible squad, surface the easiest fixtures, and tell you exactly
          who to transfer in.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-base transition-colors shadow-2xl shadow-emerald-500/30"
          >
            Get Started Free
          </Link>
          <Link
            href="/login"
            className="px-8 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-base transition-colors border border-white/10 backdrop-blur-sm"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 pb-24 max-w-6xl mx-auto">
        <h2 className="text-center text-3xl font-black text-white mb-12 tracking-tight">
          Everything you need to dominate your league
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-6 space-y-3 hover:bg-white/8 transition-colors"
            >
              <div className="text-3xl">{f.icon}</div>
              <h3 className="font-bold text-white text-lg">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="px-4 pb-24 max-w-3xl mx-auto text-center">
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm p-10 space-y-5">
          <h2 className="text-3xl font-black text-white">Ready to make magic?</h2>
          <p className="text-slate-300">
            Create a free account and get your optimized lineup in seconds.
          </p>
          <Link
            href="/login"
            className="inline-block px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-base transition-colors shadow-2xl shadow-emerald-500/30"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-500">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Image src="/wizard-icon.png" alt="" width={18} height={18} unoptimized />
          <span className="font-bold text-slate-400">FootyWizard</span>
        </div>
        <p>Fantasy Premier League optimization — updated every gameweek.</p>
      </footer>

    </div>
  );
}
