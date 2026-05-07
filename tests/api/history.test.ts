import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PredictionRecord } from '@/lib/history/predictions';

// ─── Auth mock ────────────────────────────────────────────────────────────────

const { mockGetUser } = vi.hoisted(() => ({ mockGetUser: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
    }),
}));

// ─── Predictions mock ─────────────────────────────────────────────────────────

const { mockGetPredictions } = vi.hoisted(() => ({ mockGetPredictions: vi.fn() }));

vi.mock('@/lib/history/predictions', () => ({
  getPredictions: mockGetPredictions,
}));

// ─── Metrics mock ─────────────────────────────────────────────────────────────

const { mockCalculateAggregateMetrics } = vi.hoisted(() => ({
  mockCalculateAggregateMetrics: vi.fn(),
}));

vi.mock('@/lib/history/metrics', () => ({
  calculateAggregateMetrics: mockCalculateAggregateMetrics,
}));

import { GET } from '@/app/api/history/route';

const TEST_USER_ID = 'user-uuid-123';

const stubMetrics = {
  mae: 5.2,
  captainHitRate: 75,
  correlation: 0.8,
  totalGameweeks: 2,
  gameweeksWithActuals: 2,
};

const stubPredictions: PredictionRecord[] = [
  {
    gameweek: 2,
    timestamp: '2024-01-15T00:00:00Z',
    predictions: [{ playerId: 1, playerName: 'Salah', expectedPoints: 8.5, actualPoints: 12 }],
    totalExpectedPoints: 60,
    totalActualPoints: 70,
    captain: { playerId: 1, playerName: 'Salah' },
  },
  {
    gameweek: 1,
    timestamp: '2024-01-08T00:00:00Z',
    predictions: [{ playerId: 2, playerName: 'Haaland', expectedPoints: 9.0, actualPoints: 15 }],
    totalExpectedPoints: 55,
    totalActualPoints: 65,
    captain: { playerId: 2, playerName: 'Haaland' },
  },
];

describe('GET /api/history', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: TEST_USER_ID } }, error: null });
    mockGetPredictions.mockResolvedValue(stubPredictions);
    mockCalculateAggregateMetrics.mockReturnValue(stubMetrics);
  });

  afterEach(() => vi.clearAllMocks());

  it('returns predictions and metrics from the pure read path', async () => {
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.predictions).toHaveLength(2);
    expect(data.metrics).toMatchObject(stubMetrics);
    expect(mockGetPredictions).toHaveBeenCalledWith(TEST_USER_ID);
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 200 with empty predictions when user has none', async () => {
    mockGetPredictions.mockResolvedValue([]);
    mockCalculateAggregateMetrics.mockReturnValue({
      mae: null,
      captainHitRate: null,
      correlation: null,
      totalGameweeks: 0,
      gameweeksWithActuals: 0,
    });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.predictions).toHaveLength(0);
  });

  it('returns 500 when getPredictions throws', async () => {
    mockGetPredictions.mockRejectedValue(new Error('DB connection failed'));

    const res = await GET();
    expect(res.status).toBe(500);
  });
});
