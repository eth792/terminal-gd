#!/usr/bin/env node
/**
 * CLI 命令：批量匹配业务表格
 * 从 Excel/CSV 读取业务数据，对供应商/工程字段进行模糊匹配
 */
import { promises as fs } from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { loadLatestConfig } from '../config/load.js';
import { match } from '../match/strategies.js';
import { bucketize, DEFAULT_BUCKET_CONFIG } from '../bucket/bucketize.js';
import { normalize } from '../normalize/pipeline.js';
import type { InvertedIndex } from '../indexer/types.js';
import type { BucketType } from '../bucket/reasons.js';
import { logger } from '../util/log.js';
import fs_sync from 'fs';
import {
  computeDigest,
  computeMultiFileDigest,
  scanDbDirectory,
} from '../indexer/builder.js';
import { readDbRow, clearDbCache } from '../indexer/dbReader.js';

interface MatchTableArgs {
  input: string; // 输入表格路径
  supplierCol: string; // 供应商列名
  projectCol: string; // 工程名称列名
  index: string; // 索引文件路径
  out: string; // 输出文件路径
  sheet?: string; // Excel sheet 名称
  config?: string; // 配置根目录
  db?: string; // DB 文件路径
  allowStaleIndex?: boolean; // 允许使用过期索引
  autoPass?: number; // 自动通过阈值
  minFieldSim?: number; // 最低字段相似度
  minDeltaTop?: number; // Top1-Top2 最小差值
  supplierHardMin?: number; // 供应商硬阈值
  minReview?: number; // review 最低分
  weights?: string; // 字段权重
  includeTop3?: boolean; // 是否输出 Top3
  outFormat?: 'csv' | 'xlsx'; // 输出格式
  logLevel?: string; // 日志级别
}

