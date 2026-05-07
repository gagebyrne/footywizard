import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Player } from '@/lib/types/fpl';
import {
  savePrediction,
  backfillActuals,
  getPredictions,
  resetFplInstance,
  type PlayerPrediction,
} from '@/lib/history/predictions';

// ─── FPL Mocks ───────────────────────────────────────────────────────────────

const mockGetBootstrapData = vi.fn();
const mockGetPlayer = vi.fn();

vi.mock('fpl-fetch', () => ({
  default: class FplFetch {
    getBootstrapData = mockGetBootstrapData;
    getPlayer = mockGetPlayer;
  },
}));

// ─── Supabase Mocks ───────────────────────────────────────────────────────────

const { mockFrom, mockUpsert, mockSelect, mockEqUser, mockOrder, mockEqGameweek, mockUpdate, mockEqUpdate } =
  vi.hoisted(() => ({
    mockFrom: vi.fn(),
    mockUpsert: vi.fn(),
    mockSelect: vi.fn(),
    mockEqUser: vi.fn(),
    mockOrder: vi.fn(),
    mockEqGameweek: vi.fn(),
    mockUpdate: vi.fn(),
    mockEqUpdate: vi.fn(),
  }));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: mockFrom },
}));

interface TestRow {
  id: string;
  user_id: string;
  gameweek: number;
  timestamp: string;
  total_expected_points: number;
  total_actual_points: number | null;
  fpl_expected_points: number | null;
  formation: string | null;
  captain_player_id: number;
  captain_player_name: string;
  players: PlayerPrediction[];
}

const TEST_USER_ID = 'test-user-uuid';

function setupReadMock(rows: TestRow[]) {
  mockSelect.mockReturnValue({ eq: mockEqUser });
  mockEqUser.mockReturnValue({ order: mockOrder, eq: mockEqGameweek });
  mockOrder.mockResolvedValue({ data: rows, error: null });
}

function setupSingleRowMock(row: TestRow | null) {
  mockSelect.mockReturnValue({ eq: mockEqUser });
  mockEqUser.mockReturnValue({ order: mockOrder, eq: mockEqGameweek });
  mockEqGameweek.mockResolvedValue({ data: row ? [row] : [], error: null });
}

function setupWriteMocks() {
  mockUpsert.mockResolvedValue({ error: null });
  mockUpdate.mockReturnValue({ eq: mockEqUpdate });
  mockEqUpdate.mockResolvedValue({ error: null });
}

function makeRow(
  gameweek: number,
  players: PlayerPrediction[],
  captainId = 1,
  totalActual: number | null = null,
  fplExpectedPoints: number | null = null
): TestRow {
  return {
    id: `row-gw${gameweek}`,
    user_id: TEST_USER_ID,
    gameweek,
    timestamp: new Date().toISOString(),
    total_expected_points: players.reduce((s, p) => s + p.expectedPoints, 0),
    total_actual_points: totalActual,
    fpl_expected_points: fplExpectedPoints,
    formation: '4-4-2',
    captain_player_id: captainId,
    captain_player_name: players.find((p) => p.playerId === captainId)?.playerName ?? '',
    players,
  };
}

