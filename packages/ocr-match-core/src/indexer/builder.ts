import crypto from 'node:crypto';
import fs from 'node:fs';
import { normalize } from '../normalize/pipeline.js';
import type { NormalizeConfig } from '../config/schema.js';
import type { DbRow, InvertedIndex } from './types.js';
import { logger } from '../util/log.js';

/**
 * n-gram分词
 * @param text - 归一化后的文本
 * @param n - n-gram大小（默认2）
 * @returns token数组
 */
export function tokenize(text: string, n = 2): string[] {
  if (!text || text.length === 0) return [];
  if (text.length < n) return [text];

  const tokens: string[] = [];
  for (let i = 0; i <= text.length - n; i++) {
    tokens.push(text.substring(i, i + n));
  }
  return tokens;
}

/**
 * 计算文件SHA-256摘要
 * @param filePath - 文件路径
 * @returns 十六进制摘要字符串
 */
export function computeDigest(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * 构建倒排索引
 * @param rows - DB行数据
 * @param normalizeConfig - 归一化配置
 * @param ngramSize - n-gram大小
 * @returns 倒排索引
 */
export function buildInvertedIndex(
  rows: DbRow[],
  normalizeConfig: NormalizeConfig,
  ngramSize = 2
): Record<string, string[]> {
  const inverted: Record<string, string[]> = {};

  for (const row of rows) {
    // 归一化字段
    const f1_norm = normalize(row.f1, normalizeConfig);
    const f2_norm = normalize(row.f2, normalizeConfig);

    // 分词
    const tokens1 = tokenize(f1_norm, ngramSize);
    const tokens2 = tokenize(f2_norm, ngramSize);
    const allTokens = [...new Set([...tokens1, ...tokens2])]; // 去重

    // 构建倒排索引
    for (const token of allTokens) {
      if (!inverted[token]) {
        inverted[token] = [];
      }
      inverted[token].push(row.id);
    }
  }

  return inverted;
}

/**
 * 从CSV文件构建索引
 * @param dbPath - DB CSV文件路径
 * @param normalizeConfig - 归一化配置
 * @param options - 选项
 * @returns 完整索引对象
 */
export async function buildIndex(
  dbPath: string,
  normalizeConfig: NormalizeConfig,
  options: {
    /** n-gram大小 */
    ngramSize?: number;
    /** 字段1列名（供应商） */
    field1Column?: string;
    /** 字段2列名（工程名称） */
    field2Column?: string;
  } = {}
): Promise<InvertedIndex> {
  const {
    ngramSize = 2,
    field1Column = 's_field1',
    field2Column = 's_field2',
  } = options;

  const startTime = Date.now();
  logger.info('indexer.build', `Building index from ${dbPath}...`);

  // 计算digest
  const digest = computeDigest(dbPath);
  logger.info('indexer.digest', `DB digest: ${digest.substring(0, 16)}...`);

  // 读取CSV（简化版，假设UTF-8编码，使用内置csv-parse）
  const content = fs.readFileSync(dbPath, 'utf-8');
  const lines = content.trim().split('\n');

  if (lines.length === 0) {
    throw new Error('Empty CSV file');
  }

  // 解析header
  const headerLine = lines[0];
  const columns = parseCSVLine(headerLine);
  const field1Idx = columns.indexOf(field1Column);
  const field2Idx = columns.indexOf(field2Column);

  if (field1Idx === -1 || field2Idx === -1) {
    throw new Error(
      `Required columns not found: ${field1Column}=${field1Idx}, ${field2Column}=${field2Idx}`
    );
  }

  // 解析行数据
  const rows: DbRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < Math.max(field1Idx, field2Idx) + 1) {
      logger.warn('indexer.parse', `Skipping malformed line ${i + 1}`);
      continue;
    }

    rows.push({
      id: `${i}`,
      f1: values[field1Idx] || '',
      f2: values[field2Idx] || '',
      source_file: dbPath,
      row_index: i,
    });
  }

  logger.info('indexer.parse', `Parsed ${rows.length} rows from ${lines.length - 1} lines`);

  // 构建倒排索引
  const inverted = buildInvertedIndex(rows, normalizeConfig, ngramSize);
  const uniqueTokens = Object.keys(inverted).length;

  const elapsed = Date.now() - startTime;
  logger.info(
    'indexer.build',
    `Index built: ${rows.length} rows, ${uniqueTokens} tokens in ${elapsed}ms`
  );

  return {
    version: '1.0',
    db_path: dbPath,
    digest,
    total_rows: rows.length,
    built_at: new Date().toISOString(),
    rows,
    inverted,
    meta: {
      unique_tokens: uniqueTokens,
      columns,
      ngram_size: ngramSize,
    },
  };
}

/**
 * 简单CSV行解析（处理引号）
 * @param line - CSV行
 * @returns 字段数组
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result.map(v => v.trim());
}
