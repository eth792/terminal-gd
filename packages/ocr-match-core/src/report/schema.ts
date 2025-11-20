/**
 * 报告输出的数据结构定义
 * 定义 results.csv 的列契约（API 级别，不可随意变更）
 */
import { z } from 'zod';
import type { MatchMode } from '../match/strategies.js';
import type { BucketType, FailReason } from '../bucket/reasons.js';

/**
 * results.csv 单行数据结构
 *
 * 列契约（向后兼容，不可随意增删）：
 * file_name, q_supplier, q_project,
 * cand_f1, cand_f2, source_file, row_index,
 * s_field1, s_field2, score, bucket, reason, mode,
 * source_txt, source_image, viewer_link,
 * run_id, config_version, config_sha, db_digest
 */
export interface ResultRow {
  // 基础信息
  file_name: string;          // OCR 文件名（如 "a_001.txt"）

  // 提取字段
  q_supplier: string;         // 提取的供应商名称
  q_project: string;          // 提取的工程名称

  // Top1 候选（如果没有候选则为空）
  cand_f1: string;            // 候选的供应商字段
  cand_f2: string;            // 候选的工程字段
  source_file: string;        // 候选来源文件（DB 文件名）
  row_index: number;          // 候选在源文件中的行号

  // 匹配分数
  s_field1: number;           // 字段1相似度 (0-1)
  s_field2: number;           // 字段2相似度 (0-1)
  score: number;              // 综合得分 (0-1)

  // 分桶结果
  bucket: BucketType;         // exact | review | fail
  reason: string;             // 原因（FailReason 枚举或 "OK"）
  mode: MatchMode;            // fast-exact | anchor | recall

  // 溯源链接
  source_txt: string;         // OCR .txt 文件路径（相对或绝对）
  source_image: string;       // OCR 图像文件路径（可选）
  viewer_link: string;        // 审阅页链接（如 "review.html?file=a_001.txt"）

  // 运行元数据
  run_id: string;             // 运行包 ID（如 "run_20251111_123456__prod"）
  config_version: string;     // 配置版本（如 "v0.labs"）
  config_sha: string;         // 配置 sha（如 "f6b7160f"）
  db_digest: string;          // DB 指纹（用于验证索引与 DB 一致性）
  was_cleaned: string;        // 是否被后处理清洗（"YES" | "NO"）
}

/**
 * Zod Schema（用于校验）
 */
export const ResultRowSchema = z.object({
  file_name: z.string(),
  q_supplier: z.string(),
  q_project: z.string(),
  cand_f1: z.string(),
  cand_f2: z.string(),
  source_file: z.string(),
  row_index: z.number().int().nonnegative(),
  s_field1: z.number().min(0).max(1),
  s_field2: z.number().min(0).max(1),
  score: z.number().min(0).max(1),
  bucket: z.enum(['exact', 'review', 'fail']),
  reason: z.string(),
  mode: z.enum(['fast-exact', 'anchor', 'recall']),
  source_txt: z.string(),
  source_image: z.string(),
  viewer_link: z.string(),
  run_id: z.string(),
  config_version: z.string(),
  config_sha: z.string(),
  db_digest: z.string(),
  was_cleaned: z.enum(['YES', 'NO']),
});

/**
 * results_top3.csv 单行数据结构（可选，包含 Top3 候选）
 */
export interface ResultTop3Row extends ResultRow {
  rank: number;               // 排名（1/2/3）
}

/**
 * manifest.json 数据结构
 */
export interface Manifest {
  // 运行标识
  run_id: string;
  created_at: string;         // ISO 8601 时间戳

  // 输入参数
  inputs: {
    ocr_dir: string;          // OCR 文本目录
    index_file: string;       // 索引文件路径
    config_path: string;      // 配置路径
    db_digest: string;        // DB 指纹
  };

  // 阈值参数
  params: {
    autoPass: number;
    minFieldSim: number;
    minDeltaTop: number;
    topk: number;
    max_cand: number;
    weights: [number, number];
  };

