#!/usr/bin/env node
/**
 * CLI 命令：批量匹配 OCR 文本
 * 从 OCR 文本目录读取所有 .txt 文件，匹配到索引，输出运行包
 */
import { promises as fs } from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import dayjs from 'dayjs';
import { loadLatestConfig } from '../config/load.js';
import { matchOcrBatch } from '../match.js';
import { DEFAULT_BUCKET_CONFIG } from '../bucket/bucketize.js';
import { writeRunBundle, JsonlLogger } from '../report/writer.js';
import type { InvertedIndex } from '../indexer/types.js';
import { computeDigest, computeMultiFileDigest, scanDbDirectory } from '../indexer/builder.js';
import { logger } from '../util/log.js';
import fs_sync from 'fs';

interface MatchOcrArgs {
  ocr: string;              // OCR 文本目录
  index: string;            // 索引 JSON 文件路径
  config?: string;          // 配置目录（默认 ./configs/latest.json）
  out: string;              // 输出运行包目录
  db?: string;              // DB 文件路径（用于 digest 校验）
  allowStaleIndex?: boolean; // 允许使用过期索引
  files?: string;           // 文件列表路径（每行一个文件名，相对于 --ocr）
  autoPass?: number;        // 自动通过阈值
  minFieldSim?: number;     // 最低字段相似度
  minDeltaTop?: number;     // Top1-Top2 最小差值
  topk?: number;            // 返回 TopK 候选
  maxCand?: number;         // 最大召回候选数
  weights?: string;         // 字段权重（如 "0.5,0.5"）
  includeTop3?: boolean;    // 是否输出 results_top3.csv
  logLevel?: string;        // 日志级别
}

/**
 * 生成标准时间戳：YYYYMMDD_HH_MM（分钟级精度，时和分之间有下划线）
 */
