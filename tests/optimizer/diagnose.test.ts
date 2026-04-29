/**
 * Optimizer diagnostic
 *
 * Not a test — a one-off probe that prints, for the current gameweek:
 *   - per-player: status, form, fixture(s) found, raw vs position-based difficulty,
 *     xP under each variant
 *   - summary: DGW/BGW players, totals under each variant, validator budget check
 *
 * Run:
 *   DIAGNOSE_SQUAD_IDS="515,670,373,..." npx vitest run tests/optimizer/diagnose.test.ts
 *
 * Without DIAGNOSE_SQUAD_IDS, prints aggregate fixture comparison only.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import FplFetch from 'fpl-fetch';
import type { Player, Team, Fixture, Event } from '../../lib/types/fpl';
import { calculateExpectedPoints } from '../../lib/optimizer/expected-points';
import { optimizeAllFormations } from '../../lib/optimizer/ilp-solver';

function positionToDifficulty(position: number): number {
  if (position <= 4) return 5;
  if (position <= 8) return 4;
  if (position <= 12) return 3;
  if (position <= 16) return 2;
  return 1;
}

/** xP using only the FIRST fixture found, with the supplied difficulty source. */
function xpFirstFixture(player: Player, fixtures: Fixture[]): number {
  if (player.status !== 'a') return 0;
  const form = player.form === '' ? 0 : parseFloat(player.form);
  const f = fixtures.find((fx) => fx.team_h === player.team || fx.team_a === player.team);
  if (!f) return 0;
  const diff = f.team_h === player.team ? f.team_h_difficulty : f.team_a_difficulty;
  return 0.7 * (5 - diff) + 0.3 * form;
}

/** xP summed across ALL fixtures in the gameweek (handles DGW). */
function xpAllFixtures(player: Player, fixtures: Fixture[]): number {
  if (player.status !== 'a') return 0;
  const form = player.form === '' ? 0 : parseFloat(player.form);
  const matches = fixtures.filter(
    (fx) => fx.team_h === player.team || fx.team_a === player.team
  );
  if (matches.length === 0) return 0;
  let total = 0;
  for (const f of matches) {
    const diff = f.team_h === player.team ? f.team_h_difficulty : f.team_a_difficulty;
    total += 0.7 * (5 - diff) + 0.3 * form;
  }
  return total;
}

function applyPositionOverride(fixtures: Fixture[], teams: Team[]): Fixture[] {
  const diffByTeam = new Map<number, number>(
    teams.map((t) => [t.id, positionToDifficulty(t.position)])
  );
  return fixtures.map((f) => ({
    ...f,
    team_h_difficulty: diffByTeam.get(f.team_a) ?? f.team_h_difficulty,
    team_a_difficulty: diffByTeam.get(f.team_h) ?? f.team_a_difficulty,
  }));
}

const POSITION_NAME: Record<number, string> = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };

describe('Optimizer diagnostic', () => {
  let players: Player[];
  let teams: Team[];
  let events: Event[];
  let fixturesAll: Fixture[];
  let currentEvent: Event;
  let gwFixturesRaw: Fixture[];
  let gwFixturesOverride: Fixture[];

  beforeAll(async () => {
    const fpl = new FplFetch();
    const bootstrap = await fpl.getBootstrapData();
    players = bootstrap.elements;
    teams = bootstrap.teams;
    events = bootstrap.events;
    fixturesAll = await fpl.getFixtures();

    const cur = events.find((e) => e.is_current);
    if (!cur) throw new Error('No current gameweek');
    currentEvent = cur;

    gwFixturesRaw = fixturesAll.filter((f) => f.event === currentEvent.id);
    gwFixturesOverride = applyPositionOverride(gwFixturesRaw, teams);
  }, 30000);

  it('prints fixture-difficulty comparison for current gameweek', () => {
    console.log(`\n=== Gameweek ${currentEvent.id} (${currentEvent.name}) ===`);
    console.log(`Fixtures this GW: ${gwFixturesRaw.length}`);

    const teamById = new Map(teams.map((t) => [t.id, t]));

    console.log('\n--- Fixture difficulty: raw FPL vs position-based override ---');
    console.log(
      'home(pos)        away(pos)        | raw H/A | override H/A'
    );
    for (let i = 0; i < gwFixturesRaw.length; i++) {
      const raw = gwFixturesRaw[i];
      const ovr = gwFixturesOverride[i];
      const h = teamById.get(raw.team_h);
      const a = teamById.get(raw.team_a);
      const hLabel = `${h?.short_name}(${h?.position})`.padEnd(8);
      const aLabel = `${a?.short_name}(${a?.position})`.padEnd(8);
      console.log(
        `${hLabel} v ${aLabel} | ${raw.team_h_difficulty}/${raw.team_a_difficulty}     | ${ovr.team_h_difficulty}/${ovr.team_a_difficulty}`
      );
    }

    expect(gwFixturesRaw.length).toBeGreaterThan(0);
  });

  it('prints per-player breakdown for DIAGNOSE_SQUAD_IDS', () => {
    const idsRaw = process.env.DIAGNOSE_SQUAD_IDS;
    if (!idsRaw) {
      console.log(
        '\n[diagnose] DIAGNOSE_SQUAD_IDS not set — skipping per-player breakdown.\n' +
          '          Example: DIAGNOSE_SQUAD_IDS="515,670,373,..." npx vitest run tests/optimizer/diagnose.test.ts'
      );
      return;
    }

    const ids = idsRaw
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n));

    const squad = players.filter((p) => ids.includes(p.id));
    const missing = ids.filter((id) => !squad.some((p) => p.id === id));
    if (missing.length > 0) {
      console.warn(`[diagnose] ${missing.length} squad ID(s) not found in bootstrap:`, missing);
    }

    const teamById = new Map(teams.map((t) => [t.id, t]));

    console.log(`\n=== Squad breakdown (${squad.length} players) ===`);
    console.log(
      'pos  name              team   status form  fix#  raw_xP  override_xP  raw_all_xP  override_all_xP'
    );

    let totalCurrent = 0; // matches what the optimizer uses today
    let totalOverride = 0;
    let totalRawAll = 0;
    let totalOverrideAll = 0;
    let dgwPlayers = 0;
    let bgwPlayers = 0;
    let unavailable = 0;

    for (const p of squad) {
      const matches = gwFixturesRaw.filter(
        (fx) => fx.team_h === p.team || fx.team_a === p.team
      );
      const fixCount = matches.length;
      if (fixCount > 1) dgwPlayers++;
      if (fixCount === 0) bgwPlayers++;
      if (p.status !== 'a') unavailable++;

      // Optimizer-current: uses raw fixtures, takes first via .find(), then 0.7/0.3 formula.
      // calculateExpectedPoints reproduces this exactly.
      const xpCurrent = calculateExpectedPoints(p, gwFixturesRaw, teams);
      const xpOverride = xpFirstFixture(p, gwFixturesOverride);
      const xpRawAll = xpAllFixtures(p, gwFixturesRaw);
      const xpOverrideAll = xpAllFixtures(p, gwFixturesOverride);

      totalCurrent += xpCurrent;
      totalOverride += xpOverride;
      totalRawAll += xpRawAll;
      totalOverrideAll += xpOverrideAll;

      const tShort = teamById.get(p.team)?.short_name ?? String(p.team);
      console.log(
        [
          POSITION_NAME[p.element_type].padEnd(4),
          (p.web_name || '').padEnd(18),
          tShort.padEnd(6),
          p.status.padEnd(6),
          (p.form || '0').padEnd(5),
          String(fixCount).padEnd(5),
          xpCurrent.toFixed(2).padEnd(7),
          xpOverride.toFixed(2).padEnd(12),
          xpRawAll.toFixed(2).padEnd(11),
          xpOverrideAll.toFixed(2),
        ].join(' ')
      );
    }

    console.log('\n--- Squad totals ---');
    console.log(`Current optimizer (raw, first fixture only): ${totalCurrent.toFixed(2)}`);
    console.log(`Position-override (first fixture only):      ${totalOverride.toFixed(2)}`);
    console.log(`Raw, all fixtures (DGW-aware):               ${totalRawAll.toFixed(2)}`);
    console.log(`Override, all fixtures (DGW-aware):          ${totalOverrideAll.toFixed(2)}`);
    console.log(
      `\nDelta (override − current, first fixture): ${(totalOverride - totalCurrent).toFixed(2)}`
    );
    console.log(
      `Delta (override-all − current):            ${(totalOverrideAll - totalCurrent).toFixed(2)}`
    );

    console.log('\n--- Squad flags ---');
    console.log(`Unavailable (status !== 'a'):  ${unavailable}`);
    console.log(`Blank-gameweek (no fixture):   ${bgwPlayers}`);
    console.log(`Double-gameweek (>1 fixture):  ${dgwPlayers}`);

    const totalCost = squad.reduce((s, p) => s + p.now_cost, 0);
    console.log(
      `\nSquad price total: ${totalCost} (£${(totalCost / 10).toFixed(1)}m) — ` +
        `${totalCost > 1000 ? 'over £100m (validator will respect budgetLimit=99999 in saved-squad mode)' : 'within £100m'}`
    );

    expect(squad.length).toBeGreaterThan(0);
  });

  it('runs the new optimizer end-to-end on DIAGNOSE_SQUAD_IDS', () => {
    const idsRaw = process.env.DIAGNOSE_SQUAD_IDS;
    if (!idsRaw) return;

    const ids = idsRaw
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n));

    const squad = players.filter((p) => ids.includes(p.id));
    const teamById = new Map(teams.map((t) => [t.id, t]));

    // Apply override + DGW summation, filter viable.
    const isViable = (p: Player) =>
      p.status === 'a' &&
      gwFixturesOverride.some((f) => f.team_h === p.team || f.team_a === p.team);

    const viable = squad.filter(isViable);
    const xp = new Map<number, number>();
    for (const p of viable) {
      xp.set(p.id, calculateExpectedPoints(p, gwFixturesOverride, teams));
    }

    console.log(`\n=== Optimizer end-to-end (saved-squad mode, budget=99999) ===`);
    console.log(`Viable players passed to ILP: ${viable.length} / ${squad.length}`);

    const result = optimizeAllFormations(viable, xp, 99999);
    if (!result) {
      console.log('Result: null (no viable players or all infeasible)');
      return;
    }

    const captainName = result.captain ? result.captain.web_name : '(none)';
    console.log(
      `Result: ${result.partial ? 'PARTIAL' : 'FULL'} lineup, ` +
        `${result.players.length} players, ` +
        `total xP (incl. captain bonus) ${result.totalExpectedPoints.toFixed(2)}, ` +
        `captain ${captainName}`
    );
    console.log(`Lineup:`);
    for (const p of result.players) {
      const tShort = teamById.get(p.team)?.short_name ?? String(p.team);
      const isCap = result.captain && p.id === result.captain.id ? ' (C)' : '';
      console.log(
        `  ${POSITION_NAME[p.element_type].padEnd(4)} ${(p.web_name || '').padEnd(18)} ${tShort.padEnd(6)} xP=${(xp.get(p.id) ?? 0).toFixed(2)}${isCap}`
      );
    }
  });
});
