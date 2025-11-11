/**
 * 报告输出模块
 * 负责写入 results.csv / summary.md / manifest.json / log.jsonl
 */
import { promises as fs } from 'fs';
import path from 'path';
import { stringify } from 'csv-stringify/sync';
import dayjs from 'dayjs';
import type { MatchOcrResult } from '../match.js';
import type {
  ResultRow,
  Manifest,
  Summary,
  CSV_COLUMNS,
} from './schema.js';
import { formatPercent, formatDuration } from './schema.js';
import { logger } from '../util/log.js';

/**
 * 运行包输出配置
 */
export interface RunBundleConfig {
  run_id: string;             // 运行包 ID（如 "run_20251111_123456__prod"）
  out_dir: string;            // 输出目录（如 "./runs/run_20251111_123456__prod"）
  ocr_dir: string;            // OCR 输入目录
  index_file: string;         // 索引文件路径
  config_path: string;        // 配置路径
  db_digest: string;          // DB 指纹
  config_version: string;     // 配置版本
  config_sha: string;         // 配置 sha
  params: {
    autoPass: number;
    minFieldSim: number;
    minDeltaTop: number;
    topk: number;
    max_cand: number;
    weights: [number, number];
  };
  elapsed_ms: number;         // 总耗时
}

/**
 * 将匹配结果转换为 ResultRow（单个候选）
 */
function matchResultToRow(
  result: MatchOcrResult,
  candidateIndex: number,
  bundleConfig: RunBundleConfig
): ResultRow {
  const candidate = result.candidates[candidateIndex];

  // 如果没有候选，返回空值
  const cand_f1 = candidate?.row.f1 || '';
  const cand_f2 = candidate?.row.f2 || '';
  const source_file = candidate?.row.source_file || '';
  const row_index = candidate?.row.row_index || 0;
  const s_field1 = candidate?.f1_score || 0;
  const s_field2 = candidate?.f2_score || 0;
  const score = candidate?.score || 0;

  return {
    file_name: result.file_name,
    q_supplier: result.q_supplier,
    q_project: result.q_project,
    cand_f1,
    cand_f2,
    source_file,
    row_index,
    s_field1,
    s_field2,
    score,
    bucket: result.bucket,
    reason: result.reason || 'OK',
    mode: result.mode,
    source_txt: result.source_txt || '',
    source_image: result.source_image || '',
    viewer_link: `review.html?file=${result.file_name}`,
    run_id: bundleConfig.run_id,
    config_version: bundleConfig.config_version,
    config_sha: bundleConfig.config_sha,
    db_digest: bundleConfig.db_digest,
  };
}

/**
 * 写入 results.csv（Top1 结果）
 */
export async function writeResultsCsv(
  results: MatchOcrResult[],
  bundleConfig: RunBundleConfig
): Promise<void> {
  const rows: ResultRow[] = results.map(r => matchResultToRow(r, 0, bundleConfig));

  const csvContent = stringify(rows, {
    header: true,
    columns: [
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
    ],
  });

  const csvPath = path.join(bundleConfig.out_dir, 'results.csv');
  await fs.writeFile(csvPath, csvContent, 'utf-8');

  logger.info('report.csv', `Wrote results.csv with ${rows.length} rows to ${csvPath}`);
}

/**
 * 写入 results_top3.csv（Top3 结果，可选）
 */
export async function writeResultsTop3Csv(
  results: MatchOcrResult[],
  bundleConfig: RunBundleConfig
): Promise<void> {
  const rows: Array<ResultRow & { rank: number }> = [];

  for (const result of results) {
    const topk = Math.min(result.candidates.length, bundleConfig.params.topk);
    for (let i = 0; i < topk; i++) {
      const row = matchResultToRow(result, i, bundleConfig);
      rows.push({ ...row, rank: i + 1 });
    }
  }

  const csvContent = stringify(rows, {
    header: true,
    columns: [
      'rank',
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
    ],
  });

  const csvPath = path.join(bundleConfig.out_dir, 'results_top3.csv');
  await fs.writeFile(csvPath, csvContent, 'utf-8');

  logger.info('report.csv', `Wrote results_top3.csv with ${rows.length} rows to ${csvPath}`);
}

/**
 * 计算统计数据
 */
function calculateStats(results: MatchOcrResult[], bundleConfig: RunBundleConfig) {
  const total = results.length;
  const exact = results.filter(r => r.bucket === 'exact').length;
  const review = results.filter(r => r.bucket === 'review').length;
  const fail = results.filter(r => r.bucket === 'fail').length;

  return {
    total,
    exact,
    review,
    fail,
    top1_percent: 0, // TODO: 如果有 sidecar 可计算
    top3_percent: 0,
    auto_pass_percent: total > 0 ? exact / total : 0,
    elapsed_ms: bundleConfig.elapsed_ms,
  };
}

/**
 * 生成失败原因分布
 */
