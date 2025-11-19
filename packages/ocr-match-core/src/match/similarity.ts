/**
 * 相似度计算模块
 * 提供编辑距离、Jaccard 相似度和混合打分函数
 */
import { distance as levenshtein } from 'fastest-levenshtein';
import { tokenize } from '../indexer/builder.js';

/**
 * 归一化函数类型（可选）
 * 用于在相似度计算前对字符串进行预处理
 */
export type Normalizer = (text: string) => string;

/**
 * 编辑距离相似度（归一化到 [0, 1]）
 * 1.0 表示完全相同，0.0 表示完全不同
 *
 * @param normalizer - 可选的归一化函数，在比较前应用于两个字符串
 */
export function levenshteinSimilarity(s1: string, s2: string, normalizer?: Normalizer): number {
  // 应用归一化（如果提供）
  const ns1 = normalizer ? normalizer(s1) : s1;
  const ns2 = normalizer ? normalizer(s2) : s2;

  if (ns1 === ns2) return 1.0;
  if (!ns1 || !ns2) return 0.0;

  const dist = levenshtein(ns1, ns2);
  const maxLen = Math.max(ns1.length, ns2.length);
  return maxLen === 0 ? 1.0 : 1 - dist / maxLen;
}

/**
 * Jaccard 相似度（基于 n-gram token 集合）
 * 计算两个字符串的 n-gram token 集合的交集/并集比例
 *
 * @param normalizer - 可选的归一化函数，在比较前应用于两个字符串
 */
export function jaccardSimilarity(s1: string, s2: string, n = 2, normalizer?: Normalizer): number {
  // 应用归一化（如果提供）
  const ns1 = normalizer ? normalizer(s1) : s1;
  const ns2 = normalizer ? normalizer(s2) : s2;

  if (ns1 === ns2) return 1.0;
  if (!ns1 || !ns2) return 0.0;

  const tokens1 = new Set(tokenize(ns1, n));
  const tokens2 = new Set(tokenize(ns2, n));

  // 计算交集
  const intersection = [...tokens1].filter(t => tokens2.has(t)).length;

  // 计算并集
  const union = tokens1.size + tokens2.size - intersection;

  return union === 0 ? 1.0 : intersection / union;
}

/**
 * LCS Ratio - 基于最长公共子串的相似度
 * 容忍一个字符串是另一个的子串
 *
 * 使用动态规划求最长公共子串（Longest Common Substring）长度，
 * 归一化到 [0, 1] 区间。专门用于项目名称匹配（F2），容忍 OCR 不完整
 * 和 DB 额外信息。
 *
 * @param s1 - 字符串1
 * @param s2 - 字符串2
 * @returns LCS 长度 / max(len(s1), len(s2))
 *
 * @example
 * lcsRatio('新荣TOD项目', '新荣TOD项目一期') // ≥ 0.75
 * lcsRatio('ABC', 'ABC')                      // 1.0
 */
export function lcsRatio(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const len1 = s1.length;
  const len2 = s2.length;

  // 动态规划求 LCS 长度
  let maxLen = 0;
  const dp: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        maxLen = Math.max(maxLen, dp[i][j]);
      }
    }
  }

  // 归一化到 [0, 1]
  const maxPossible = Math.max(len1, len2);
  return maxPossible === 0 ? 1.0 : maxLen / maxPossible;
}

/**
 * 混合相似度得分（字段级别）
 * 结合编辑距离和 Jaccard 相似度，权重可调
 *
 * @param q - 查询字符串
 * @param f - 候选字符串
 * @param w - 编辑距离权重（默认 0.5）
 * @param n - n-gram 大小（默认 2）
 * @param normalizer - 可选的归一化函数
 */
export function fieldSimilarity(
  q: string,
  f: string,
  w = 0.5,
  n = 2,
  normalizer?: Normalizer
): number {
  const lev = levenshteinSimilarity(q, f, normalizer);
  const jac = jaccardSimilarity(q, f, n, normalizer);
  return w * lev + (1 - w) * jac;
}

/**
 * 项目名称相似度（针对 F2 优化）
 * 使用 LCS + Jaccard + Levenshtein 混合算法
 *
 * 相比 fieldSimilarity，此函数降低 Levenshtein 权重（减少长度差异惩罚），
 * 增加 LCS 权重（容忍子串匹配），适合处理 OCR 不完整和 DB 额外信息的场景。
 *
 * @param q - 查询字符串（OCR 提取）
 * @param f - 候选字符串（DB）
 * @param normalizer - 可选的归一化函数
 * @returns 相似度分数 [0, 1]
 *
 * @example
 * projectFieldSimilarity('居住、社会福利项目', '居住、社会福利项目（光谷P（2023）028地块')
 * // 返回 > 0.75，高于 fieldSimilarity 的 0.595
 */
export function projectFieldSimilarity(
  q: string,
  f: string,
  normalizer?: Normalizer
): number {
  const ns1 = normalizer ? normalizer(q) : q;
  const ns2 = normalizer ? normalizer(f) : f;

  if (ns1 === ns2) return 1.0;
  if (!ns1 || !ns2) return 0.0;

  // 三种算法
  const lev = levenshteinSimilarity(q, f, normalizer);
  const jac = jaccardSimilarity(q, f, 2, normalizer);
  const lcs = lcsRatio(ns1, ns2); // 使用归一化后的字符串

  // 混合权重（数据驱动调优）
  // Jaccard 和 LCS 容忍子串差异，权重提高
  // Levenshtein 权重降低，减少长度差异惩罚
  return 0.2 * lev + 0.4 * jac + 0.4 * lcs;
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
 * @param normalizer - 可选的归一化函数
 */
export function hybridScore(
  q1: string,
  q2: string,
  f1: string,
  f2: string,
  w = 0.5,
  normalizer?: Normalizer
): number {
  const score1 = fieldSimilarity(q1, f1, w, 2, normalizer);
  const score2 = fieldSimilarity(q2, f2, w, 2, normalizer);
  return (score1 + score2) / 2;
}

/**
 * 计算单个字段的相似度（用于 anchor 策略）
 *
 * @param q - 查询字符串
 * @param f - 候选字符串
 * @param isProjectField - 是否为项目字段（f2），默认 false
 * @param normalizer - 可选的归一化函数
 *
 * @remarks
 * - 当 isProjectField=false 时，使用标准算法（50% Lev + 50% Jac）
 * - 当 isProjectField=true 时，使用项目优化算法（20% Lev + 40% Jac + 40% LCS）
 * - 默认行为保持不变（向后兼容）
 */
export function singleFieldScore(
  q: string,
  f: string,
  isProjectField: boolean = false,
  normalizer?: Normalizer
): number {
  if (isProjectField) {
    return projectFieldSimilarity(q, f, normalizer);
  }
  return fieldSimilarity(q, f, 0.5, 2, normalizer);
}
