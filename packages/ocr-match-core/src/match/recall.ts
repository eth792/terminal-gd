/**
 * 召回模块
 * 从倒排索引中快速召回候选行
 */
import { tokenize } from '../indexer/builder.js';
import type { DbRow, InvertedIndex } from '../indexer/types.js';
import { logger } from '../util/log.js';

/**
 * 计算两个 token 数组的重叠数量
 */
function countTokenOverlap(tokens1: string[], tokens2: string[]): number {
  const set1 = new Set(tokens1);
  let overlap = 0;
  for (const token of tokens2) {
    if (set1.has(token)) {
      overlap++;
    }
  }
  return overlap;
}

/**
 * 从倒排索引中召回候选行 ID
 * 策略：查询字符串的每个 token 在倒排索引中查找，收集所有匹配的行 ID
 *
 * @param query - 查询字符串
 * @param invertedIndex - 倒排索引（token → [rowIDs]）
 * @param n - n-gram 大小（默认 2）
 * @returns 候选行 ID 数组（去重）
 */
export function recallByTokens(
  query: string,
  invertedIndex: Record<string, string[]>,
  n = 2
): string[] {
  if (!query) return [];

  const tokens = tokenize(query, n);
  const candidateSet = new Set<string>();

  for (const token of tokens) {
    const rowIds = invertedIndex[token] || [];
    for (const id of rowIds) {
      candidateSet.add(id);
    }
  }

  return Array.from(candidateSet);
}

/**
 * 双字段联合召回（q1 和 q2 的 token 都参与召回）
 *
 * @param q1 - 查询字段1
 * @param q2 - 查询字段2
 * @param invertedIndex - 倒排索引
 * @param n - n-gram 大小
 * @returns 候选行 ID 数组
 */
export function recallByBothFields(
  q1: string,
  q2: string,
  invertedIndex: Record<string, string[]>,
  n = 2
): string[] {
  const tokens1 = tokenize(q1, n);
  const tokens2 = tokenize(q2, n);
  const allTokens = [...tokens1, ...tokens2];

  const candidateSet = new Set<string>();

  for (const token of allTokens) {
    const rowIds = invertedIndex[token] || [];
    for (const id of rowIds) {
      candidateSet.add(id);
    }
  }

  return Array.from(candidateSet);
}

/**
 * 从行 ID 列表中查找完整的 DbRow 对象
 *
 * @param rowIds - 行 ID 数组
 * @param rows - 所有行数据
 * @returns DbRow 数组
 */
export function lookupRows(rowIds: string[], rows: DbRow[]): DbRow[] {
  const rowMap = new Map(rows.map(r => [r.id, r]));
  return rowIds.map(id => rowMap.get(id)).filter((r): r is DbRow => r !== undefined);
}

/**
 * 两阶段召回（性能优化版本）
 * 阶段1：廉价过滤 - 只保留 token overlap >= minOverlap 的候选
 * 阶段2：精确排序 - 对过滤后的候选计算编辑距离
 *
 * @param q1 - 查询字段1
 * @param q2 - 查询字段2
 * @param index - 完整索引对象
 * @param maxCand - 最大候选数
 * @param minOverlap - 最小 token 重叠数（默认 2）
 * @returns { candidates: DbRow[], stats: { before, after, ratio, ms } }
 */
export function recallWithPrefilter(
  q1: string,
  q2: string,
  index: InvertedIndex,
  maxCand = 5000,
  minOverlap = 2
): { candidates: DbRow[]; stats: { before: number; after: number; ratio: number; ms: number } } {
  const startTime = Date.now();

  // 1. 召回所有候选
  const allCandidateIds = recallByBothFields(q1, q2, index.inverted, index.meta.ngram_size);
  const before = allCandidateIds.length;

  // 如果候选数少于阈值，直接返回
  if (before <= maxCand) {
    const candidates = lookupRows(allCandidateIds, index.rows).slice(0, maxCand);
    const elapsed = Date.now() - startTime;
    return {
      candidates,
      stats: { before, after: candidates.length, ratio: 0, ms: elapsed },
    };
  }

  // 2. 廉价过滤：计算 token overlap
  const qTokens = [...tokenize(q1, index.meta.ngram_size), ...tokenize(q2, index.meta.ngram_size)];
  const qTokenSet = new Set(qTokens);

  const filteredWithScore: Array<{ id: string; overlap: number }> = [];

  // 预先构建 id → row 映射，避免 O(N²) 查找
  const rowMap = new Map(index.rows.map(r => [r.id, r]));

  for (const candidateId of allCandidateIds) {
    const row = rowMap.get(candidateId);
    if (!row) continue;

    // 计算候选的 tokens
    const candTokens = [
      ...tokenize(row.f1, index.meta.ngram_size),
      ...tokenize(row.f2, index.meta.ngram_size),
    ];

    const overlap = countTokenOverlap(Array.from(qTokenSet), candTokens);

    if (overlap >= minOverlap) {
      filteredWithScore.push({ id: candidateId, overlap });
    }
  }

  // 3. 按 overlap 降序排序，取 Top maxCand
  filteredWithScore.sort((a, b) => b.overlap - a.overlap);
  const topIds = filteredWithScore.slice(0, maxCand).map(c => c.id);

  const candidates = lookupRows(topIds, index.rows);
  const after = candidates.length;
  const ratio = before > 0 ? (before - after) / before : 0;
  const elapsed = Date.now() - startTime;

  // 4. 性能埋点
  if (ratio > 0.5) {
    logger.debug(
      'recall.prefilter',
      `Filtered ${before} → ${after} candidates (${(ratio * 100).toFixed(1)}% reduction) in ${elapsed}ms`
    );
  }

  return {
    candidates,
    stats: { before, after, ratio, ms: elapsed },
  };
}