interface MatchedRow {
  [key: string]: any; // 保留所有原始列
  match_bucket: BucketType;
  match_score: number;
  match_order_no: string;
  match_supplier: string;
  match_project: string;
  match_mode: string;
  match_reason: string | null;
}

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .command('$0', 'Match business table (Excel/CSV) against DB index')
    .option('input', {
      type: 'string',
      demandOption: true,
      description: 'Path to input table (.csv/.xlsx/.xls)',
    })
    .option('supplier-col', {
      type: 'string',
      demandOption: true,
      description: 'Column name for supplier field',
    })
    .option('project-col', {
      type: 'string',
      demandOption: true,
      description: 'Column name for project field',
    })
    .option('index', {
      type: 'string',
      demandOption: true,
      description: 'Path to index file',
    })
    .option('out', {
      type: 'string',
      demandOption: true,
      description: 'Output file path (.csv/.xlsx)',
    })
    .option('sheet', {
      type: 'string',
      description: 'Excel sheet name (default: first sheet)',
    })
    .option('config', {
      type: 'string',
      description: 'Path to repository root (default: current directory)',
    })
    .option('db', {
      type: 'string',
      description: 'Path to DB file/dir (for digest verification)',
    })
    .option('allow-stale-index', {
      type: 'boolean',
      description: 'Allow using stale index (skip digest check)',
      default: false,
    })
    .option('autoPass', {
      type: 'number',
      description: 'Auto-pass threshold (overrides config)',
    })
    .option('minFieldSim', {
      type: 'number',
      description: 'Minimum field similarity (overrides config)',
    })
    .option('minDeltaTop', {
      type: 'number',
      description: 'Minimum delta between Top1 and Top2 (overrides config)',
    })
    .option('supplierHardMin', {
      type: 'number',
      description: 'Supplier hard threshold (overrides config)',
    })
    .option('minReview', {
      type: 'number',
      description: 'Review minimum score (overrides config)',
    })
    .option('weights', {
      type: 'string',
      description: 'Field weights (e.g., "0.7,0.3")',
    })
    .option('include-top3', {
      type: 'boolean',
      description: 'Include Top3 candidates in output',
      default: false,
    })
    .option('out-format', {
      type: 'string',
      choices: ['csv', 'xlsx'],
      description: 'Output format (default: infer from --out extension)',
    })
    .option('log-level', {
      type: 'string',
      choices: ['debug', 'info', 'warn', 'error', 'silent'],
      description: 'Log level',
      default: 'info',
    })
    .example(
      '$0 --input orders.xlsx --supplier-col "供应商名称" --project-col "工程项目" --index ./index.json --out results.csv',
      'Match business table with supplier and project columns'
    )
    .help()
    .alias('help', 'h')
    .version('0.1.0')
    .alias('version', 'v')
    .parse();

  const args = argv as unknown as MatchTableArgs;

  // 设置日志级别
  if (args.logLevel) {
    logger.setLevel(args.logLevel as any);
  }

  const startTime = Date.now();

  logger.info('cli.match-table', `Starting table matching...`);
  logger.info('cli.match-table', `Input: ${args.input}`);
  logger.info('cli.match-table', `Index: ${args.index}`);

  try {
    // 1. 加载配置
    const repoRoot = args.config || process.cwd();
    logger.info('cli.match-table', `Loading config from ${repoRoot}`);
    const config = await loadLatestConfig(repoRoot);
    logger.info(
      'cli.match-table',
      `Config loaded: version=${config.version}, sha=${config.sha}`
    );

    // 2. 加载索引（如果不存在则自动构建）
    let index: InvertedIndex;

    if (!fs_sync.existsSync(args.index)) {
      logger.warn(
        'cli.match-table',
        `Index not found: ${args.index}`
      );

      // 自动构建索引需要 --db 参数
      if (!args.db) {
        logger.error(
          'cli.match-table',
          `Cannot auto-build index: --db parameter is required`
        );
        throw new Error(
          `Index file not found: ${args.index}\n` +
          `  To auto-build index, provide --db parameter\n` +
          `  Or manually build index: pnpm ocr-build-index --db <db-path> --out ${args.index}`
        );
      }

      logger.info('cli.match-table', `Auto-building index from DB: ${args.db}`);

      // 从 label_alias._dbColumnNames 读取列名
      const dbColumnNames = config.label_alias._dbColumnNames;
      if (!dbColumnNames?.supplier?.[0] || !dbColumnNames?.project?.[0]) {
        logger.error(
          'cli.match-table',
          `Cannot auto-build index: label_alias._dbColumnNames is missing or incomplete`
        );
        throw new Error(
          `label_alias._dbColumnNames configuration is incomplete\n` +
          `  Required fields: supplier, project\n` +
          `  Check: configs/*/label_alias.json`
        );
      }

      const field1Column = dbColumnNames.supplier[0];
      const field2Column = dbColumnNames.project[0];

      logger.info(
        'cli.match-table',
        `Using columns: field1="${field1Column}", field2="${field2Column}"`
      );

      // 动态导入 buildIndex
      const { buildIndex } = await import('../indexer/builder.js');

      // 构建索引
      index = await buildIndex(args.db, config.normalize, {
        ngramSize: 2,
        field1Column,
        field2Column,
        labelAliasConfig: config.label_alias,
      });

      // 保存索引到文件
      const indexDir = path.dirname(args.index);
      if (!fs_sync.existsSync(indexDir)) {
        fs_sync.mkdirSync(indexDir, { recursive: true });
      }
      await fs.writeFile(args.index, JSON.stringify(index, null, 2), 'utf-8');

      logger.info('cli.match-table', `✓ Index built and saved to: ${args.index}`);
    } else {
      logger.info('cli.match-table', `Loading index from ${args.index}`);
      const indexContent = await fs.readFile(args.index, 'utf-8');
      index = JSON.parse(indexContent);
      logger.info(
        'cli.match-table',
        `Index loaded: ${index.total_rows} rows, digest=${index.digest.substring(0, 16)}...`
      );
    }

    // 2.1 Digest 校验（可选）
    if (args.db && !args.allowStaleIndex) {
      logger.info(
        'cli.match-table',
        `Verifying index digest against DB: ${args.db}`
      );
      const stat = fs_sync.statSync(args.db);
      const currentDigest = stat.isDirectory()
        ? computeMultiFileDigest(scanDbDirectory(args.db))
        : computeDigest(args.db);

      if (index.digest !== currentDigest) {
        logger.error(
          'cli.match-table',
          `Index digest mismatch!\n` +
            `  Expected (index): ${index.digest.substring(0, 16)}...\n` +
            `  Actual (DB):      ${currentDigest.substring(0, 16)}...\n` +
            `  Reason: DB files have changed since index was built.\n` +
            `  Fix: Re-run 'ocr-core build-index' or use --allow-stale-index`
        );
        throw new Error(
          'Index digest mismatch - DB has changed since index was built'
        );
      }
      logger.info('cli.match-table', `✓ Digest verification passed`);
    } else if (args.db && args.allowStaleIndex) {
      logger.warn(
        'cli.match-table',
        `--allow-stale-index is set, skipping digest check`
      );
    }

    // 3. 读取输入表格
    logger.info('cli.match-table', `Reading input table: ${args.input}`);
    const inputRows = await readTable(args.input, args.sheet);
    logger.info('cli.match-table', `✓ Loaded ${inputRows.length} rows`);

    // 4. 验证列名
    if (inputRows.length === 0) {
      throw new Error('Input table is empty');
    }
    const firstRow = inputRows[0];
    if (!(args.supplierCol in firstRow)) {
      throw new Error(
        `Supplier column "${args.supplierCol}" not found in input table. Available columns: ${Object.keys(firstRow).join(', ')}`
      );
    }
    if (!(args.projectCol in firstRow)) {
      throw new Error(
        `Project column "${args.projectCol}" not found in input table. Available columns: ${Object.keys(firstRow).join(', ')}`
      );
    }

    // 5. 构建分桶配置
    const bucketConfig = {
      autoPass:
        args.autoPass ??
        config.bucketize?.autoPass ??
        DEFAULT_BUCKET_CONFIG.autoPass,
      minFieldSim:
        args.minFieldSim ??
        config.bucketize?.minFieldSim ??
        DEFAULT_BUCKET_CONFIG.minFieldSim,
      minDeltaTop:
        args.minDeltaTop ??
        config.bucketize?.minDeltaTop ??
        DEFAULT_BUCKET_CONFIG.minDeltaTop,
      supplierHardMin: (args.supplierHardMin ??
        config.bucketize?.supplierHardMin ??
        DEFAULT_BUCKET_CONFIG.supplierHardMin) as number,
      minReview: (args.minReview ??
        config.bucketize?.minReview ??
        DEFAULT_BUCKET_CONFIG.minReview) as number,
      weights: (args.weights
        ? (args.weights.split(',').map(Number) as [number, number])
        : (config.bucketize?.weights ??
          DEFAULT_BUCKET_CONFIG.weights)) as [number, number],
    };

    logger.info(
      'cli.match-table',
      `Bucket config: autoPass=${bucketConfig.autoPass}, minFieldSim=${bucketConfig.minFieldSim}, minDeltaTop=${bucketConfig.minDeltaTop}`
    );

    // 6. 批量匹配
    logger.info('cli.match-table', `Starting batch matching...`);
    const normalizer = (text: string) => normalize(text, config.normalize);
    const results: MatchedRow[] = [];

    // 获取订单号列名（从 label_alias 配置）
    const orderColNames =
      config.label_alias._dbColumnNames?.order || ['订单号', '订号'];
    logger.info(
      'cli.match-table',
      `Order column aliases: ${orderColNames.join(', ')}`
    );

    for (let i = 0; i < inputRows.length; i++) {
      const row = inputRows[i];
      const progress = `[${i + 1}/${inputRows.length}]`;

      // 提取字段
      const q_supplier = (row[args.supplierCol] || '').toString().trim();
      const q_project = (row[args.projectCol] || '').toString().trim();

      // 检查空值
      if (!q_supplier || !q_project) {
        logger.warn(
          'cli.match-table',
          `${progress} Empty field: supplier="${q_supplier}", project="${q_project}"`
        );
        results.push({
          row_no: i + 1, // 行号（从 1 开始）
          ...row,
          match_bucket: 'fail',
          match_score: 0,
          match_order_no: '',
          match_supplier: '',
          match_project: '',
          match_mode: 'none',
          match_reason: !q_supplier
            ? 'EXTRACT_EMPTY_SUPPLIER'
            : 'EXTRACT_EMPTY_PROJECT',
        });
        continue;
      }

      // 匹配
      const matchResult = match(q_supplier, q_project, index, 0.6, 3, normalizer);
      const bucketResult = bucketize(
        q_supplier,
        q_project,
        matchResult.candidates,
        bucketConfig
      );

      const top1 = matchResult.candidates[0];

      // 回读 DB 文件获取订单号
      let orderNo = '';
      if (top1) {
        try {
          const dbRow = await readDbRow(
            top1.row.source_file,
            top1.row.row_index
          );

          // 尝试多个列名（按优先级）
          for (const colName of orderColNames) {
            if (dbRow[colName]) {
              orderNo = dbRow[colName];
              break;
            }
          }

          if (!orderNo) {
            logger.warn(
              'cli.match-table',
              `${progress} Order column not found in DB. Tried: ${orderColNames.join(', ')}`
            );
          }
        } catch (err) {
          logger.error(
            'cli.match-table',
            `${progress} Failed to read DB row: ${err}`
          );
        }
      }

      // 组装输出行
      const outputRow: MatchedRow = {
        row_no: i + 1, // 行号（从 1 开始）
        ...row, // 保留所有原始列
        match_bucket: bucketResult.bucket,
        match_score: top1?.score || 0,
        match_order_no: orderNo,
        match_supplier: top1?.row.f1 || '',
        match_project: top1?.row.f2 || '',
        match_mode: matchResult.mode,
        match_reason: bucketResult.reason,
      };

      // 可选：Top3
      if (args.includeTop3) {
        const top2 = matchResult.candidates[1];
        const top3 = matchResult.candidates[2];

        // 也为 Top2/Top3 获取订单号
        let orderNo2 = '';
        let orderNo3 = '';

        if (top2) {
          try {
            const dbRow2 = await readDbRow(
              top2.row.source_file,
              top2.row.row_index
            );
            for (const colName of orderColNames) {
              if (dbRow2[colName]) {
                orderNo2 = dbRow2[colName];
                break;
              }
            }
          } catch {
            // 忽略错误
          }
        }

        if (top3) {
          try {
            const dbRow3 = await readDbRow(
              top3.row.source_file,
              top3.row.row_index
            );
            for (const colName of orderColNames) {
              if (dbRow3[colName]) {
                orderNo3 = dbRow3[colName];
                break;
              }
            }
          } catch {
            // 忽略错误
          }
        }

        Object.assign(outputRow, {
          match_top2_score: top2?.score || null,
          match_top2_order_no: orderNo2,
          match_top2_supplier: top2?.row.f1 || '',
          match_top2_project: top2?.row.f2 || '',
          match_top3_score: top3?.score || null,
          match_top3_order_no: orderNo3,
          match_top3_supplier: top3?.row.f1 || '',
          match_top3_project: top3?.row.f2 || '',
        });
      }

      results.push(outputRow);

      if ((i + 1) % 10 === 0) {
        logger.info('cli.match-table', `${progress} Processed`);
      }
    }

    const elapsed = Date.now() - startTime;

    // 清空 DB 文件缓存
    clearDbCache();

    logger.info(
      'cli.match-table',
      `Matching completed: ${results.length} rows in ${elapsed}ms`
    );

    // 7. 输出结果
    const outFormat =
      (args.outFormat || path.extname(args.out).slice(1)) as 'csv' | 'xlsx';
    logger.info(
      'cli.match-table',
      `Writing output to ${args.out} (format: ${outFormat})`
    );
    await writeTable(results, args.out, outFormat);

    // 8. 打印统计
    const exactCount = results.filter((r) => r.match_bucket === 'exact').length;
    const reviewCount = results.filter(
      (r) => r.match_bucket === 'review'
    ).length;
    const failCount = results.filter((r) => r.match_bucket === 'fail').length;

    console.log('\n✅ Table matching completed!');
    console.log(`   Total rows: ${results.length}`);
    console.log(
      `   ✅ Exact (auto-pass): ${exactCount} (${((exactCount / results.length) * 100).toFixed(1)}%)`
    );
    console.log(
      `   ⚠️  Review (needs check): ${reviewCount} (${((reviewCount / results.length) * 100).toFixed(1)}%)`
    );
    console.log(
      `   ❌ Fail: ${failCount} (${((failCount / results.length) * 100).toFixed(1)}%)`
    );
    console.log(
      `   Elapsed: ${elapsed}ms (${(elapsed / results.length).toFixed(1)}ms/row)`
    );
    console.log(`   Output: ${args.out}`);

    process.exit(0);
  } catch (error) {
    logger.error('cli.match-table', error as Error);
    console.error('\n❌ Failed to match table:');
    console.error(`   ${(error as Error).message}`);
    process.exit(1);
  }
}

