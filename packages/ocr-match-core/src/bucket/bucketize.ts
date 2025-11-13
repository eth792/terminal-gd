/**
 * 分桶模块
 * 根据匹配结果和阈值自动分类为 exact/review/fail
 */
import type { ScoredCandidate } from '../match/rank.js';
import { FailReason, type BucketResult } from './reasons.js';

/**
 * 分桶配置
 */
export interface BucketConfig {
  autoPass: number;      // 自动通过阈值（默认 0.70）
  minFieldSim: number;   // 单字段最低相似度（默认 0.60）
  minDeltaTop: number;   // Top1-Top2 最小差值（默认 0.03）
}

/**
 * 分桶逻辑（核心函数）
 *
 * @param q1 - 提取的查询字段1（supplier）
 * @param q2 - 提取的查询字段2（project）
 * @param candidates - 候选数组（已排序）
 * @param config - 分桶配置
 * @returns 分桶结果
 */
export function bucketize(
  q1: string,
  q2: string,
  candidates: ScoredCandidate[],
  config: BucketConfig
): BucketResult {
  // 规则1: 提取失败 → fail
  if (!q1 && !q2) {
    return { bucket: 'fail', reason: FailReason.EXTRACT_BOTH_EMPTY };
  }
  if (!q1) {
    return { bucket: 'fail', reason: FailReason.EXTRACT_EMPTY_SUPPLIER };
  }
  if (!q2) {
    return { bucket: 'fail', reason: FailReason.EXTRACT_EMPTY_PROJECT };
  }

  // 规则2: 无候选 → fail
  const top1 = candidates[0];
  if (!top1) {
    return { bucket: 'fail', reason: FailReason.NO_CANDIDATES };
  }

  // 规则3: 单字段相似度过低 → fail
  if (top1.f1_score < config.minFieldSim) {
    return { bucket: 'fail', reason: FailReason.FIELD_SIM_LOW_SUPPLIER };
  }
  if (top1.f2_score < config.minFieldSim) {
    return { bucket: 'fail', reason: FailReason.FIELD_SIM_LOW_PROJECT };
  }

  // 规则4: 高置信度旁路 - 极高分数直接通过，忽略 delta
  // 修复设计缺陷：避免高质量匹配被 delta 检查误判为 review
  if (top1.score >= 0.90 && top1.f1_score >= 0.80 && top1.f2_score >= 0.80) {
    return { bucket: 'exact', reason: null };
  }

  // 规则5: Top1-Top2 差值过小 → review
  const top2 = candidates[1];
  const delta = top2 ? top1.score - top2.score : 1.0; // 只有1个候选时，delta=1.0
  if (delta < config.minDeltaTop) {
    return { bucket: 'review', reason: FailReason.DELTA_TOO_SMALL };
  }

  // 规则6: 自动通过检查
  if (
    top1.score >= config.autoPass &&
    top1.f1_score >= config.minFieldSim &&
    top1.f2_score >= config.minFieldSim &&
    delta >= config.minDeltaTop
  ) {
    return { bucket: 'exact', reason: null };
  }

  // 默认 review
  return { bucket: 'review', reason: FailReason.SCORE_BELOW_AUTO_PASS };
}

/**
 * 默认分桶配置
 */
export const DEFAULT_BUCKET_CONFIG: BucketConfig = {
  autoPass: 0.70,
  minFieldSim: 0.60,
  minDeltaTop: 0.03,
};
