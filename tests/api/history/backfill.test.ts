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

const { mockBackfillActuals } = vi.hoisted(() => ({ mockBackfillActuals: vi.fn() }));

vi.mock('@/lib/history/predictions', () => ({
  backfillActuals: mockBackfillActuals,
}));

import { POST } from '@/app/api/history/backfill/route';
import { NextRequest } from 'next/server';

const TEST_USER_ID = 'user-uuid-123';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/history/backfill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const sampleRecord: PredictionRecord = {
  gameweek: 3,
  timestamp: '2024-01-15T00:00:00Z',
  predictions: [{ playerId: 1, playerName: 'Salah', expectedPoints: 8.5, actualPoints: 12 }],
  totalExpectedPoints: 60,
  totalActualPoints: 72,
  captain: { playerId: 1, playerName: 'Salah' },
};

describe('POST /api/history/backfill', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: TEST_USER_ID } }, error: null });
  });

  afterEach(() => vi.clearAllMocks());

  it('returns the backfilled record on success', async () => {
    mockBackfillActuals.mockResolvedValue(sampleRecord);

    const res = await POST(makeRequest({ gameweek: 3 }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.gameweek).toBe(3);
    expect(data.totalActualPoints).toBe(72);
    expect(mockBackfillActuals).toHaveBeenCalledWith(TEST_USER_ID, 3);
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await POST(makeRequest({ gameweek: 3 }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
    expect(mockBackfillActuals).not.toHaveBeenCalled();
  });

  it('returns 400 when gameweek is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 when gameweek is not a positive integer', async () => {
    const res = await POST(makeRequest({ gameweek: 0 }));
    expect(res.status).toBe(400);

    const res2 = await POST(makeRequest({ gameweek: -1 }));
    expect(res2.status).toBe(400);

    const res3 = await POST(makeRequest({ gameweek: 'three' }));
    expect(res3.status).toBe(400);
  });

  it('returns 500 when backfillActuals throws', async () => {
    mockBackfillActuals.mockRejectedValue(new Error('No prediction found for gameweek 99'));

    const res = await POST(makeRequest({ gameweek: 99 }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Failed to backfill actuals');
  });

  it('reads userId from the session, not the request body', async () => {
    mockBackfillActuals.mockResolvedValue(sampleRecord);

    await POST(makeRequest({ gameweek: 3, userId: 'attacker-supplied-id' }));

    expect(mockBackfillActuals).toHaveBeenCalledWith(TEST_USER_ID, 3);
  });
});
