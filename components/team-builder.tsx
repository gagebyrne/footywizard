'use client';

import { useState, useMemo, useTransition } from 'react';
import type { Player, Team } from '@/lib/types/fpl';
import { cn, normalizeStr } from '@/lib/utils';
import { saveSquad } from '@/app/team/actions';
import { StatusBadge } from './status-badge';

// ── Constants ────────────────────────────────────────────────────────────────

const POS_NAMES: Record<number, string> = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };
const POS_LIMITS: Record<number, number> = { 1: 2, 2: 5, 3: 5, 4: 3 };
const POS_COLORS: Record<number, { badge: string; row: string }> = {
  1: { badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40', row: 'border-l-yellow-500' },
  2: { badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40', row: 'border-l-blue-500' },
  3: { badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', row: 'border-l-emerald-500' },
  4: { badge: 'bg-red-500/20 text-red-300 border-red-500/40', row: 'border-l-red-500' },
};
const MAX_PER_TEAM = 3;
const TOTAL_PLAYERS = 15;

const PRICE_OPTIONS = [
  { label: 'Any price', value: 0 },
  { label: 'Max £5.0m', value: 50 },
  { label: 'Max £6.0m', value: 60 },
  { label: 'Max £7.0m', value: 70 },
  { label: 'Max £8.0m', value: 80 },
  { label: 'Max £9.0m', value: 90 },
  { label: 'Max £10.0m', value: 100 },
  { label: 'Max £12.0m', value: 120 },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface TeamBuilderProps {
  allPlayers: Player[];
  teams: Team[];
  initialSquadIds: number[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TeamBuilder({ allPlayers, teams, initialSquadIds }: TeamBuilderProps) {
  const playerById = useMemo(() => new Map(allPlayers.map((p) => [p.id, p])), [allPlayers]);
  const teamShortName = useMemo(
    () => new Map(teams.map((t) => [t.id, t.short_name])),
    [teams]
  );
  const sortedTeamNames = useMemo(
    () => [...new Set(teams.map((t) => t.short_name))].sort(),
    [teams]
  );

  const [squad, setSquad] = useState<Player[]>(() =>
    initialSquadIds.flatMap((id) => {
      const p = playerById.get(id);
      return p ? [p] : [];
    })
  );
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState<number>(0);
  const [teamFilter, setTeamFilter] = useState('');
  const [maxPrice, setMaxPrice] = useState(0);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'pick' | 'squad'>('pick');
  const [isPending, startTransition] = useTransition();

  // ── Derived state ──────────────────────────────────────────────────────────

  const squadIds = useMemo(() => new Set(squad.map((p) => p.id)), [squad]);

  const posCounts = useMemo(() => {
    const c: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const p of squad) c[p.element_type] = (c[p.element_type] ?? 0) + 1;
    return c;
  }, [squad]);

  const teamCounts = useMemo(() => {
    const c: Record<number, number> = {};
    for (const p of squad) c[p.team] = (c[p.team] ?? 0) + 1;
    return c;
  }, [squad]);

  const totalCost = useMemo(
    () => squad.reduce((sum, p) => sum + p.now_cost, 0),
    [squad]
  );

  const isComplete = squad.length === TOTAL_PLAYERS;

  const filteredPlayers = useMemo(() => {
    const q = normalizeStr(search);
    return allPlayers
      .filter((p) => !squadIds.has(p.id))
      .filter((p) => posFilter === 0 || p.element_type === posFilter)
      .filter((p) => !teamFilter || teamShortName.get(p.team) === teamFilter)
      .filter((p) => maxPrice === 0 || p.now_cost <= maxPrice)
      .filter((p) => !availableOnly || p.status === 'a')
      .filter(
        (p) =>
          !q ||
          normalizeStr(p.web_name).includes(q) ||
          normalizeStr((p as unknown as { second_name?: string }).second_name ?? '').includes(q) ||
          normalizeStr((p as unknown as { first_name?: string }).first_name ?? '').includes(q)
      )
      .sort((a, b) => {
        const xp = (p: Player) =>
          parseFloat(p.form || '0') * 0.6 +
          parseFloat(p.points_per_game || '0') * 0.4;
        return xp(b) - xp(a);
      })
      .slice(0, 60);
  }, [allPlayers, squadIds, posFilter, teamFilter, maxPrice, availableOnly, search, teamShortName]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function blockReason(player: Player): string | null {
    if (squadIds.has(player.id)) return 'Already in squad';
    if (squad.length >= TOTAL_PLAYERS) return 'Squad is full';
    const pc = posCounts[player.element_type] ?? 0;
    if (pc >= POS_LIMITS[player.element_type]) return `${POS_NAMES[player.element_type]} slots full`;
    if ((teamCounts[player.team] ?? 0) >= MAX_PER_TEAM) return 'Max 3 per team';
    return null;
  }

  function addPlayer(player: Player) {
    const reason = blockReason(player);
    if (reason) { setError(reason); return; }
    setSquad((prev) => [...prev, player]);
    setError(null);
  }

  function removePlayer(id: number) {
    setSquad((prev) => prev.filter((p) => p.id !== id));
    setError(null);
  }

  function handleSave() {
    if (!isComplete) { setError('Select all 15 players before saving.'); return; }
    setError(null);
    startTransition(async () => {
      const result = await saveSquad(squad.map((p) => p.id));
      if (result?.error) setError(result.error);
    });
  }

  // ── Sub-renders ────────────────────────────────────────────────────────────

  const PlayerListPanel = (
    <div className="flex flex-col h-full min-h-0">
      {/* Search */}
      <div className="p-4 border-b border-white/10 space-y-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search players…"
          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-colors"
        />

        {/* Position pills */}
        <div className="flex gap-1.5 flex-wrap">
          {([0, 1, 2, 3, 4] as const).map((pos) => (
            <button
              key={pos}
              onClick={() => setPosFilter(pos)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-semibold border transition-colors',
                posFilter === pos
                  ? pos === 0
                    ? 'bg-white/20 border-white/40 text-white'
                    : POS_COLORS[pos].badge + ' border-opacity-100'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              )}
            >
              {pos === 0 ? 'All' : POS_NAMES[pos]}
            </button>
          ))}
        </div>

        {/* Team + Price dropdowns */}
        <div className="flex gap-2">
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            <option value="">All teams</option>
            {sortedTeamNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <select
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            {PRICE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
          <div
            role="switch"
            aria-checked={availableOnly}
            onClick={() => setAvailableOnly((v) => !v)}
            className={cn(
              'relative w-8 h-4 rounded-full border transition-colors',
              availableOnly
                ? 'bg-emerald-500/40 border-emerald-500/60'
                : 'bg-white/5 border-white/10'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform',
                availableOnly ? 'bg-emerald-400 translate-x-4' : 'bg-slate-500'
              )}
            />
          </div>
          <span className="text-xs text-slate-300">Available only</span>
        </label>
      </div>

      {/* Player list */}
      <div className="overflow-y-auto flex-1">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm">
            <tr className="border-b border-white/10">
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Player</th>
              <th className="px-2 py-2 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">Price</th>
              <th className="px-2 py-2 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">xP</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.map((player) => {
              const reason = blockReason(player);
              const xp = (
                parseFloat(player.form || '0') * 0.6 +
                parseFloat(player.points_per_game || '0') * 0.4
              ).toFixed(1);
              const colors = POS_COLORS[player.element_type];

              return (
                <tr
                  key={player.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-block w-7 text-center rounded text-[10px] font-bold border py-0.5',
                          colors.badge
                        )}
                      >
                        {POS_NAMES[player.element_type]}
                      </span>
                      <div>
                        <p className="font-medium text-white text-xs leading-tight flex items-center gap-1">
                          {player.web_name}
                          <StatusBadge status={player.status} inline />
                        </p>
                        <p className="text-[10px] text-slate-400">{teamShortName.get(player.team)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-right text-xs text-amber-400 font-semibold tabular-nums">
                    £{(player.now_cost / 10).toFixed(1)}m
                  </td>
                  <td className="px-2 py-2.5 text-right text-xs text-emerald-400 tabular-nums">
                    {xp}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => addPlayer(player)}
                      disabled={reason !== null}
                      title={reason ?? 'Add to squad'}
                      className={cn(
                        'w-7 h-7 rounded-full text-sm font-bold transition-all',
                        reason === null
                          ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/40 border border-emerald-500/40'
                          : 'bg-white/5 text-slate-600 border border-white/10 cursor-not-allowed'
                      )}
                    >
                      +
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredPlayers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">
                  No players match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const SquadPanel = (
    <div className="flex flex-col h-full min-h-0">
      {/* Summary bar */}
      <div className="p-4 border-b border-white/10 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">
            Your Squad{' '}
            <span className={cn('font-black', isComplete ? 'text-emerald-400' : 'text-slate-400')}>
              {squad.length}/{TOTAL_PLAYERS}
            </span>
          </span>
          <span className="text-xs text-amber-400 font-semibold">
            £{(totalCost / 10).toFixed(1)}m
          </span>
        </div>
        {/* Position counts */}
        <div className="flex gap-3 text-xs">
          {([1, 2, 3, 4] as const).map((pos) => (
            <span
              key={pos}
              className={cn(
                'font-semibold',
                (posCounts[pos] ?? 0) >= POS_LIMITS[pos] ? 'text-emerald-400' : 'text-slate-400'
              )}
            >
              {POS_NAMES[pos]} {posCounts[pos] ?? 0}/{POS_LIMITS[pos]}
            </span>
          ))}
        </div>
      </div>

      {/* Slot groups */}
      <div className="overflow-y-auto flex-1 p-4 space-y-4">
        {([1, 2, 3, 4] as const).map((pos) => {
          const posPlayers = squad.filter((p) => p.element_type === pos);
          const limit = POS_LIMITS[pos];
          const colors = POS_COLORS[pos];

          return (
            <div key={pos}>
              <p className={cn('text-[10px] font-bold uppercase tracking-widest mb-1.5', colors.badge.split(' ')[1])}>
                {POS_NAMES[pos]}
              </p>
              <div className="space-y-1.5">
                {posPlayers.map((player) => (
                  <div
                    key={player.id}
                    className={cn(
                      'flex items-center justify-between rounded-lg bg-white/5 border-l-2 px-3 py-2',
                      colors.row
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{player.web_name}</p>
                        <p className="text-[10px] text-slate-400">
                          {teamShortName.get(player.team)} · £{(player.now_cost / 10).toFixed(1)}m
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removePlayer(player.id)}
                      className="ml-2 w-6 h-6 rounded-full bg-white/5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 border border-white/10 hover:border-red-500/40 text-xs font-bold transition-colors flex-shrink-0"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {/* Empty slots */}
                {Array.from({ length: limit - posPlayers.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="flex items-center rounded-lg border border-dashed border-white/10 px-3 py-2 text-xs text-slate-600"
                  >
                    + Add {POS_NAMES[pos].toLowerCase()}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Error + Save */}
      <div className="p-4 border-t border-white/10 space-y-3">
        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={!isComplete || isPending}
          className={cn(
            'w-full py-3 rounded-xl font-bold text-sm transition-all',
            isComplete && !isPending
              ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20'
              : 'bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed'
          )}
        >
          {isPending ? 'Saving…' : isComplete ? 'Save Squad' : `${TOTAL_PLAYERS - squad.length} players remaining`}
        </button>
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-[calc(100vh-57px)] flex flex-col">

      {/* Mobile tab bar */}
      <div className="lg:hidden flex border-b border-white/10">
        {(['pick', 'squad'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={cn(
              'flex-1 py-3 text-sm font-semibold transition-colors',
              mobileTab === tab
                ? 'text-white border-b-2 border-emerald-400'
                : 'text-slate-400 hover:text-white'
            )}
          >
            {tab === 'pick' ? 'Pick Players' : `My Squad (${squad.length}/${TOTAL_PLAYERS})`}
          </button>
        ))}
      </div>

      {/* Desktop: two columns. Mobile: one panel at a time. */}
      <div className="flex-1 min-h-0 flex">
        {/* Left: player list */}
        <div
          className={cn(
            'lg:w-1/2 border-r border-white/10 flex flex-col min-h-0',
            mobileTab === 'pick' ? 'flex w-full' : 'hidden lg:flex'
          )}
        >
          {PlayerListPanel}
        </div>

        {/* Right: squad */}
        <div
          className={cn(
            'lg:w-1/2 flex flex-col min-h-0',
            mobileTab === 'squad' ? 'flex w-full' : 'hidden lg:flex'
          )}
        >
          {SquadPanel}
        </div>
      </div>
    </div>
  );
}
