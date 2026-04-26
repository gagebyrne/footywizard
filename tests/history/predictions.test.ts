/**
 * Tests for prediction persistence and actuals backfill
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import type { Player } from '@/lib/types/fpl';
import {
  savePrediction,
  backfillActuals,
  getPredictions,
  resetFplInstance,
  type PredictionRecord,
} from '@/lib/history/predictions';

// Mock FPL API functions
const mockGetBootstrapData = vi.fn();
const mockGetPlayer = vi.fn();

// Mock FplFetch class
vi.mock('fpl-fetch', () => {
  return {
    default: class FplFetch {
      getBootstrapData = mockGetBootstrapData;
      getPlayer = mockGetPlayer;
    },
  };
});

const TEST_PREDICTIONS_FILE = path.join(process.cwd(), 'data', 'historical-predictions.json');

describe('savePrediction', () => {
  beforeEach(async () => {
    // Reset file to empty array
    await fs.writeFile(TEST_PREDICTIONS_FILE, '[]', 'utf-8');
  });

  afterEach(async () => {
    // Clean up
    await fs.writeFile(TEST_PREDICTIONS_FILE, '[]', 'utf-8');
  });

  it('should save a new prediction', async () => {
    const lineup: Player[] = [
      { id: 1, web_name: 'Salah', ep_next: '8.5' } as Player,
      { id: 2, web_name: 'Haaland', ep_next: '9.2' } as Player,
    ];
    const captain: Player = { id: 1, web_name: 'Salah' } as Player;

    await savePrediction(1, lineup, captain, 65.5);

    const content = await fs.readFile(TEST_PREDICTIONS_FILE, 'utf-8');
    const predictions: PredictionRecord[] = JSON.parse(content);

    expect(predictions).toHaveLength(1);
    expect(predictions[0].gameweek).toBe(1);
    expect(predictions[0].predictions).toHaveLength(2);
    expect(predictions[0].predictions[0].playerId).toBe(1);
    expect(predictions[0].predictions[0].playerName).toBe('Salah');
    expect(predictions[0].predictions[0].expectedPoints).toBe(8.5);
    expect(predictions[0].totalExpectedPoints).toBe(65.5);
    expect(predictions[0].captain.playerId).toBe(1);
    expect(predictions[0].captain.playerName).toBe('Salah');
  });

  it('should overwrite existing prediction for same gameweek', async () => {
    const lineup1: Player[] = [
      { id: 1, web_name: 'Salah', ep_next: '8.5' } as Player,
    ];
    const lineup2: Player[] = [
      { id: 2, web_name: 'Haaland', ep_next: '9.2' } as Player,
    ];
    const captain: Player = { id: 1, web_name: 'Salah' } as Player;

    await savePrediction(1, lineup1, captain, 60.0);
    await savePrediction(1, lineup2, captain, 70.0);

    const content = await fs.readFile(TEST_PREDICTIONS_FILE, 'utf-8');
    const predictions: PredictionRecord[] = JSON.parse(content);

    expect(predictions).toHaveLength(1);
    expect(predictions[0].totalExpectedPoints).toBe(70.0);
    expect(predictions[0].predictions[0].playerName).toBe('Haaland');
  });

  it('should preserve multiple gameweeks', async () => {
    const lineup: Player[] = [
      { id: 1, web_name: 'Salah', ep_next: '8.5' } as Player,
    ];
    const captain: Player = { id: 1, web_name: 'Salah' } as Player;

    await savePrediction(1, lineup, captain, 60.0);
    await savePrediction(2, lineup, captain, 62.0);
    await savePrediction(3, lineup, captain, 64.0);

    const content = await fs.readFile(TEST_PREDICTIONS_FILE, 'utf-8');
    const predictions: PredictionRecord[] = JSON.parse(content);

    expect(predictions).toHaveLength(3);
    // Should be sorted newest first
    expect(predictions[0].gameweek).toBe(3);
    expect(predictions[1].gameweek).toBe(2);
    expect(predictions[2].gameweek).toBe(1);
  });

  it('should handle missing ep_next gracefully', async () => {
    const lineup: Player[] = [
      { id: 1, web_name: 'Salah' } as Player, // No ep_next
    ];
    const captain: Player = { id: 1, web_name: 'Salah' } as Player;

    await savePrediction(1, lineup, captain, 60.0);

    const content = await fs.readFile(TEST_PREDICTIONS_FILE, 'utf-8');
    const predictions: PredictionRecord[] = JSON.parse(content);

    expect(predictions[0].predictions[0].expectedPoints).toBe(0);
  });
});

describe('backfillActuals', () => {
  beforeEach(async () => {
    // Reset file to empty array
    await fs.writeFile(TEST_PREDICTIONS_FILE, '[]', 'utf-8');
    // Reset FPL instance
    resetFplInstance();
  });

  afterEach(async () => {
    // Clean up
    await fs.writeFile(TEST_PREDICTIONS_FILE, '[]', 'utf-8');
    vi.clearAllMocks();
  });

  it('should backfill actuals for finished gameweek', async () => {
    // Setup prediction without actuals
    const lineup: Player[] = [
      { id: 1, web_name: 'Salah', ep_next: '8.5' } as Player,
      { id: 2, web_name: 'Haaland', ep_next: '9.2' } as Player,
    ];
    const captain: Player = { id: 1, web_name: 'Salah' } as Player;
    await savePrediction(1, lineup, captain, 65.5);

    // Mock FPL responses
    mockGetBootstrapData.mockResolvedValue({
      events: [
        { id: 1, finished: true },
        { id: 2, finished: false },
      ],
      elements: [],
      teams: [],
    });

    mockGetPlayer
      .mockResolvedValueOnce({
        history: [{ round: 1, total_points: 12 }],
      })
      .mockResolvedValueOnce({
        history: [{ round: 1, total_points: 8 }],
      });

    const result = await backfillActuals();

    expect(result).toHaveLength(1);
    expect(result[0].predictions[0].actualPoints).toBe(12);
    expect(result[0].predictions[1].actualPoints).toBe(8);
    // Captain points doubled: (12 * 2) + 8 = 32
    expect(result[0].totalActualPoints).toBe(32);
  });

  it('should skip unfinished gameweeks', async () => {
    // Setup prediction for unfinished gameweek
    const lineup: Player[] = [
      { id: 1, web_name: 'Salah', ep_next: '8.5' } as Player,
    ];
    const captain: Player = { id: 1, web_name: 'Salah' } as Player;
    await savePrediction(2, lineup, captain, 65.5);

    // Mock FPL responses
    mockGetBootstrapData.mockResolvedValue({
      events: [
        { id: 1, finished: true },
        { id: 2, finished: false }, // Not finished
      ],
      elements: [],
      teams: [],
    });

    const result = await backfillActuals();

    expect(result).toHaveLength(1);
    expect(result[0].predictions[0].actualPoints).toBeUndefined();
    expect(result[0].totalActualPoints).toBeUndefined();
    // getPlayer should not be called for unfinished gameweek
    expect(mockGetPlayer).not.toHaveBeenCalled();
  });

  it('should skip gameweeks that already have actuals', async () => {
    // Setup prediction with actuals already present
    const record: PredictionRecord = {
      gameweek: 1,
      timestamp: new Date().toISOString(),
      predictions: [
        {
          playerId: 1,
          playerName: 'Salah',
          expectedPoints: 8.5,
          actualPoints: 12,
        },
      ],
      totalExpectedPoints: 65.5,
      totalActualPoints: 24, // Already set
      captain: { playerId: 1, playerName: 'Salah' },
    };

    await fs.writeFile(TEST_PREDICTIONS_FILE, JSON.stringify([record], null, 2), 'utf-8');

    // Mock FPL responses
    mockGetBootstrapData.mockResolvedValue({
      events: [{ id: 1, finished: true }],
      elements: [],
      teams: [],
    });

    await backfillActuals();

    // getPlayer should not be called since actuals already exist
    expect(mockGetPlayer).not.toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    // Setup prediction
    const lineup: Player[] = [
      { id: 1, web_name: 'Salah', ep_next: '8.5' } as Player,
      { id: 2, web_name: 'Haaland', ep_next: '9.2' } as Player,
    ];
    const captain: Player = { id: 1, web_name: 'Salah' } as Player;
    await savePrediction(1, lineup, captain, 65.5);

    // Mock FPL responses
    mockGetBootstrapData.mockResolvedValue({
      events: [{ id: 1, finished: true }],
      elements: [],
      teams: [],
    });

    // First player succeeds, second fails
    mockGetPlayer
      .mockResolvedValueOnce({
        history: [{ round: 1, total_points: 12 }],
      })
      .mockRejectedValueOnce(new Error('API rate limit exceeded'));

    const result = await backfillActuals();

    expect(result).toHaveLength(1);
    expect(result[0].predictions[0].actualPoints).toBe(12);
    expect(result[0].predictions[1].actualPoints).toBeUndefined();
    // Only first player's doubled points: 12 * 2 = 24
    expect(result[0].totalActualPoints).toBe(24);
  });

  it('should handle multiple gameweeks', async () => {
    // Setup predictions for two gameweeks
    const lineup: Player[] = [
      { id: 1, web_name: 'Salah', ep_next: '8.5' } as Player,
    ];
    const captain: Player = { id: 1, web_name: 'Salah' } as Player;
    await savePrediction(1, lineup, captain, 60.0);
    await savePrediction(2, lineup, captain, 62.0);

    // Mock FPL responses
    mockGetBootstrapData.mockResolvedValue({
      events: [
        { id: 1, finished: true },
        { id: 2, finished: true },
      ],
      elements: [],
      teams: [],
    });

    mockGetPlayer.mockResolvedValue({
      history: [
        { round: 1, total_points: 10 },
        { round: 2, total_points: 15 },
      ],
    });

    const result = await backfillActuals();

    expect(result).toHaveLength(2);
    // Sorted newest first
    expect(result[0].gameweek).toBe(2);
    expect(result[0].totalActualPoints).toBe(30); // 15 * 2
    expect(result[1].gameweek).toBe(1);
    expect(result[1].totalActualPoints).toBe(20); // 10 * 2
  });
});

describe('getPredictions', () => {
  beforeEach(async () => {
    await fs.writeFile(TEST_PREDICTIONS_FILE, '[]', 'utf-8');
    resetFplInstance();
  });

  afterEach(async () => {
    await fs.writeFile(TEST_PREDICTIONS_FILE, '[]', 'utf-8');
    vi.clearAllMocks();
  });

  it('should trigger backfill when called', async () => {
    const lineup: Player[] = [
      { id: 1, web_name: 'Salah', ep_next: '8.5' } as Player,
    ];
    const captain: Player = { id: 1, web_name: 'Salah' } as Player;
    await savePrediction(1, lineup, captain, 60.0);

    mockGetBootstrapData.mockResolvedValue({
      events: [{ id: 1, finished: true }],
      elements: [],
      teams: [],
    });

    mockGetPlayer.mockResolvedValue({
      history: [{ round: 1, total_points: 12 }],
    });

    const result = await getPredictions();

    expect(mockGetBootstrapData).toHaveBeenCalled();
    expect(mockGetPlayer).toHaveBeenCalled();
    expect(result[0].totalActualPoints).toBe(24); // 12 * 2
  });
});
