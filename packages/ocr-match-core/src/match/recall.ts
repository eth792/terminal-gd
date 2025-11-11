/**
 * 召回模块
 * 从倒排索引中快速召回候选行
 */
import { tokenize } from '../indexer/builder.js';
import type { DbRow } from '../indexer/types.js';

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
