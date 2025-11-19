/**
 * 排序模块
 * 对召回的候选进行打分和排序
 */
import type { DbRow } from '../indexer/types.js';
import { hybridScore, singleFieldScore, type Normalizer } from './similarity.js';

export interface ScoredCandidate {
  row: DbRow;
  score: number;
  f1_score: number; // 字段1相似度
  f2_score: number; // 字段2相似度
}

/**
 * 对候选行进行打分
 *
 * @param q1 - 查询字段1（supplier）
 * @param q2 - 查询字段2（project）
 * @param candidates - 候选行数组
 * @param normalizer - 可选的归一化函数
 * @returns 打分后的候选数组
 */
export function scoreCandidates(
  q1: string,
  q2: string,
  candidates: DbRow[],
  normalizer?: Normalizer
): ScoredCandidate[] {
  return candidates.map(row => {
    // F1 使用旧算法（供应商匹配）
    const f1_score = singleFieldScore(q1, row.f1, false, normalizer);

    // F2 使用新算法（项目名称匹配）
    const f2_score = singleFieldScore(q2, row.f2, true, normalizer);

    const score = hybridScore(q1, q2, row.f1, row.f2, 0.5, normalizer);

    return {
      row,
      score,
      f1_score,
      f2_score,
    };
  });
}

/**
 * 对打分候选进行排序（降序）并返回 TopK
 *
 * @param scoredCandidates - 已打分的候选数组
 * @param topK - 返回前 K 个结果（默认 3）
 * @returns TopK 候选数组
 */
export function rankCandidates(
  scoredCandidates: ScoredCandidate[],
  topK = 3
): ScoredCandidate[] {
  // 按 score 降序排序
  scoredCandidates.sort((a, b) => b.score - a.score);

  // 返回 TopK
  return scoredCandidates.slice(0, topK);
}

/**
 * 完整的打分+排序流程（快捷函数）
 *
 * @param q1 - 查询字段1
 * @param q2 - 查询字段2
 * @param candidates - 候选行数组
 * @param topK - 返回前 K 个结果
 * @param normalizer - 可选的归一化函数
 * @returns TopK 候选数组（已打分并排序）
 */
export function scoreAndRank(
  q1: string,
  q2: string,
  candidates: DbRow[],
  topK = 3,
  normalizer?: Normalizer
): ScoredCandidate[] {
  const scored = scoreCandidates(q1, q2, candidates, normalizer);
  return rankCandidates(scored, topK);
}
