/**
 * FPL TypeScript types
 * 
 * Re-exports core types from fpl-fetch package to provide a stable,
 * project-local contract for S02 (optimizer), S03 (UI), and S04 (history).
 */

import type {
  Element,
  Team,
  Event,
  Fixture,
  PlayerSummary,
} from 'fpl-fetch';

/**
 * Player (FPL Element)
 * 
 * Core player entity with stats, form, and pricing.
 * Key fields:
 * - id: Unique player identifier
 * - web_name: Display name (e.g., "Salah")
 * - team: Team ID
 * - element_type: Position (1=GK, 2=DEF, 3=MID, 4=FWD)
 * - form: Recent form score (string decimal)
 * - points_per_game: Average points per game (string decimal)
 * - now_cost: Current price (£0.1m units, e.g., 130 = £13.0m)
 * - total_points: Season total points
 * - selected_by_percent: Ownership percentage (string decimal)
 * - status: Availability status ('a'=available, 'd'=doubtful, 'i'=injured, 'u'=unavailable)
 */
export type Player = Element;

/**
 * Team
 * 
 * FPL team entity with strengths and form.
 * Key fields:
 * - id: Unique team identifier
 * - name: Full team name (e.g., "Liverpool")
 * - short_name: Short name (e.g., "LIV")
 * - strength: Overall team strength rating
 * - strength_overall_home/away: Home/away strength
 * - strength_attack_home/away: Attacking strength by venue
 * - strength_defence_home/away: Defensive strength by venue
 */
export type { Team };

/**
 * Event (Gameweek)
 * 
 * Represents a gameweek with deadline and completion status.
 * Key fields:
 * - id: Gameweek number
 * - name: Display name (e.g., "Gameweek 1")
 * - deadline_time: ISO datetime string for deadline
 * - deadline_time_epoch: Unix timestamp
 * - finished: Whether gameweek is complete
 * - is_current: Whether this is the current gameweek
 * - is_next: Whether this is the next gameweek
 */
export type { Event };

/**
 * Fixture
 * 
 * Match fixture with difficulty ratings.
 * Key fields:
 * - id: Unique fixture identifier
 * - event: Gameweek number
 * - team_h: Home team ID
 * - team_a: Away team ID
 * - team_h_difficulty: Home team's difficulty rating (1-5)
 * - team_a_difficulty: Away team's difficulty rating (1-5)
 * - kickoff_time: ISO datetime string
 * - started/finished: Match status booleans
 */
export type { Fixture };

/**
 * ElementSummary (PlayerSummary)
 * 
 * Player's historical performance and upcoming fixtures.
 * Key fields:
 * - history: Array of past gameweek performances
 * - fixtures: Array of upcoming fixture difficulty
 * - history_past: Array of past season summaries
 */
export type ElementSummary = PlayerSummary;
