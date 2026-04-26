/**
 * Historical prediction metrics calculation
 * 
 * Provides functions to calculate accuracy metrics from predictions with actuals:
 * - Mean Absolute Error (MAE): Average absolute difference between expected and actual points
 * - Captain Hit Rate: Percentage of gameweeks where captain was the highest scorer
 * - Pearson Correlation: Linear correlation between expected and actual points
 */

import type { PredictionRecord } from './predictions';

/**
 * Aggregate metrics for historical predictions
 */
export interface AggregateMetrics {
  mae: number | null;
  captainHitRate: number | null;
  correlation: number | null;
  totalGameweeks: number;
  gameweeksWithActuals: number;
}

/**
 * Calculate Mean Absolute Error across all predictions with actuals
 * 
 * MAE = (1/n) * Σ|expected - actual|
 * 
 * @param predictions - Predictions with actuals
 * @returns MAE value, or null if no actuals available
 */
export function calculateMAE(predictions: PredictionRecord[]): number | null {
  const recordsWithActuals = predictions.filter(
    (p) => p.totalActualPoints !== undefined
  );
  
  if (recordsWithActuals.length === 0) {
    return null;
  }
  
  const totalAbsoluteError = recordsWithActuals.reduce((sum, record) => {
    const error = Math.abs(record.totalExpectedPoints - record.totalActualPoints!);
    return sum + error;
  }, 0);
  
  const mae = totalAbsoluteError / recordsWithActuals.length;
  
  console.log('[Metrics] Calculated MAE', {
    sampleSize: recordsWithActuals.length,
    mae: mae.toFixed(2),
  });
  
  return mae;
}

/**
 * Calculate captain hit rate
 * 
 * Hit rate = (gameweeks where captain was top scorer) / (total gameweeks with actuals)
 * 
 * @param predictions - Predictions with actuals
 * @returns Hit rate as percentage (0-100), or null if no actuals available
 */
export function calculateCaptainHitRate(predictions: PredictionRecord[]): number | null {
  const recordsWithActuals = predictions.filter(
    (p) => p.totalActualPoints !== undefined
  );
  
  if (recordsWithActuals.length === 0) {
    return null;
  }
  
  let captainHits = 0;
  
  for (const record of recordsWithActuals) {
    // Find player with highest actual points
    const playersWithActuals = record.predictions.filter(
      (p) => p.actualPoints !== undefined
    );
    
    if (playersWithActuals.length === 0) {
      continue;
    }
    
    const topScorer = playersWithActuals.reduce((max, p) =>
      p.actualPoints! > max.actualPoints! ? p : max
    );
    
    // Check if captain was the top scorer
    if (topScorer.playerId === record.captain.playerId) {
      captainHits++;
    }
  }
  
  const hitRate = (captainHits / recordsWithActuals.length) * 100;
  
  console.log('[Metrics] Calculated captain hit rate', {
    sampleSize: recordsWithActuals.length,
    captainHits,
    hitRate: hitRate.toFixed(1) + '%',
  });
  
  return hitRate;
}

/**
 * Calculate Pearson correlation coefficient between expected and actual points
 * 
 * r = Σ((x - x̄)(y - ȳ)) / √(Σ(x - x̄)² * Σ(y - ȳ)²)
 * 
 * @param predictions - Predictions with actuals
 * @returns Correlation coefficient (-1 to 1), or null if insufficient data
 */
export function calculateCorrelation(predictions: PredictionRecord[]): number | null {
  const recordsWithActuals = predictions.filter(
    (p) => p.totalActualPoints !== undefined
  );
  
  if (recordsWithActuals.length < 2) {
    return null;
  }
  
  const expected = recordsWithActuals.map((p) => p.totalExpectedPoints);
  const actual = recordsWithActuals.map((p) => p.totalActualPoints!);
  
  const n = expected.length;
  const meanExpected = expected.reduce((sum, val) => sum + val, 0) / n;
  const meanActual = actual.reduce((sum, val) => sum + val, 0) / n;
  
  let numerator = 0;
  let sumSquaredDiffExpected = 0;
  let sumSquaredDiffActual = 0;
  
  for (let i = 0; i < n; i++) {
    const diffExpected = expected[i] - meanExpected;
    const diffActual = actual[i] - meanActual;
    
    numerator += diffExpected * diffActual;
    sumSquaredDiffExpected += diffExpected * diffExpected;
    sumSquaredDiffActual += diffActual * diffActual;
  }
  
  const denominator = Math.sqrt(sumSquaredDiffExpected * sumSquaredDiffActual);
  
  if (denominator === 0) {
    return null;
  }
  
  const correlation = numerator / denominator;
  
  console.log('[Metrics] Calculated correlation', {
    sampleSize: n,
    correlation: correlation.toFixed(3),
  });
  
  return correlation;
}

/**
 * Calculate all aggregate metrics for historical predictions
 * 
 * @param predictions - All predictions (with or without actuals)
 * @returns Aggregate metrics object
 */
export function calculateAggregateMetrics(predictions: PredictionRecord[]): AggregateMetrics {
  const gameweeksWithActuals = predictions.filter(
    (p) => p.totalActualPoints !== undefined
  ).length;
  
  const metrics: AggregateMetrics = {
    mae: calculateMAE(predictions),
    captainHitRate: calculateCaptainHitRate(predictions),
    correlation: calculateCorrelation(predictions),
    totalGameweeks: predictions.length,
    gameweeksWithActuals,
  };
  
  console.log('[Metrics] Aggregate metrics calculated', {
    totalGameweeks: metrics.totalGameweeks,
    gameweeksWithActuals: metrics.gameweeksWithActuals,
    mae: metrics.mae?.toFixed(2) ?? 'null',
    captainHitRate: metrics.captainHitRate?.toFixed(1) ?? 'null',
    correlation: metrics.correlation?.toFixed(3) ?? 'null',
  });
  
  return metrics;
}
