/**
 * 匹配策略模块
 * 实现三种匹配策略：fast-exact、anchor、recall+rank
 */
import type { InvertedIndex, DbRow } from '../indexer/types.js';
import { recallByBothFields, lookupRows, recallWithPrefilter } from './recall.js';
import { scoreAndRank, type ScoredCandidate } from './rank.js';
import { singleFieldScore, type Normalizer } from './similarity.js';

export type MatchMode = 'fast-exact' | 'anchor' | 'recall';

export interface MatchResult {
  mode: MatchMode;
  candidates: ScoredCandidate[];
  recalledCount: number; // 召回候选数
}

/**
 * 策略1: Fast-Exact（快速完全匹配）
 * 检查是否有完全匹配的行（f1 === q1 && f2 === q2）
 *
 * @returns 如果找到完全匹配，返回该行；否则返回 null
 */
export function fastExactMatch(
  q1: string,
  q2: string,
  index: InvertedIndex
): ScoredCandidate | null {
  for (const row of index.rows) {
    if (row.f1 === q1 && row.f2 === q2) {
      return {
        row,
        score: 1.0,
        f1_score: 1.0,
        f2_score: 1.0,
      };
    }
  }
  return null;
}

/**
 * 策略2: Anchor（锚点匹配）
 * 单字段完全匹配 + 另一字段相似度 >= threshold
 *
 * @param threshold - 另一字段的最低相似度阈值（默认 0.6）
 * @param normalizer - 可选的归一化函数
 * @returns 如果找到符合条件的行，返回 TopK；否则返回空数组
 */
export function anchorMatch(
  q1: string,
  q2: string,
  index: InvertedIndex,
  threshold = 0.6,
  topK = 3,
  normalizer?: Normalizer
): ScoredCandidate[] {
  const candidates: ScoredCandidate[] = [];

  for (const row of index.rows) {
    let matched = false;
    let f1_score = 0;
    let f2_score = 0;

    // 情况1: f1 完全匹配，f2 相似度 >= threshold
    if (row.f1 === q1) {
      f1_score = 1.0;
      f2_score = singleFieldScore(q2, row.f2, normalizer);
      if (f2_score >= threshold) {
        matched = true;
      }
    }
    // 情况2: f2 完全匹配，f1 相似度 >= threshold
    else if (row.f2 === q2) {
      f2_score = 1.0;
      f1_score = singleFieldScore(q1, row.f1, normalizer);
      if (f1_score >= threshold) {
        matched = true;
      }
    }

    if (matched) {
      const score = (f1_score + f2_score) / 2;
      candidates.push({ row, score, f1_score, f2_score });
    }
  }

  // 按分数降序排序，返回 TopK
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, topK);
}

/**
 * 策略3: Recall+Rank（召回+排序）
 * 通过倒排索引召回候选，混合打分，返回 TopK
 *
 * @param normalizer - 可选的归一化函数
 * @returns TopK 候选数组
 */
export function recallAndRank(
  q1: string,
  q2: string,
  index: InvertedIndex,
  topK = 3,
  normalizer?: Normalizer
): { candidates: ScoredCandidate[]; recalledCount: number } {
  // 1. 使用预过滤的召回策略
  const { candidates, stats } = recallWithPrefilter(q1, q2, index, 5000, 2);

  // 2. 打分并排序
  const topCandidates = scoreAndRank(q1, q2, candidates, topK, normalizer);

  return {
    candidates: topCandidates,
    recalledCount: stats.before, // 保持向后兼容：返回过滤前的召回数
  };
}

/**
 * 三阶段匹配主流程（按优先级依次尝试）
 *
 * 1. Fast-Exact: 如果找到完全匹配，立即返回
 * 2. Anchor: 如果找到锚点匹配，返回 TopK
 * 3. Recall+Rank: 兜底策略，召回+打分+排序
 *
 * @param anchorThreshold - Anchor 策略的相似度阈值（默认 0.6）
 * @param topK - 返回候选数（默认 3）
 * @param normalizer - 可选的归一化函数，用于相似度计算前的字符串预处理
 */
export function match(
  q1: string,
  q2: string,
  index: InvertedIndex,
  anchorThreshold = 0.6,
  topK = 3,
  normalizer?: Normalizer
): MatchResult {
  // 策略1: Fast-Exact
  const exactMatch = fastExactMatch(q1, q2, index);
  if (exactMatch) {
    return {
      mode: 'fast-exact',
      candidates: [exactMatch],
      recalledCount: 1,
    };
  }

  // 策略2: Anchor
  const anchorMatches = anchorMatch(q1, q2, index, anchorThreshold, topK, normalizer);
  if (anchorMatches.length > 0) {
    return {
      mode: 'anchor',
      candidates: anchorMatches,
      recalledCount: anchorMatches.length,
    };
  }

  // 策略3: Recall+Rank
  const { candidates, recalledCount } = recallAndRank(q1, q2, index, topK, normalizer);
  return {
    mode: 'recall',
    candidates,
    recalledCount,
  };
}
