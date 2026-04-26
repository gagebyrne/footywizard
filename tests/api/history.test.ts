/**
 * Integration test for /api/history endpoint
 * 
 * Tests:
 * - Returns predictions and metrics
 * - Backfills actuals for finished gameweeks
 * - Calculates metrics correctly
 * - Handles empty predictions file
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import type { Event } from '@/lib/types/fpl';

// Use vi.hoisted() to properly hoist mock functions
const { mockGetBootstrapData, mockGetPlayer } = vi.hoisted(() => {
  return {
    mockGetBootstrapData: vi.fn(),
    mockGetPlayer: vi.fn(),
  };
});

// Mock the FplFetch class
vi.mock('fpl-fetch', () => {
  return {
    default: class MockFplFetch {
      getBootstrapData = mockGetBootstrapData;
      getPlayer = mockGetPlayer;
    },
  };
});

// Import after mock is set up
import { GET } from '@/app/api/history/route';
import type { PredictionRecord } from '@/lib/history/predictions';
import { resetFplInstance } from '@/lib/history/predictions';

describe('GET /api/history', () => {
  const PREDICTIONS_FILE = path.join(process.cwd(), 'data', 'historical-predictions.json');
  
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    resetFplInstance();
  });
  
  afterEach(async () => {
    vi.restoreAllMocks();
    
    // Clean up test file if it exists
    try {
      await fs.unlink(PREDICTIONS_FILE);
    } catch {
      // Ignore if file doesn't exist
    }
  });
  
  it('returns empty predictions when no file exists', async () => {
    // Mock bootstrap data with no finished gameweeks
    mockGetBootstrapData.mockResolvedValue({
      events: [
        { id: 1, finished: false } as Event,
      ],
    });
    
    const response = await GET();
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.predictions).toEqual([]);
    expect(data.metrics).toEqual({
      mae: null,
      captainHitRate: null,
      correlation: null,
      totalGameweeks: 0,
      gameweeksWithActuals: 0,
    });
  });
  
  it('returns predictions without actuals when gameweeks not finished', async () => {
    // Create predictions file
    const predictions: PredictionRecord[] = [
      {
        gameweek: 1,
        timestamp: '2024-01-01T00:00:00Z',
        predictions: [
          { playerId: 1, playerName: 'Player 1', expectedPoints: 10 },
          { playerId: 2, playerName: 'Player 2', expectedPoints: 8 },
        ],
        totalExpectedPoints: 60,
        captain: { playerId: 1, playerName: 'Player 1' },
      },
    ];
    
    await fs.writeFile(PREDICTIONS_FILE, JSON.stringify(predictions, null, 2), 'utf-8');
    
    // Mock bootstrap data with no finished gameweeks
    mockGetBootstrapData.mockResolvedValue({
      events: [
        { id: 1, finished: false } as Event,
      ],
    });
    
    const response = await GET();
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.predictions).toHaveLength(1);
    expect(data.predictions[0].totalActualPoints).toBeUndefined();
    expect(data.metrics.mae).toBeNull();
  });
  
  it('backfills actuals for finished gameweeks and calculates metrics', async () => {
    // Create predictions file
    const predictions: PredictionRecord[] = [
      {
        gameweek: 1,
        timestamp: '2024-01-01T00:00:00Z',
        predictions: [
          { playerId: 1, playerName: 'Player 1', expectedPoints: 10 },
          { playerId: 2, playerName: 'Player 2', expectedPoints: 8 },
        ],
        totalExpectedPoints: 60,
        captain: { playerId: 1, playerName: 'Player 1' },
      },
      {
        gameweek: 2,
        timestamp: '2024-01-02T00:00:00Z',
        predictions: [
          { playerId: 3, playerName: 'Player 3', expectedPoints: 12 },
          { playerId: 4, playerName: 'Player 4', expectedPoints: 7 },
        ],
        totalExpectedPoints: 50,
        captain: { playerId: 3, playerName: 'Player 3' },
      },
    ];
    
    await fs.writeFile(PREDICTIONS_FILE, JSON.stringify(predictions, null, 2), 'utf-8');
    
    // Mock bootstrap data with finished gameweeks
    mockGetBootstrapData.mockResolvedValue({
      events: [
        { id: 1, finished: true } as Event,
        { id: 2, finished: true } as Event,
      ],
    });
    
    // Mock player summaries
    mockGetPlayer.mockImplementation((playerId: number) => {
      const summaries = {
        1: {
          history: [{ round: 1, total_points: 12 }],
        },
        2: {
          history: [{ round: 1, total_points: 6 }],
        },
        3: {
          history: [{ round: 2, total_points: 15 }],
        },
        4: {
          history: [{ round: 2, total_points: 5 }],
        },
      };
      return Promise.resolve(summaries[playerId as keyof typeof summaries]);
    });
    
    const response = await GET();
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.predictions).toHaveLength(2);
    
    // Check GW1 actuals (captain doubled: 12*2 + 6 = 30)
    expect(data.predictions[0].predictions[0].actualPoints).toBe(12);
    expect(data.predictions[0].predictions[1].actualPoints).toBe(6);
    expect(data.predictions[0].totalActualPoints).toBe(30);
    
    // Check GW2 actuals (captain doubled: 15*2 + 5 = 35)
    expect(data.predictions[1].predictions[0].actualPoints).toBe(15);
    expect(data.predictions[1].predictions[1].actualPoints).toBe(5);
    expect(data.predictions[1].totalActualPoints).toBe(35);
    
    // Check metrics
    expect(data.metrics.totalGameweeks).toBe(2);
    expect(data.metrics.gameweeksWithActuals).toBe(2);
    
    // MAE = (|60-30| + |50-35|) / 2 = (30 + 15) / 2 = 22.5
    expect(data.metrics.mae).toBeCloseTo(22.5, 2);
    
    // Captain hit rate = 100% (captain was top scorer in both GWs)
    expect(data.metrics.captainHitRate).toBe(100);
    
    // Correlation: negative (60→30, 50→35)
    expect(data.metrics.correlation).toBeLessThan(0);
  });
  
  it('skips backfill when actuals already present', async () => {
    // Create predictions file with actuals already present
    const predictions: PredictionRecord[] = [
      {
        gameweek: 1,
        timestamp: '2024-01-01T00:00:00Z',
        predictions: [
          { playerId: 1, playerName: 'Player 1', expectedPoints: 10, actualPoints: 12 },
          { playerId: 2, playerName: 'Player 2', expectedPoints: 8, actualPoints: 6 },
        ],
        totalExpectedPoints: 60,
        totalActualPoints: 30,
        captain: { playerId: 1, playerName: 'Player 1' },
      },
    ];
    
    await fs.writeFile(PREDICTIONS_FILE, JSON.stringify(predictions, null, 2), 'utf-8');
    
    // Mock bootstrap data with finished gameweeks
    mockGetBootstrapData.mockResolvedValue({
      events: [
        { id: 1, finished: true } as Event,
      ],
    });
    
    const response = await GET();
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.predictions).toHaveLength(1);
    expect(data.predictions[0].totalActualPoints).toBe(30);
    
    // Should not call getPlayer since actuals already present
    expect(mockGetPlayer).not.toHaveBeenCalled();
    
    // Check metrics
    expect(data.metrics.mae).toBeCloseTo(30, 2); // |60-30| = 30
    expect(data.metrics.captainHitRate).toBe(100);
  });
  
  it('handles API errors gracefully during backfill', async () => {
    // Create predictions file
    const predictions: PredictionRecord[] = [
      {
        gameweek: 1,
        timestamp: '2024-01-01T00:00:00Z',
        predictions: [
          { playerId: 1, playerName: 'Player 1', expectedPoints: 10 },
          { playerId: 2, playerName: 'Player 2', expectedPoints: 8 },
        ],
        totalExpectedPoints: 60,
        captain: { playerId: 1, playerName: 'Player 1' },
      },
    ];
    
    await fs.writeFile(PREDICTIONS_FILE, JSON.stringify(predictions, null, 2), 'utf-8');
    
    // Mock bootstrap data with finished gameweeks
    mockGetBootstrapData.mockResolvedValue({
      events: [
        { id: 1, finished: true } as Event,
      ],
    });
    
    // Mock player summaries with one error
    mockGetPlayer.mockImplementation((playerId: number) => {
      if (playerId === 1) {
        return Promise.resolve({
          history: [{ round: 1, total_points: 12 }],
        });
      }
      return Promise.reject(new Error('API error'));
    });
    
    const response = await GET();
    const data = await response.json();
    
    expect(response.status).toBe(200);
    
    // Partial actuals should be present
    expect(data.predictions[0].predictions[0].actualPoints).toBe(12);
    expect(data.predictions[0].predictions[1].actualPoints).toBeUndefined();
    
    // Total should still be calculated with available data (captain doubled)
    expect(data.predictions[0].totalActualPoints).toBe(24);
  });
});
