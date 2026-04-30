'use client';

import { useState, useMemo, useTransition } from 'react';
import type { Player, Team } from '@/lib/types/fpl';
import { cn, normalizeStr } from '@/lib/utils';
import { saveSquad } from '@/app/team/actions';
import { PlayerPortrait } from './player-portrait';
import { teamColor } from '@/lib/team-colors';

const POS_NAMES: Record<number, string> = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };
const POS_LIMITS: Record<number, number> = { 1: 2, 2: 5, 3: 5, 4: 3 };
const POS_INK: Record<number, string> = {
  1: '#C9A227', // keeper amber
  2: '#1B458F', // defender ink-blue
  3: 'var(--grass)',
  4: 'var(--red-rule)',
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

interface TeamBuilderProps {
  allPlayers: Player[];
  teams: Team[];
  initialSquadIds: number[];
}

function calcXP(p: Player) {
  return parseFloat(p.form || '0') * 0.6 + parseFloat(p.points_per_game || '0') * 0.4;
}

function StatusDot({ status }: { status: string }) {
  if (status === 'a') return null;
  const meta =
    status === 'd'
      ? { label: 'D', title: 'Doubtful', color: '#C9A227' }
      : status === 'i'
        ? { label: 'I', title: 'Injured', color: 'var(--red-rule)' }
        : { label: 'U', title: 'Unavailable', color: 'var(--ink-mute)' };
  return (
    <span
      className="inline-flex items-center justify-center font-mono text-[9px] font-bold tracking-wider"
      style={{
        background: meta.color,
        color: 'var(--captain-ink)',
        width: 16,
        height: 16,
        borderRadius: 0,
      }}
      title={meta.title}
    >
      {meta.label}
    </span>
  );
}

export function TeamBuilder({ allPlayers, teams, initialSquadIds }: TeamBuilderProps) {
  const playerById = useMemo(() => new Map(allPlayers.map((p) => [p.id, p])), [allPlayers]);
  const teamShortName = useMemo(
    () => new Map(teams.map((t) => [t.id, t.short_name])),
    [teams],
  );
  const sortedTeamNames = useMemo(
    () => [...new Set(teams.map((t) => t.short_name))].sort(),
    [teams],
  );

  const [squad, setSquad] = useState<Player[]>(() =>
    initialSquadIds.flatMap((id) => {
      const p = playerById.get(id);
      return p ? [p] : [];
    }),
  );
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState<number>(0);
  const [teamFilter, setTeamFilter] = useState('');
  const [maxPrice, setMaxPrice] = useState(0);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'pick' | 'squad'>('pick');
  const [isPending, startTransition] = useTransition();

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
  const totalCost = useMemo(() => squad.reduce((s, p) => s + p.now_cost, 0), [squad]);
  const isComplete = squad.length === TOTAL_PLAYERS;
  const remaining = 1000 - totalCost; // £100m budget in 0.1m units

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
          normalizeStr((p as unknown as { first_name?: string }).first_name ?? '').includes(q),
      )
      .sort((a, b) => calcXP(b) - calcXP(a))
      .slice(0, 60);
  }, [
    allPlayers,
    squadIds,
    posFilter,
    teamFilter,
    maxPrice,
    availableOnly,
    search,
    teamShortName,
  ]);

  function blockReason(player: Player): string | null {
    if (squadIds.has(player.id)) return 'Already in squad';
    if (squad.length >= TOTAL_PLAYERS) return 'Squad is full';
    const pc = posCounts[player.element_type] ?? 0;
    if (pc >= POS_LIMITS[player.element_type]) return `${POS_NAMES[player.element_type]} slots full`;
    if ((teamCounts[player.team] ?? 0) >= MAX_PER_TEAM) return 'Max 3 per club';
    if (totalCost + player.now_cost > 1000) return 'Over budget';
    return null;
  }

  function addPlayer(player: Player) {
    const reason = blockReason(player);
    if (reason) {
      setError(reason);
      return;
    }
    setSquad((prev) => [...prev, player]);
    setError(null);
  }

  function removePlayer(id: number) {
    setSquad((prev) => prev.filter((p) => p.id !== id));
    setError(null);
  }

  function handleSave() {
    if (!isComplete) {
      setError('Pick all 15 players before saving the team sheet.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveSquad(squad.map((p) => p.id));
      if (result?.error) setError(result.error);
    });
  }

  // ── Subviews ──────────────────────────────────────────────────────────────

  const PlayerListPanel = (
    <div className="flex flex-col h-full min-h-0 bg-[var(--paper)]">
      {/* Filters */}
      <div
        className="p-4 sm:p-5 space-y-3"
        style={{ borderBottom: '1px solid var(--ink)' }}
      >
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-mute)] mb-1.5">
            From the open market
          </p>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search players…"
            className="w-full font-sans text-sm px-3 py-2.5 outline-none bg-[var(--paper-hi)] text-[var(--ink)] placeholder-[var(--ink-mute)] focus:bg-[var(--paper)] transition-colors"
            style={{ border: '1.5px solid var(--ink)' }}
          />
        </div>

        {/* Position pills */}
        <div className="flex gap-1.5 flex-wrap">
          {([0, 1, 2, 3, 4] as const).map((pos) => {
            const active = posFilter === pos;
            const ink = pos === 0 ? 'var(--ink)' : POS_INK[pos];
            return (
              <button
                key={pos}
                onClick={() => setPosFilter(pos)}
                className="font-mono text-[10px] uppercase tracking-[0.16em] px-2.5 py-1 transition-colors cursor-pointer"
                style={{
                  border: `1px solid ${active ? ink : 'var(--paper-lo)'}`,
                  background: active ? ink : 'transparent',
                  color: active
                    ? pos === 0
                      ? 'var(--paper)'
                      : 'var(--captain-ink)'
                    : 'var(--ink-soft)',
                }}
              >
                {pos === 0 ? 'All' : POS_NAMES[pos]}
              </button>
            );
          })}
        </div>

        {/* Team + Price */}
        <div className="flex gap-2">
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="flex-1 font-mono text-xs px-2.5 py-2 bg-[var(--paper-hi)] text-[var(--ink)] outline-none cursor-pointer"
            style={{ border: '1.5px solid var(--ink)' }}
          >
            <option value="">All clubs</option>
            {sortedTeamNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="flex-1 font-mono text-xs px-2.5 py-2 bg-[var(--paper-hi)] text-[var(--ink)] outline-none cursor-pointer"
            style={{ border: '1.5px solid var(--ink)' }}
          >
            {PRICE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
          <span
            role="switch"
            aria-checked={availableOnly}
            onClick={() => setAvailableOnly((v) => !v)}
            className="relative inline-block transition-colors"
            style={{
              width: 30,
              height: 16,
              border: '1px solid var(--ink)',
              background: availableOnly ? 'var(--ink)' : 'transparent',
            }}
          >
            <span
              className="absolute top-[1px] block transition-transform"
              style={{
                left: 1,
                width: 12,
                height: 12,
                background: availableOnly ? 'var(--grass)' : 'var(--ink-mute)',
                transform: availableOnly ? 'translateX(14px)' : 'translateX(0)',
              }}
            />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
            Fit only
          </span>
        </label>
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1">
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead
            className="sticky top-0 z-10"
            style={{ background: 'var(--paper)' }}
          >
            <tr style={{ borderBottom: '1px solid var(--ink)' }}>
              <th
                className="font-mono text-[10px] uppercase tracking-[0.14em] font-semibold text-left"
                style={{ color: 'var(--ink-mute)', padding: '8px 16px' }}
              >
                Player
              </th>
              <th
                className="font-mono text-[10px] uppercase tracking-[0.14em] font-semibold text-right"
                style={{ color: 'var(--ink-mute)', padding: '8px 8px' }}
              >
                Price
              </th>
              <th
                className="font-mono text-[10px] uppercase tracking-[0.14em] font-semibold text-right"
                style={{ color: 'var(--ink-mute)', padding: '8px 8px' }}
              >
                xP
              </th>
              <th style={{ width: 48 }} />
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.map((player) => {
              const reason = blockReason(player);
              const xp = calcXP(player).toFixed(1);
              const tShort = teamShortName.get(player.team) ?? null;
              const portraitBg = teamColor(tShort)?.primary ?? null;
              return (
                <tr
                  key={player.id}
                  style={{ borderBottom: '1px solid var(--paper-lo)' }}
                  className="hover:bg-[var(--paper-hi)] transition-colors"
                >
                  <td style={{ padding: '8px 16px' }}>
                    <div className="flex items-center gap-2.5">
                      <span
                        className="inline-block font-mono text-[9px] font-bold tracking-wider px-1.5 py-0.5"
                        style={{
                          background: POS_INK[player.element_type],
                          color: 'var(--captain-ink)',
                          minWidth: 28,
                          textAlign: 'center',
                        }}
                      >
                        {POS_NAMES[player.element_type]}
                      </span>
                      <PlayerPortrait player={player} size={28} background={portraitBg} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-serif font-extrabold text-sm leading-tight truncate"
                            style={{ color: 'var(--ink)', letterSpacing: '-0.01em' }}
                          >
                            {player.web_name}
                          </span>
                          <StatusDot status={player.status} />
                        </div>
                        <p
                          className="font-mono text-[10px] uppercase tracking-[0.12em]"
                          style={{ color: 'var(--ink-mute)' }}
                        >
                          {tShort ?? '—'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td
                    className="font-mono text-xs text-right tabular-nums"
                    style={{ color: 'var(--ink)', padding: '8px 8px' }}
                  >
                    £{(player.now_cost / 10).toFixed(1)}m
                  </td>
                  <td
                    className="font-serif font-extrabold text-sm text-right tabular-nums"
                    style={{ color: 'var(--grass)', padding: '8px 8px' }}
                  >
                    {xp}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <button
                      onClick={() => addPlayer(player)}
                      disabled={reason !== null}
                      title={reason ?? 'Add to squad'}
                      className={cn(
                        'font-mono text-xs uppercase tracking-[0.14em] px-2 py-1 transition-colors',
                        reason === null
                          ? 'cursor-pointer hover:opacity-90'
                          : 'cursor-not-allowed opacity-40',
                      )}
                      style={{
                        border: '1px solid var(--ink)',
                        background: reason === null ? 'var(--ink)' : 'transparent',
                        color: reason === null ? 'var(--paper)' : 'var(--ink-mute)',
                      }}
                    >
                      Sign
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredPlayers.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="font-serif italic text-center"
                  style={{ color: 'var(--ink-mute)', padding: '36px 16px' }}
                >
                  No players match those filters. Loosen up a notch.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const SquadPanel = (
    <div className="flex flex-col h-full min-h-0 bg-[var(--paper-hi)]">
      {/* Summary */}
      <div
        className="p-4 sm:p-5"
        style={{ borderBottom: '1px solid var(--ink)' }}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-mute)] mb-2">
          The team sheet
        </p>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="font-serif font-extrabold text-[36px] leading-none tracking-[-0.025em]">
            {squad.length}
            <span className="text-[var(--ink-mute)] mx-1.5">/</span>
            {TOTAL_PLAYERS}
          </div>
          <div className="text-right">
            <p
              className="font-mono text-[10px] uppercase tracking-[0.16em]"
              style={{ color: 'var(--ink-mute)' }}
            >
              Spend / Remaining
            </p>
            <p
              className="font-serif font-extrabold text-lg tracking-[-0.02em]"
              style={{ color: 'var(--ink)' }}
            >
              £{(totalCost / 10).toFixed(1)}m
              <span
                className="font-mono text-[12px] font-medium ml-2"
                style={{ color: remaining < 0 ? 'var(--red-rule)' : 'var(--ink-soft)' }}
              >
                · £{(remaining / 10).toFixed(1)}m left
              </span>
            </p>
          </div>
        </div>

        <div
          className="mt-3 grid grid-cols-4"
          style={{ borderTop: '1px solid var(--paper-lo)' }}
        >
          {([1, 2, 3, 4] as const).map((pos, i) => {
            const filled = posCounts[pos] ?? 0;
            const limit = POS_LIMITS[pos];
            const done = filled >= limit;
            return (
              <div
                key={pos}
                className="px-2 pt-2.5"
                style={{ borderRight: i < 3 ? '1px solid var(--paper-lo)' : 'none' }}
              >
                <p
                  className="font-mono text-[10px] uppercase tracking-[0.16em]"
                  style={{ color: POS_INK[pos] }}
                >
                  {POS_NAMES[pos]}
                </p>
                <p
                  className="font-serif font-extrabold text-base mt-0.5"
                  style={{ color: done ? 'var(--grass)' : 'var(--ink)' }}
                >
                  {filled}
                  <span className="text-[var(--ink-mute)] mx-0.5">/</span>
                  {limit}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Slots */}
      <div className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-5">
        {([1, 2, 3, 4] as const).map((pos) => {
          const posPlayers = squad.filter((p) => p.element_type === pos);
          const limit = POS_LIMITS[pos];
          return (
            <div key={pos}>
              <p
                className="font-mono text-[10px] uppercase tracking-[0.18em] mb-2"
                style={{ color: POS_INK[pos] }}
              >
                {POS_NAMES[pos]} — {posPlayers.length}/{limit}
              </p>
              <div className="space-y-1.5">
                {posPlayers.map((player) => {
                  const tShort = teamShortName.get(player.team) ?? null;
                  const portraitBg = teamColor(tShort)?.primary ?? null;
                  return (
                    <div
                      key={player.id}
                      className="flex items-center justify-between px-3 py-2 bg-[var(--paper)]"
                      style={{
                        border: '1px solid var(--paper-lo)',
                        borderLeft: `3px solid ${POS_INK[pos]}`,
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <PlayerPortrait
                          player={player}
                          size={28}
                          background={portraitBg}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="font-serif font-extrabold text-sm truncate"
                              style={{ color: 'var(--ink)', letterSpacing: '-0.01em' }}
                            >
                              {player.web_name}
                            </span>
                            <StatusDot status={player.status} />
                          </div>
                          <p
                            className="font-mono text-[10px] uppercase tracking-[0.12em]"
                            style={{ color: 'var(--ink-mute)' }}
                          >
                            {tShort ?? '—'} · £{(player.now_cost / 10).toFixed(1)}m
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removePlayer(player.id)}
                        className="font-mono text-[10px] uppercase tracking-[0.14em] px-2 py-1 cursor-pointer transition-colors hover:bg-[var(--red-rule)] hover:text-[var(--captain-ink)]"
                        style={{
                          border: '1px solid var(--ink-mute)',
                          color: 'var(--ink-soft)',
                          background: 'transparent',
                        }}
                        title="Drop"
                      >
                        Drop
                      </button>
                    </div>
                  );
                })}
                {Array.from({ length: limit - posPlayers.length }).map((_, i) => (
                  <div
                    key={`empty-${pos}-${i}`}
                    className="font-mono text-[10px] uppercase tracking-[0.14em] px-3 py-2.5"
                    style={{
                      border: '1px dashed var(--paper-lo)',
                      color: 'var(--ink-mute)',
                    }}
                  >
                    + Sign a {POS_NAMES[pos].toLowerCase()}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Save bar */}
      <div className="p-4 sm:p-5 space-y-3" style={{ borderTop: '1px solid var(--ink)' }}>
        {error && (
          <p
            className="font-mono text-[11px] uppercase tracking-[0.14em] px-3 py-2"
            style={{
              border: '1px solid var(--red-rule)',
              color: 'var(--red-rule)',
            }}
          >
            {error}
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={!isComplete || isPending}
          className="w-full font-mono text-xs uppercase tracking-[0.18em] px-4 py-3.5 transition-opacity"
          style={{
            background: isComplete && !isPending ? 'var(--ink)' : 'transparent',
            color: isComplete && !isPending ? 'var(--paper)' : 'var(--ink-mute)',
            border: '1.5px solid var(--ink)',
            cursor: isComplete && !isPending ? 'pointer' : 'not-allowed',
            opacity: isComplete && !isPending ? 1 : 0.65,
          }}
        >
          {isPending
            ? 'Filing the team sheet…'
            : isComplete
              ? 'File the team sheet →'
              : `${TOTAL_PLAYERS - squad.length} more to sign`}
        </button>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col">
      {/* Mobile tab bar */}
      <div
        className="lg:hidden flex"
        style={{ borderBottom: '1px solid var(--ink)' }}
      >
        {(['pick', 'squad'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className="flex-1 font-mono text-[11px] uppercase tracking-[0.16em] py-3 cursor-pointer transition-colors"
            style={{
              background: mobileTab === tab ? 'var(--ink)' : 'transparent',
              color: mobileTab === tab ? 'var(--paper)' : 'var(--ink-soft)',
            }}
          >
            {tab === 'pick' ? 'Open market' : `Team sheet (${squad.length}/${TOTAL_PLAYERS})`}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 flex">
        <div
          className={cn(
            'lg:w-1/2 flex-col min-h-0',
            mobileTab === 'pick' ? 'flex w-full' : 'hidden lg:flex',
          )}
          style={{ borderRight: '1px solid var(--ink)' }}
        >
          {PlayerListPanel}
        </div>
        <div
          className={cn(
            'lg:w-1/2 flex-col min-h-0',
            mobileTab === 'squad' ? 'flex w-full' : 'hidden lg:flex',
          )}
        >
          {SquadPanel}
        </div>
      </div>
    </div>
  );
}