describe('savePrediction', () => {
  beforeEach(() => {
    mockFrom.mockReturnValue({ upsert: mockUpsert, select: mockSelect, update: mockUpdate });
    setupWriteMocks();
  });

  afterEach(() => vi.clearAllMocks());

  it('should upsert with correct fields', async () => {
    const lineup: Player[] = [
      { id: 1, web_name: 'Salah', ep_next: '8.5' } as Player,
      { id: 2, web_name: 'Haaland', ep_next: '9.2' } as Player,
    ];
    const captain: Player = { id: 1, web_name: 'Salah' } as Player;

    await savePrediction(TEST_USER_ID, 1, lineup, captain, 65.5);

    expect(mockUpsert).toHaveBeenCalledOnce();
    const [upsertData] = mockUpsert.mock.calls[0];
    expect(upsertData.user_id).toBe(TEST_USER_ID);
    expect(upsertData.gameweek).toBe(1);
    expect(upsertData.total_expected_points).toBe(65.5);
    expect(upsertData.captain_player_id).toBe(1);
    expect(upsertData.captain_player_name).toBe('Salah');
    expect(upsertData.players).toHaveLength(2);
    expect(upsertData.players[0]).toMatchObject({ playerId: 1, playerName: 'Salah', expectedPoints: 8.5 });
    expect(upsertData.players[1]).toMatchObject({ playerId: 2, playerName: 'Haaland', expectedPoints: 9.2 });
  });

  it('should include formation when provided', async () => {
    const lineup: Player[] = [{ id: 1, web_name: 'Salah', ep_next: '8.5' } as Player];
    const captain: Player = { id: 1, web_name: 'Salah' } as Player;

    await savePrediction(TEST_USER_ID, 1, lineup, captain, 60.0, '4-3-3');

    const [upsertData] = mockUpsert.mock.calls[0];
    expect(upsertData.formation).toBe('4-3-3');
  });

  it('should upsert with onConflict user_id,gameweek', async () => {
    const lineup: Player[] = [{ id: 1, web_name: 'Salah', ep_next: '8.5' } as Player];
    const captain: Player = { id: 1, web_name: 'Salah' } as Player;

    await savePrediction(TEST_USER_ID, 1, lineup, captain, 60.0);

    const [, upsertOpts] = mockUpsert.mock.calls[0];
    expect(upsertOpts.onConflict).toBe('user_id,gameweek');
  });

  it('should default expectedPoints to 0 when ep_next is missing', async () => {
    const lineup: Player[] = [{ id: 1, web_name: 'Salah' } as Player];
    const captain: Player = { id: 1, web_name: 'Salah' } as Player;

    await savePrediction(TEST_USER_ID, 1, lineup, captain, 60.0);

    const [upsertData] = mockUpsert.mock.calls[0];
    expect(upsertData.players[0].expectedPoints).toBe(0);
  });

  it('should store fpl_expected_points as sum of ep_this across lineup', async () => {
    const lineup: Player[] = [
      { id: 1, web_name: 'Salah', ep_next: '8.5', ep_this: '7.2' } as Player,
      { id: 2, web_name: 'Haaland', ep_next: '9.2', ep_this: '10.1' } as Player,
    ];
    const captain: Player = { id: 1, web_name: 'Salah' } as Player;

    await savePrediction(TEST_USER_ID, 1, lineup, captain, 65.5);

    const [upsertData] = mockUpsert.mock.calls[0];
    expect(upsertData.fpl_expected_points).toBeCloseTo(17.3);
  });

  it('should treat ep_this null as 0 in fpl_expected_points sum', async () => {
    const lineup: Player[] = [
      { id: 1, web_name: 'Salah', ep_this: '7.2' } as Player,
      { id: 2, web_name: 'Haaland', ep_this: null } as Player,
    ];
    const captain: Player = { id: 1, web_name: 'Salah' } as Player;

    await savePrediction(TEST_USER_ID, 1, lineup, captain, 50.0);

    const [upsertData] = mockUpsert.mock.calls[0];
    expect(upsertData.fpl_expected_points).toBeCloseTo(7.2);
  });

  it('should not throw when upsert fails', async () => {
    mockUpsert.mockResolvedValue({ error: { message: 'DB error' } });

    const lineup: Player[] = [{ id: 1, web_name: 'Salah', ep_next: '8.5' } as Player];
    const captain: Player = { id: 1, web_name: 'Salah' } as Player;

    await expect(savePrediction(TEST_USER_ID, 1, lineup, captain, 60.0)).resolves.toBeUndefined();
  });
});

describe('getPredictions', () => {
  beforeEach(() => {
    mockFrom.mockReturnValue({ upsert: mockUpsert, select: mockSelect, update: mockUpdate });
    setupWriteMocks();
    resetFplInstance();
  });

  afterEach(() => vi.clearAllMocks());

  it('should return stored rows without calling the FPL API', async () => {
    const rows = [
      makeRow(2, [{ playerId: 1, playerName: 'Salah', expectedPoints: 8.5 }], 1, null),
      makeRow(1, [{ playerId: 1, playerName: 'Salah', expectedPoints: 8.5 }], 1, 20),
    ];
    setupReadMock(rows);

    const result = await getPredictions(TEST_USER_ID);

    expect(mockGetBootstrapData).not.toHaveBeenCalled();
    expect(mockGetPlayer).not.toHaveBeenCalled();
    expect(result).toHaveLength(2);
  });

  it('should map stored rows to PredictionRecord shape', async () => {
    const rows = [makeRow(1, [{ playerId: 1, playerName: 'Salah', expectedPoints: 8.5 }], 1, 20, 17.3)];
    setupReadMock(rows);

    const result = await getPredictions(TEST_USER_ID);

    expect(result[0].gameweek).toBe(1);
    expect(result[0].totalActualPoints).toBe(20);
    expect(result[0].fplExpectedPoints).toBeCloseTo(17.3);
    expect(result[0].captain.playerId).toBe(1);
  });

  it('should return rows with totalActualPoints undefined when column is null', async () => {
    const rows = [makeRow(1, [{ playerId: 1, playerName: 'Salah', expectedPoints: 8.5 }], 1, null)];
    setupReadMock(rows);

    const result = await getPredictions(TEST_USER_ID);

    expect(result[0].totalActualPoints).toBeUndefined();
  });

  it('should return empty array when user has no predictions', async () => {
    setupReadMock([]);

    const result = await getPredictions(TEST_USER_ID);

    expect(result).toHaveLength(0);
    expect(mockGetBootstrapData).not.toHaveBeenCalled();
  });
});

