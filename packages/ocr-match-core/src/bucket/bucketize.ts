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
  autoPass: number;         // 自动通过阈值（默认 0.75，v0.1.7 提高）
  minFieldSim: number;      // 单字段最低相似度（默认 0.60）
  minDeltaTop: number;      // Top1-Top2 最小差值（默认 0.03）
  supplierHardMin?: number; // v0.1.7: 供应商硬阈值（默认 0.58）
  minReview?: number;       // v0.1.7: review 最低分（默认 0.65）
  weights?: [number, number]; // v0.1.7: [supplier, project] 权重（默认 [0.7, 0.3]）
}

/**
 * 检查供应商硬阈值（v0.1.7）
 * @param f1_score - 供应商相似度
 * @param supplierHardMin - 供应商硬阈值
 * @returns true 表示通过硬阈值检查
 */
function applySupplierHardThreshold(f1_score: number, supplierHardMin: number): boolean {
  return f1_score >= supplierHardMin;
}

/**
 * 计算加权分数（v0.1.7）
 * @param f1_score - 供应商相似度
 * @param f2_score - 项目相似度
 * @param weights - [supplier, project] 权重
 * @returns 加权分数
 */
function calculateWeightedScore(f1_score: number, f2_score: number, weights: [number, number]): number {
  return weights[0] * f1_score + weights[1] * f2_score;
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
  // v0.1.9 Scheme A: 动态阈值计算（内联函数）
  // 当 max(f1, f2) > 0.8 时，降低阈值门槛，允许更多高置信度案例通过
  function getDynamicThreshold(f1: number, f2: number, baseThreshold: number): number {
    const maxScore = Math.max(f1, f2);
    if (maxScore <= 0.8) {
      return baseThreshold;  // 低置信度场景，保持严格
    }
    // 高置信度补偿：最多放宽 0.1（0.6 → 0.5）
    const compensation = (maxScore - 0.8) * 0.5;
    return Math.max(0.5, baseThreshold - compensation);  // 下限 0.5
  }

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

  // v0.1.9 Scheme A: 计算动态阈值
  // 基于 top1 的分数动态调整阈值，应用于 Rule 3/4/7
  const dynamicThreshold = getDynamicThreshold(
    top1.f1_score,
    top1.f2_score,
    config.minFieldSim
  );

  // 规则3: 单字段相似度过低 → fail (使用动态阈值)
  if (top1.f2_score < dynamicThreshold) {
    return { bucket: 'fail', reason: FailReason.FIELD_SIM_LOW_PROJECT };
  }

  // v0.1.7 规则3.5: 供应商硬阈值检查
  // 供应商是 primary key，低于硬阈值直接失败，无论项目相似度多高
  const supplierHardMin = config.supplierHardMin ?? 0.58;
  if (!applySupplierHardThreshold(top1.f1_score, supplierHardMin)) {
    return { bucket: 'fail', reason: FailReason.SUPPLIER_HARD_REJECT };
  }

  // 规则4: 供应商相似度过低 → fail (使用动态阈值)
  if (top1.f1_score < dynamicThreshold) {
    return { bucket: 'fail', reason: FailReason.FIELD_SIM_LOW_SUPPLIER };
  }

  // 规则5: 高置信度旁路 - 极高分数直接通过，忽略 delta
  // 修复设计缺陷：避免高质量匹配被 delta 检查误判为 review
  // v0.1.5: 降低阈值以救回边界案例（score 0.90→0.85, f2_score 0.80→0.75）
  if (top1.score >= 0.85 && top1.f1_score >= 0.80 && top1.f2_score >= 0.75) {
    return { bucket: 'exact', reason: null };
  }

  // 规则6: Top1-Top2 差值过小 → review
  const top2 = candidates[1];
  const delta = top2 ? top1.score - top2.score : 1.0; // 只有1个候选时，delta=1.0
  if (delta < config.minDeltaTop) {
    return { bucket: 'review', reason: FailReason.DELTA_TOO_SMALL };
  }

  // v0.1.7 规则7: 加权分数计算和分桶
  const weights = config.weights ?? [0.7, 0.3];
  const weightedScore = calculateWeightedScore(top1.f1_score, top1.f2_score, weights);
  const minReview = config.minReview ?? 0.65;

  // 自动通过检查（使用加权分数和动态阈值）
  if (
    weightedScore >= config.autoPass &&
    top1.f1_score >= dynamicThreshold &&
    top1.f2_score >= dynamicThreshold &&
    delta >= config.minDeltaTop
  ) {
    return { bucket: 'exact', reason: null };
  }

  // 分数在 review 区间
  if (weightedScore >= minReview && weightedScore < config.autoPass) {
    return { bucket: 'review', reason: FailReason.SCORE_BORDERLINE };
  }

  // 分数过低 → fail
  return { bucket: 'fail', reason: FailReason.SCORE_TOO_LOW };
}

/**
 * 默认分桶配置（v0.1.7 更新）
 */
export const DEFAULT_BUCKET_CONFIG: BucketConfig = {
  autoPass: 0.75,           // v0.1.7: 提高自动通过阈值
  minFieldSim: 0.60,
  minDeltaTop: 0.03,
  supplierHardMin: 0.58,    // v0.1.7: 供应商硬阈值
  minReview: 0.65,          // v0.1.7: review 最低分
  weights: [0.7, 0.3],      // v0.1.7: 供应商 70%, 项目 30%
};
