import type { Fixture, Team } from '../types/fpl';

export function positionToDifficulty(position: number): number {
  if (position <= 4) return 5;
  if (position <= 8) return 4;
  if (position <= 12) return 3;
  if (position <= 16) return 2;
  return 1;
}

export function applyPositionOverride(fixtures: Fixture[], teams: Team[]): Fixture[] {
  const diffByTeam = new Map<number, number>(
    teams.map((t) => [t.id, positionToDifficulty(t.position)])
  );
  return fixtures.map((f) => ({
    ...f,
    team_h_difficulty: diffByTeam.get(f.team_a) ?? f.team_h_difficulty,
    team_a_difficulty: diffByTeam.get(f.team_h) ?? f.team_a_difficulty,
  }));
}