function calculateFailReasons(results: MatchOcrResult[]): Array<{
  reason: string;
  count: number;
  percent: number;
}> {
  const reasonCounts: Record<string, number> = {};
  const totalWithReason = results.filter(r => r.reason).length;

  for (const result of results) {
    if (result.reason) {
      const reason = result.reason;
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    }
  }

  const reasons = Object.entries(reasonCounts)
    .map(([reason, count]) => ({
      reason,
      count,
      percent: totalWithReason > 0 ? count / totalWithReason : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Top 5

  return reasons;
}

/**
 * 写入 summary.md
 */
export async function writeSummaryMd(
  results: MatchOcrResult[],
  bundleConfig: RunBundleConfig
): Promise<void> {
  const stats = calculateStats(results, bundleConfig);
  const failReasons = calculateFailReasons(results);

  const summary: Summary = {
    run_id: bundleConfig.run_id,
    created_at: dayjs().toISOString(),
    kpi: {
      total: stats.total,
      exact: stats.exact,
      review: stats.review,
      fail: stats.fail,
      exact_percent: stats.total > 0 ? stats.exact / stats.total : 0,
      review_percent: stats.total > 0 ? stats.review / stats.total : 0,
      fail_percent: stats.total > 0 ? stats.fail / stats.total : 0,
    },
    fail_reasons: failReasons,
    performance: {
      elapsed_ms: stats.elapsed_ms,
      avg_ms_per_file: stats.total > 0 ? stats.elapsed_ms / stats.total : 0,
    },
    config: {
      version: bundleConfig.config_version,
      sha: bundleConfig.config_sha,
      db_digest: bundleConfig.db_digest,
    },
  };

  // 生成 Markdown 内容
  const md = `# OCR 匹配运行报告

**运行 ID**: \`${summary.run_id}\`
**创建时间**: ${summary.created_at}

---

## KPI 指标

| 指标 | 数量 | 占比 |
|------|------|------|
| 总文件数 | ${summary.kpi.total} | 100% |
| ✅ Exact（自动通过） | ${summary.kpi.exact} | ${formatPercent(summary.kpi.exact_percent)} |
| ⚠️ Review（需审核） | ${summary.kpi.review} | ${formatPercent(summary.kpi.review_percent)} |
| ❌ Fail（失败） | ${summary.kpi.fail} | ${formatPercent(summary.kpi.fail_percent)} |

**自动通过率**: ${formatPercent(summary.kpi.exact_percent)}

---

## 失败原因分布（Top 5）

${
  summary.fail_reasons.length > 0
    ? summary.fail_reasons
        .map(
          r =>
            `- **${r.reason}**: ${r.count} 次（${formatPercent(r.percent)}）`
        )
        .join('\n')
    : '（无失败记录）'
}

---

## 性能指标

- **总耗时**: ${formatDuration(summary.performance.elapsed_ms)}
- **平均耗时**: ${formatDuration(summary.performance.avg_ms_per_file)}/文件

---

## 配置信息

- **配置版本**: \`${summary.config.version}\`
- **配置 SHA**: \`${summary.config.sha}\`
- **DB Digest**: \`${summary.config.db_digest}\`

---

## 阈值参数

\`\`\`json
${JSON.stringify(bundleConfig.params, null, 2)}
\`\`\`

---

生成时间：${dayjs().format('YYYY-MM-DD HH:mm:ss')}
`;

  const mdPath = path.join(bundleConfig.out_dir, 'summary.md');
  await fs.writeFile(mdPath, md, 'utf-8');

  logger.info('report.summary', `Wrote summary.md to ${mdPath}`);
}

/**
 * 写入 manifest.json
 */
export async function writeManifestJson(
  results: MatchOcrResult[],
  bundleConfig: RunBundleConfig
): Promise<void> {
  const stats = calculateStats(results, bundleConfig);

  const manifest: Manifest = {
    run_id: bundleConfig.run_id,
    created_at: dayjs().toISOString(),
    inputs: {
      ocr_dir: bundleConfig.ocr_dir,
      index_file: bundleConfig.index_file,
      config_path: bundleConfig.config_path,
      db_digest: bundleConfig.db_digest,
    },
    params: bundleConfig.params,
    stats,
    versions: {
      core: '0.1.1', // TODO: 从 package.json 读取
      node: process.version,
      config_version: bundleConfig.config_version,
      config_sha: bundleConfig.config_sha,
    },
    fingerprints: {
      config_sha: bundleConfig.config_sha,
      db_digest: bundleConfig.db_digest,
    },
  };

  const jsonPath = path.join(bundleConfig.out_dir, 'manifest.json');
  await fs.writeFile(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');

  logger.info('report.manifest', `Wrote manifest.json to ${jsonPath}`);
}

/**
 * 写入完整运行包（一次性输出所有文件）
 */
export async function writeRunBundle(
  results: MatchOcrResult[],
  bundleConfig: RunBundleConfig,
  options: {
    includeTop3?: boolean;
  } = {}
): Promise<void> {
  // 确保输出目录存在
  await fs.mkdir(bundleConfig.out_dir, { recursive: true });

  logger.info('report.bundle', `Creating run bundle at ${bundleConfig.out_dir}`);

  // 写入 results.csv
  await writeResultsCsv(results, bundleConfig);

  // 写入 results_top3.csv（可选）
  if (options.includeTop3) {
    await writeResultsTop3Csv(results, bundleConfig);
  }

  // 写入 summary.md
  await writeSummaryMd(results, bundleConfig);

  // 写入 manifest.json
  await writeManifestJson(results, bundleConfig);

  logger.info(
    'report.bundle',
    `Run bundle created successfully: ${results.length} files, ${calculateStats(results, bundleConfig).exact} exact, ${calculateStats(results, bundleConfig).review} review, ${calculateStats(results, bundleConfig).fail} fail`
  );
}

/**
 * JSONL 日志写入器（追加模式）
 */
export class JsonlLogger {
  private filePath: string;

  constructor(outDir: string) {
    this.filePath = path.join(outDir, 'log.jsonl');
  }

  async write(entry: Record<string, any>): Promise<void> {
    const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n';
    await fs.appendFile(this.filePath, line, 'utf-8');
  }

  async writeLog(level: string, mod: string, message: string, meta?: Record<string, any>): Promise<void> {
    await this.write({
      lvl: level.toUpperCase(),
      mod,
      msg: message,
      ...meta,
    });
  }
}
