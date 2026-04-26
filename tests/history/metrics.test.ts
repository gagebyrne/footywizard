/**
 * Unit tests for metrics calculation
 * 
 * Tests MAE, captain hit rate, and Pearson correlation with known inputs.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateMAE,
  calculateCaptainHitRate,
  calculateCorrelation,
  calculateAggregateMetrics,
} from '@/lib/history/metrics';
import type { PredictionRecord } from '@/lib/history/predictions';

describe('calculateMAE', () => {
  it('calculates mean absolute error correctly', () => {
    const predictions: PredictionRecord[] = [
      {
        gameweek: 1,
        timestamp: '2024-01-01T00:00:00Z',
        predictions: [],
        totalExpectedPoints: 60,
        totalActualPoints: 55,
        captain: { playerId: 1, playerName: 'Player 1' },
      },
      {
        gameweek: 2,
        timestamp: '2024-01-02T00:00:00Z',
        predictions: [],
        totalExpectedPoints: 50,
        totalActualPoints: 60,
        captain: { playerId: 2, playerName: 'Player 2' },
      },
      {
        gameweek: 3,
        timestamp: '2024-01-03T00:00:00Z',
        predictions: [],
        totalExpectedPoints: 70,
        totalActualPoints: 65,
        captain: { playerId: 3, playerName: 'Player 3' },
      },
    ];
    
    // MAE = (|60-55| + |50-60| + |70-65|) / 3 = (5 + 10 + 5) / 3 = 6.67
    const mae = calculateMAE(predictions);
    expect(mae).toBeCloseTo(6.67, 2);
  });
  
  it('returns null when no actuals available', () => {
    const predictions: PredictionRecord[] = [
      {
        gameweek: 1,
        timestamp: '2024-01-01T00:00:00Z',
        predictions: [],
        totalExpectedPoints: 60,
        captain: { playerId: 1, playerName: 'Player 1' },
      },
    ];
    
    const mae = calculateMAE(predictions);
    expect(mae).toBeNull();
  });
  
  it('ignores predictions without actuals', () => {
    const predictions: PredictionRecord[] = [
      {
        gameweek: 1,
        timestamp: '2024-01-01T00:00:00Z',
        predictions: [],
        totalExpectedPoints: 60,
        totalActualPoints: 55,
        captain: { playerId: 1, playerName: 'Player 1' },
      },
      {
        gameweek: 2,
        timestamp: '2024-01-02T00:00:00Z',
        predictions: [],
        totalExpectedPoints: 50,
        captain: { playerId: 2, playerName: 'Player 2' },
      },
    ];
    
    // MAE = |60-55| / 1 = 5
    const mae = calculateMAE(predictions);
    expect(mae).toBe(5);
  });
});

describe('calculateCaptainHitRate', () => {
  it('calculates hit rate when captain was top scorer', () => {
    const predictions: PredictionRecord[] = [
      {
        gameweek: 1,
        timestamp: '2024-01-01T00:00:00Z',
        predictions: [
          { playerId: 1, playerName: 'Player 1', expectedPoints: 10, actualPoints: 12 },
          { playerId: 2, playerName: 'Player 2', expectedPoints: 8, actualPoints: 6 },
        ],
        totalExpectedPoints: 18,
        totalActualPoints: 18,
        captain: { playerId: 1, playerName: 'Player 1' },
      },
      {
        gameweek: 2,
        timestamp: '2024-01-02T00:00:00Z',
        predictions: [
          { playerId: 1, playerName: 'Player 1', expectedPoints: 10, actualPoints: 5 },
          { playerId: 2, playerName: 'Player 2', expectedPoints: 8, actualPoints: 10 },
        ],
        totalExpectedPoints: 18,
        totalActualPoints: 15,
        captain: { playerId: 1, playerName: 'Player 1' },
      },
    ];
    
    // Captain was top scorer in 1 out of 2 gameweeks = 50%
    const hitRate = calculateCaptainHitRate(predictions);
    expect(hitRate).toBe(50);
  });
  
  it('returns 100% when captain always top scorer', () => {
    const predictions: PredictionRecord[] = [
      {
        gameweek: 1,
        timestamp: '2024-01-01T00:00:00Z',
        predictions: [
          { playerId: 1, playerName: 'Player 1', expectedPoints: 10, actualPoints: 12 },
          { playerId: 2, playerName: 'Player 2', expectedPoints: 8, actualPoints: 6 },
        ],
        totalExpectedPoints: 18,
        totalActualPoints: 18,
        captain: { playerId: 1, playerName: 'Player 1' },
      },
      {
        gameweek: 2,
        timestamp: '2024-01-02T00:00:00Z',
        predictions: [
          { playerId: 3, playerName: 'Player 3', expectedPoints: 10, actualPoints: 15 },
          { playerId: 4, playerName: 'Player 4', expectedPoints: 8, actualPoints: 5 },
        ],
        totalExpectedPoints: 18,
        totalActualPoints: 20,
        captain: { playerId: 3, playerName: 'Player 3' },
      },
    ];
    
    const hitRate = calculateCaptainHitRate(predictions);
    expect(hitRate).toBe(100);
  });
  
  it('returns null when no actuals available', () => {
    const predictions: PredictionRecord[] = [
      {
        gameweek: 1,
        timestamp: '2024-01-01T00:00:00Z',
        predictions: [],
        totalExpectedPoints: 60,
        captain: { playerId: 1, playerName: 'Player 1' },
      },
    ];
    
    const hitRate = calculateCaptainHitRate(predictions);
    expect(hitRate).toBeNull();
  });
});

describe('calculateCorrelation', () => {
  it('calculates perfect positive correlation', () => {
    const predictions: PredictionRecord[] = [
      {
        gameweek: 1,
        timestamp: '2024-01-01T00:00:00Z',
        predictions: [],
        totalExpectedPoints: 50,
        totalActualPoints: 50,
        captain: { playerId: 1, playerName: 'Player 1' },
      },
      {
        gameweek: 2,
        timestamp: '2024-01-02T00:00:00Z',
        predictions: [],
        totalExpectedPoints: 60,
        totalActualPoints: 60,
        captain: { playerId: 2, playerName: 'Player 2' },
      },
      {
        gameweek: 3,
        timestamp: '2024-01-03T00:00:00Z',
        predictions: [],
        totalExpectedPoints: 70,
        totalActualPoints: 70,
        captain: { playerId: 3, playerName: 'Player 3' },
      },
    ];
    
    const correlation = calculateCorrelation(predictions);
    expect(correlation).toBeCloseTo(1.0, 2);
  });
  
  it('calculates positive correlation with noise', () => {
    const predictions: PredictionRecord[] = [
      {
        gameweek: 1,
        timestamp: '2024-01-01T00:00:00Z',
        predictions: [],
        totalExpectedPoints: 50,
        totalActualPoints: 55,
        captain: { playerId: 1, playerName: 'Player 1' },
      },
      {
        gameweek: 2,
        timestamp: '2024-01-02T00:00:00Z',
        predictions: [],
        totalExpectedPoints: 60,
        totalActualPoints: 58,
        captain: { playerId: 2, playerName: 'Player 2' },
      },
      {
        gameweek: 3,
        timestamp: '2024-01-03T00:00:00Z',
        predictions: [],
        totalExpectedPoints: 70,
        totalActualPoints: 72,
        captain: { playerId: 3, playerName: 'Player 3' },
      },
    ];
    
    const correlation = calculateCorrelation(predictions);
    expect(correlation).toBeGreaterThan(0.9);
    expect(correlation).toBeLessThanOrEqual(1.0);
  });
  
  it('returns null when insufficient data', () => {
    const predictions: PredictionRecord[] = [
      {
        gameweek: 1,
        timestamp: '2024-01-01T00:00:00Z',
        predictions: [],
        totalExpectedPoints: 60,
        totalActualPoints: 55,
        captain: { playerId: 1, playerName: 'Player 1' },
      },
    ];
    
    const correlation = calculateCorrelation(predictions);
    expect(correlation).toBeNull();
  });
  
  it('returns null when no actuals available', () => {
    const predictions: PredictionRecord[] = [
      {
        gameweek: 1,
        timestamp: '2024-01-01T00:00:00Z',
        predictions: [],
        totalExpectedPoints: 60,
        captain: { playerId: 1, playerName: 'Player 1' },
      },
    ];
    
    const correlation = calculateCorrelation(predictions);
    expect(correlation).toBeNull();
  });
});

describe('calculateAggregateMetrics', () => {
  it('calculates all metrics together', () => {
    const predictions: PredictionRecord[] = [
      {
        gameweek: 1,
        timestamp: '2024-01-01T00:00:00Z',
        predictions: [
          { playerId: 1, playerName: 'Player 1', expectedPoints: 10, actualPoints: 12 },
          { playerId: 2, playerName: 'Player 2', expectedPoints: 8, actualPoints: 6 },
        ],
        totalExpectedPoints: 60,
        totalActualPoints: 55,
        captain: { playerId: 1, playerName: 'Player 1' },
      },
      {
        gameweek: 2,
        timestamp: '2024-01-02T00:00:00Z',
        predictions: [
          { playerId: 3, playerName: 'Player 3', expectedPoints: 10, actualPoints: 15 },
          { playerId: 4, playerName: 'Player 4', expectedPoints: 8, actualPoints: 5 },
        ],
        totalExpectedPoints: 50,
        totalActualPoints: 60,
        captain: { playerId: 3, playerName: 'Player 3' },
      },
      {
        gameweek: 3,
        timestamp: '2024-01-03T00:00:00Z',
        predictions: [],
        totalExpectedPoints: 70,
        captain: { playerId: 5, playerName: 'Player 5' },
      },
    ];
    
    const metrics = calculateAggregateMetrics(predictions);
    
    expect(metrics.totalGameweeks).toBe(3);
    expect(metrics.gameweeksWithActuals).toBe(2);
    expect(metrics.mae).toBeCloseTo(7.5, 2); // (|60-55| + |50-60|) / 2
    expect(metrics.captainHitRate).toBe(100); // Captain was top scorer in both gameweeks
    expect(metrics.correlation).toBeCloseTo(-1, 1); // Negative correlation (60→55, 50→60)
  });
  
  it('returns null metrics when no actuals available', () => {
    const predictions: PredictionRecord[] = [
      {
        gameweek: 1,
        timestamp: '2024-01-01T00:00:00Z',
        predictions: [],
        totalExpectedPoints: 60,
        captain: { playerId: 1, playerName: 'Player 1' },
      },
      {
        gameweek: 2,
        timestamp: '2024-01-02T00:00:00Z',
        predictions: [],
        totalExpectedPoints: 50,
        captain: { playerId: 2, playerName: 'Player 2' },
      },
    ];
    
    const metrics = calculateAggregateMetrics(predictions);
    
    expect(metrics.totalGameweeks).toBe(2);
    expect(metrics.gameweeksWithActuals).toBe(0);
    expect(metrics.mae).toBeNull();
    expect(metrics.captainHitRate).toBeNull();
    expect(metrics.correlation).toBeNull();
  });
});
