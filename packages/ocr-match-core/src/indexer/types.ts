/**
 * 索引类型定义
 */

/** DB行数据 */
export interface DbRow {
  /** 唯一ID（行号） */
  id: string;
  /** 字段1（供应商） */
  f1: string;
  /** 字段2（工程名称） */
  f2: string;
  /** 源文件路径 */
  source_file: string;
  /** 源文件行号 */
  row_index: number;
  /** 原始数据（可选，用于调试） */
  raw?: Record<string, string>;
}

/** 倒排索引 */
export interface InvertedIndex {
  /** 版本号 */
  version: '1.0';
  /** DB文件路径 */
  db_path: string;
  /** DB文件SHA-256摘要 */
  digest: string;
  /** 总行数 */
  total_rows: number;
  /** 索引构建时间（ISO 8601） */
  built_at: string;
  /** 所有行数据 */
  rows: DbRow[];
  /** 倒排索引：token -> row IDs */
  inverted: Record<string, string[]>;
  /** 元数据 */
  meta: {
    /** 唯一token数量 */
    unique_tokens: number;
    /** 列名（从CSV header读取） */
    columns: string[];
    /** n-gram大小 */
    ngram_size: number;
  };
}