describe('backfillActuals', () => {
  beforeEach(() => {
    mockFrom.mockReturnValue({ upsert: mockUpsert, select: mockSelect, update: mockUpdate });
    setupWriteMocks();
    resetFplInstance();
  });

  afterEach(() => vi.clearAllMocks());

  it('should backfill actuals for a finished gameweek', async () => {
    const row = makeRow(1, [
      { playerId: 1, playerName: 'Salah', expectedPoints: 8.5 },
      { playerId: 2, playerName: 'Haaland', expectedPoints: 9.2 },
    ], 1);
    setupSingleRowMock(row);

    mockGetBootstrapData.mockResolvedValue({
      events: [{ id: 1, finished: true }, { id: 2, finished: false }],
      elements: [], teams: [],
    });
    mockGetPlayer
      .mockResolvedValueOnce({ history: [{ round: 1, total_points: 12 }] })
      .mockResolvedValueOnce({ history: [{ round: 1, total_points: 8 }] });

    const result = await backfillActuals(TEST_USER_ID, 1);

    expect(result.predictions[0].actualPoints).toBe(12);
    expect(result.predictions[1].actualPoints).toBe(8);
    // Captain (Salah) doubled: (12 * 2) + 8 = 32
    expect(result.totalActualPoints).toBe(32);
  });

  it('should return the row unmodified when gameweek is not finished', async () => {
    const row = makeRow(2, [{ playerId: 1, playerName: 'Salah', expectedPoints: 8.5 }], 1);
    setupSingleRowMock(row);

    mockGetBootstrapData.mockResolvedValue({
      events: [{ id: 1, finished: true }, { id: 2, finished: false }],
      elements: [], teams: [],
    });

    const result = await backfillActuals(TEST_USER_ID, 2);

    expect(result.totalActualPoints).toBeUndefined();
    expect(mockGetPlayer).not.toHaveBeenCalled();
  });

  it('should return the row unmodified when actuals already present', async () => {
    const row = makeRow(1, [{ playerId: 1, playerName: 'Salah', expectedPoints: 8.5, actualPoints: 12 }], 1, 24);
    setupSingleRowMock(row);

    mockGetBootstrapData.mockResolvedValue({
      events: [{ id: 1, finished: true }],
      elements: [], teams: [],
    });

    const result = await backfillActuals(TEST_USER_ID, 1);

    expect(mockGetPlayer).not.toHaveBeenCalled();
    expect(result.totalActualPoints).toBe(24);
  });

  it('should handle individual player API errors gracefully and continue', async () => {
    const row = makeRow(1, [
      { playerId: 1, playerName: 'Salah', expectedPoints: 8.5 },
      { playerId: 2, playerName: 'Haaland', expectedPoints: 9.2 },
    ], 1);
    setupSingleRowMock(row);

    mockGetBootstrapData.mockResolvedValue({
      events: [{ id: 1, finished: true }],
      elements: [], teams: [],
    });
    mockGetPlayer
      .mockResolvedValueOnce({ history: [{ round: 1, total_points: 12 }] })
      .mockRejectedValueOnce(new Error('API rate limit'));

    const result = await backfillActuals(TEST_USER_ID, 1);

    expect(result.predictions[0].actualPoints).toBe(12);
    expect(result.predictions[1].actualPoints).toBeUndefined();
    // Only Salah (captain, doubled): 12 * 2 = 24
    expect(result.totalActualPoints).toBe(24);
  });

  it('should throw when no prediction row exists for the gameweek', async () => {
    setupSingleRowMock(null);

    await expect(backfillActuals(TEST_USER_ID, 99)).rejects.toThrow(
      'No prediction found for gameweek 99'
    );
  });

  it('should include fplExpectedPoints in returned record when stored', async () => {
    const row = makeRow(1, [{ playerId: 1, playerName: 'Salah', expectedPoints: 8.5 }], 1, null, 17.3);
    setupSingleRowMock(row);

    mockGetBootstrapData.mockResolvedValue({
      events: [{ id: 1, finished: false }],
      elements: [], teams: [],
    });

    const result = await backfillActuals(TEST_USER_ID, 1);

    expect(result.fplExpectedPoints).toBeCloseTo(17.3);
  });
});
