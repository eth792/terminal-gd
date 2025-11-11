/**
 * 相似度计算模块
 * 提供编辑距离、Jaccard 相似度和混合打分函数
 */
import { distance as levenshtein } from 'fastest-levenshtein';
import { tokenize } from '../indexer/builder.js';

/**
 * 编辑距离相似度（归一化到 [0, 1]）
 * 1.0 表示完全相同，0.0 表示完全不同
 */
export function levenshteinSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const dist = levenshtein(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  return maxLen === 0 ? 1.0 : 1 - dist / maxLen;
}

/**
 * Jaccard 相似度（基于 n-gram token 集合）
 * 计算两个字符串的 n-gram token 集合的交集/并集比例
 */
export function jaccardSimilarity(s1: string, s2: string, n = 2): number {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const tokens1 = new Set(tokenize(s1, n));
  const tokens2 = new Set(tokenize(s2, n));

  // 计算交集
  const intersection = [...tokens1].filter(t => tokens2.has(t)).length;

  // 计算并集
  const union = tokens1.size + tokens2.size - intersection;

  return union === 0 ? 1.0 : intersection / union;
}

/**
 * 混合相似度得分（字段级别）
 * 结合编辑距离和 Jaccard 相似度，权重可调
 *
 * @param q - 查询字符串
 * @param f - 候选字符串
 * @param w - 编辑距离权重（默认 0.5）
 * @param n - n-gram 大小（默认 2）
 */
export function fieldSimilarity(
  q: string,
  f: string,
  w = 0.5,
  n = 2
): number {
  const lev = levenshteinSimilarity(q, f);
  const jac = jaccardSimilarity(q, f, n);
  return w * lev + (1 - w) * jac;
}

/**
 * 双字段混合得分（最终打分函数）
 * 对 q1/f1 和 q2/f2 分别计算相似度，取平均
 *
 * @param q1 - 查询字段1（supplier）
 * @param q2 - 查询字段2（project）
 * @param f1 - 候选字段1
 * @param f2 - 候选字段2
 * @param w - 编辑距离权重（默认 0.5）
 */
export function hybridScore(
  q1: string,
  q2: string,
  f1: string,
  f2: string,
  w = 0.5
): number {
  const score1 = fieldSimilarity(q1, f1, w);
  const score2 = fieldSimilarity(q2, f2, w);
  return (score1 + score2) / 2;
}

/**
 * 计算单个字段的相似度（用于 anchor 策略）
 */
export function singleFieldScore(q: string, f: string): number {
  return fieldSimilarity(q, f, 0.5, 2);
}