function generateTimestamp(): string {
  return dayjs().format('YYYYMMDD_HH_mm');
}

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .command(
      '$0',
      'Match OCR texts against DB index',
      (yargs) => {
        return yargs
          .option('ocr', {
            type: 'string',
            demandOption: true,
            description: 'Path to OCR text directory',
          })
          .option('index', {
            type: 'string',
            demandOption: true,
            description: 'Path to index.json',
          })
          .option('out', {
            type: 'string',
            demandOption: true,
            description: 'Output directory for run bundle (use {timestamp} for auto timestamp)',
          })
          .option('config', {
            type: 'string',
            description: 'Path to repository root (default: current directory)',
          })
          .option('db', {
            type: 'string',
            description: 'Path to DB file for digest verification (optional)',
          })
          .option('allow-stale-index', {
            type: 'boolean',
            description: 'Allow using stale index (skip digest check)',
            default: false,
          })
          .option('files', {
            type: 'string',
            description: 'File list to process (one filename per line, relative to --ocr)',
          })
          .option('autoPass', {
            type: 'number',
            description: 'Auto-pass threshold',
            default: DEFAULT_BUCKET_CONFIG.autoPass,
          })
          .option('minFieldSim', {
            type: 'number',
            description: 'Minimum field similarity',
            default: DEFAULT_BUCKET_CONFIG.minFieldSim,
          })
          .option('minDeltaTop', {
            type: 'number',
            description: 'Minimum delta between Top1 and Top2',
            default: DEFAULT_BUCKET_CONFIG.minDeltaTop,
          })
          .option('topk', {
            type: 'number',
            description: 'Number of top candidates to return',
            default: 3,
          })
          .option('max-cand', {
            type: 'number',
            description: 'Maximum candidates to recall',
            default: 5000,
          })
          .option('weights', {
            type: 'string',
            description: 'Field weights (e.g., "0.5,0.5")',
            default: '0.5,0.5',
          })
          .option('include-top3', {
            type: 'boolean',
            description: 'Include results_top3.csv',
            default: false,
          })
          .option('log-level', {
            type: 'string',
            choices: ['debug', 'info', 'warn', 'error', 'silent'],
            description: 'Log level',
            default: 'info',
          })
          .example(
            '$0 --ocr ./ocr_txt --index ./index.json --out ./runs/run_test',
            'Match OCR texts with default settings'
          )
          .example(
            '$0 --ocr ./ocr_txt --index ./index.json --out ./runs/run_test --autoPass 0.8 --include-top3',
            'Match with custom threshold and Top3 output'
          );
      }
    )
    .help()
    .alias('help', 'h')
    .version('0.1.1')
    .alias('version', 'v')
    .parse();

  const args = argv as unknown as MatchOcrArgs;

  // 设置日志级别
  if (args.logLevel) {
    logger.setLevel(args.logLevel as any);
  }

  const startTime = Date.now();

  // 替换 {timestamp} 或 {ts} 占位符为标准时间戳
  const outputDir = args.out
    .replace(/\{timestamp\}/g, generateTimestamp())
    .replace(/\{ts\}/g, generateTimestamp());

  logger.info('cli.match-ocr', `Starting OCR matching...`);
  logger.info('cli.match-ocr', `OCR dir: ${args.ocr}`);
  logger.info('cli.match-ocr', `Index: ${args.index}`);
  logger.info('cli.match-ocr', `Output: ${outputDir}`);

  try {
    // 1. 加载配置
    const repoRoot = args.config || process.cwd();

    logger.info('cli.match-ocr', `Loading config from ${repoRoot}`);
    const config = await loadLatestConfig(repoRoot);

    logger.info(
      'cli.match-ocr',
      `Config loaded: version=${config.version}, sha=${config.sha}`
    );

    // 2. 加载索引
    logger.info('cli.match-ocr', `Loading index from ${args.index}`);
    const indexContent = await fs.readFile(args.index, 'utf-8');
    const index: InvertedIndex = JSON.parse(indexContent);

    logger.info(
      'cli.match-ocr',
      `Index loaded: ${index.total_rows} rows, ${index.meta.unique_tokens} tokens, digest=${index.digest.substring(0, 16)}...`
    );

    // 2.1. Digest 校验（严格模式）
    if (args.db && !args.allowStaleIndex) {
      logger.info('cli.match-ocr', `Verifying index digest against DB: ${args.db}`);

      // 检测是文件还是目录
      const stat = fs_sync.statSync(args.db);
      const currentDigest = stat.isDirectory()
        ? computeMultiFileDigest(scanDbDirectory(args.db))
        : computeDigest(args.db);

      if (index.digest !== currentDigest) {
        logger.error(
          'cli.match-ocr',
          `Index digest mismatch!\n` +
            `  Expected (index): ${index.digest.substring(0, 16)}...\n` +
            `  Actual (DB):      ${currentDigest.substring(0, 16)}...\n` +
            `  Reason: DB files have changed since index was built.\n` +
            `  Fix: Re-run 'ocr-core build-index' or use --allow-stale-index`
        );
        throw new Error('Index digest mismatch - DB has changed since index was built');
      }

      logger.info('cli.match-ocr', `✓ Digest verification passed`);
    } else if (args.db && args.allowStaleIndex) {
      logger.warn('cli.match-ocr', `--allow-stale-index is set, skipping digest check`);
    }

    // 3. 获取 OCR 文本文件列表
    let ocrFiles: string[];

    if (args.files) {
      // 文件列表模式：从文件读取
      logger.info('cli.match-ocr', `Loading file list from: ${args.files}`);
      const fileListContent = await fs.readFile(args.files, 'utf-8');
      const filenames = fileListContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      // 转换为绝对路径（相对于 --ocr 目录）
      ocrFiles = filenames.map(filename => path.join(args.ocr, filename));

      // 验证文件存在性
      const missingFiles = ocrFiles.filter(f => !fs_sync.existsSync(f));
      if (missingFiles.length > 0) {
        logger.error(
          'cli.match-ocr',
          `Missing files:\n${missingFiles.join('\n')}\n` +
          `Ensure --ocr directory matches the baseline run's OCR source`
        );
        throw new Error(`${missingFiles.length} files not found`);
      }

      logger.info('cli.match-ocr', `✓ Loaded ${ocrFiles.length} files from list`);
    } else {
      // 目录扫描模式：保持现有逻辑
      logger.info('cli.match-ocr', `Scanning OCR directory: ${args.ocr}`);
      ocrFiles = await scanOcrFiles(args.ocr);

      if (ocrFiles.length === 0) {
        throw new Error(`No .txt files found in ${args.ocr}`);
      }

      logger.info('cli.match-ocr', `✓ Found ${ocrFiles.length} files from directory scan`);
    }

    // 4. 解析权重
    const weights = args.weights!.split(',').map(Number) as [number, number];
    if (weights.length !== 2 || weights.some(isNaN)) {
      throw new Error(`Invalid weights format: ${args.weights}`);
    }

    // 5. 批量匹配
    const bucketConfig = {
      autoPass: args.autoPass!,
      minFieldSim: args.minFieldSim!,
      minDeltaTop: args.minDeltaTop!,
    };

    logger.info(
      'cli.match-ocr',
      `Matching with thresholds: autoPass=${bucketConfig.autoPass}, minFieldSim=${bucketConfig.minFieldSim}, minDeltaTop=${bucketConfig.minDeltaTop}`
    );

    const results = await matchOcrBatch(ocrFiles, index, config, bucketConfig);

    const elapsed = Date.now() - startTime;

    logger.info(
      'cli.match-ocr',
      `Matching completed: ${results.length} files in ${elapsed}ms`
    );

    // 6. 生成运行包
    const runId = path.basename(outputDir);

    const bundleConfig = {
      run_id: runId,
      out_dir: outputDir,
      ocr_dir: args.ocr,
      index_file: args.index,
      config_path: config.root,
      db_digest: index.digest,
      config_version: config.version,
      config_sha: config.sha,
      params: {
        autoPass: bucketConfig.autoPass,
        minFieldSim: bucketConfig.minFieldSim,
        minDeltaTop: bucketConfig.minDeltaTop,
        topk: args.topk!,
        max_cand: args.maxCand!,
        weights,
      },
      elapsed_ms: elapsed,
    };

    await writeRunBundle(results, bundleConfig, {
      includeTop3: args.includeTop3,
    });

    // 7. 写入 JSONL 日志
    const jsonlLogger = new JsonlLogger(outputDir);
    await jsonlLogger.writeLog(
      'INFO',
      'cli.match-ocr',
      'Run completed',
      {
        total: results.length,
        exact: results.filter(r => r.bucket === 'exact').length,
        review: results.filter(r => r.bucket === 'review').length,
        fail: results.filter(r => r.bucket === 'fail').length,
        elapsed_ms: elapsed,
      }
    );

    // 8. 打印统计
    const exact = results.filter(r => r.bucket === 'exact').length;
    const review = results.filter(r => r.bucket === 'review').length;
    const fail = results.filter(r => r.bucket === 'fail').length;

    console.log('\n✅ OCR matching completed!');
    console.log(`   Run ID: ${runId}`);
    console.log(`   Output: ${outputDir}`);
    console.log(`   Total files: ${results.length}`);
    console.log(`   ✅ Exact (auto-pass): ${exact} (${((exact / results.length) * 100).toFixed(1)}%)`);
    console.log(`   ⚠️  Review (needs check): ${review} (${((review / results.length) * 100).toFixed(1)}%)`);
    console.log(`   ❌ Fail: ${fail} (${((fail / results.length) * 100).toFixed(1)}%)`);
    console.log(`   Elapsed: ${elapsed}ms (${(elapsed / results.length).toFixed(1)}ms/file)`);

    process.exit(0);
  } catch (error) {
    logger.error('cli.match-ocr', error as Error);
    console.error('\n❌ Failed to match OCR texts:');
    console.error(`   ${(error as Error).message}`);
    process.exit(1);
  }
}

/**
 * 扫描目录下的所有 .txt 文件
 */
async function scanOcrFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isFile() && entry.name.endsWith('.txt')) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

main();