  // 统计数据
  stats: {
    total: number;            // 总文件数
    exact: number;            // exact 数量
    review: number;           // review 数量
    fail: number;             // fail 数量
    top1_percent: number;     // Top1 准确率（如有 sidecar）
    top3_percent: number;     // Top3 准确率（如有 sidecar）
    auto_pass_percent: number; // 自动通过率
    elapsed_ms: number;       // 总耗时（毫秒）
  };

  // 版本信息
  versions: {
    core: string;             // @ocr/core 版本
    node: string;             // Node.js 版本
    config_version: string;   // 配置版本
    config_sha: string;       // 配置 sha
  };

  // 指纹（用于可复现性）
  fingerprints: {
    config_sha: string;
    db_digest: string;
    index_digest?: string;    // 索引文件的 hash（可选）
  };
}

/**
 * summary.md 统计摘要结构
 */
export interface Summary {
  run_id: string;
  created_at: string;

  // KPI 指标
  kpi: {
    total: number;
    exact: number;
    review: number;
    fail: number;
    exact_percent: number;
    review_percent: number;
    fail_percent: number;
  };

  // 失败原因分布（Top 5）
  fail_reasons: Array<{
    reason: string;
    count: number;
    percent: number;
  }>;

  // 性能指标
  performance: {
    elapsed_ms: number;
    avg_ms_per_file: number;
  };

  // 配置信息
  config: {
    version: string;
    sha: string;
    db_digest: string;
  };
}

/**
 * CSV 列顺序（固定契约）
 */
export const CSV_COLUMNS: Array<keyof ResultRow> = [
  'file_name',
  'q_supplier',
  'q_project',
  'cand_f1',
  'cand_f2',
  'source_file',
  'row_index',
  's_field1',
  's_field2',
  'score',
  'bucket',
  'reason',
  'mode',
  'source_txt',
  'source_image',
  'viewer_link',
  'run_id',
  'config_version',
  'config_sha',
  'db_digest',
  'was_cleaned',
];

/**
 * 格式化数字为百分比字符串
 */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * 格式化毫秒为可读字符串
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
}

/**
 * results_cn.csv 中文友好版配置
 *
 * 设计原则：数据与显示分离
 * - 数据结构保持纯净（复用 ResultRow）
 * - 显示逻辑独立配置（CN_HEADERS + CN_COLUMNS）
 *
 * 改进点：
 * 1. 列名中文化（保留英文字段名作为后缀）
 * 2. 去掉冗余列：source_txt, source_image（file_name 足够溯源）
 * 3. file_name 去掉扩展名后缀（仅保留文件名）
 * 4. source_file 去掉路径前缀（仅保留文件名）
 * 5. 相似度精度调整为 4 位小数
 */

/**
 * 中文列名映射（显示层配置）
 */
export const CN_HEADERS: Record<string, string> = {
  file_name: '文件名(file_name)',
  q_supplier: '供应商(q_supplier)',
  q_project: '工程(q_project)',
  cand_f1: '候选供应商(cand_f1)',
  cand_f2: '候选工程(cand_f2)',
  source_file: 'DB来源(source_file)',
  row_index: '行号(row_index)',
  s_field1: '供应商相似度(s_field1)',
  s_field2: '工程相似度(s_field2)',
  score: '综合得分(score)',
  bucket: '结果(bucket)',
  reason: '原因(reason)',
  mode: '匹配模式(mode)',
  viewer_link: '审阅链接(viewer_link)',
  run_id: '运行ID(run_id)',
  config_version: '配置版本(config_version)',
  config_sha: '配置SHA(config_sha)',
  db_digest: 'DB指纹(db_digest)',
  was_cleaned: '已清洗(was_cleaned)',
};

/**
 * 中文版要输出的列（去掉冗余列 source_txt, source_image）
 */
export const CN_COLUMNS: string[] = [
  'file_name',
  'q_supplier',
  'q_project',
  'cand_f1',
  'cand_f2',
  'source_file',
  'row_index',
  's_field1',
  's_field2',
  'score',
  'bucket',
  'reason',
  'mode',
  'viewer_link',
  'run_id',
  'config_version',
  'config_sha',
  'db_digest',
  'was_cleaned',
];