/**
 * 读取表格文件（支持 CSV/Excel）
 */
async function readTable(
  filePath: string,
  sheetName?: string
): Promise<Record<string, any>[]> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.csv') {
    // CSV 解析
    const csvContent = await fs.readFile(filePath, 'utf-8');
    const parsed = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    });
    return parsed.data as Record<string, any>[];
  } else if (ext === '.xlsx' || ext === '.xls') {
    // Excel 解析
    const workbook = XLSX.readFile(filePath);
    const targetSheet = sheetName || workbook.SheetNames[0];
    if (!workbook.Sheets[targetSheet]) {
      throw new Error(
        `Sheet "${targetSheet}" not found. Available sheets: ${workbook.SheetNames.join(', ')}`
      );
    }
    const worksheet = workbook.Sheets[targetSheet];
    return XLSX.utils.sheet_to_json(worksheet);
  } else {
    throw new Error(
      `Unsupported file format: ${ext}. Supported formats: .csv, .xlsx, .xls`
    );
  }
}

/**
 * 写入表格文件（支持 CSV/Excel）
 */
async function writeTable(
  rows: Record<string, any>[],
  filePath: string,
  format: 'csv' | 'xlsx'
): Promise<void> {
  if (format === 'csv') {
    const csv = Papa.unparse(rows);
    await fs.writeFile(filePath, csv, 'utf-8');
  } else if (format === 'xlsx') {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Matched Results');
    XLSX.writeFile(workbook, filePath);
  }
}

main();
