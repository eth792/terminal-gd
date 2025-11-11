#!/usr/bin/env node
/**
 * CLI 命令：构建索引
 * 读取 DB 文件夹，生成倒排索引 JSON
 */
import { promises as fs } from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { loadLatestConfig } from '../config/load.js';
import { buildIndex } from '../indexer/builder.js';
import { logger } from '../util/log.js';

interface BuildIndexArgs {
  db: string;               // DB CSV 文件路径
  out: string;              // 输出的 index.json 路径
  config?: string;          // 配置目录（默认 ./configs/latest.json）
  field1?: string;          // 字段1列名（默认从配置推断）
  field2?: string;          // 字段2列名（默认从配置推断）
  ngramSize?: number;       // n-gram 大小（默认 2）
  logLevel?: string;        // 日志级别
}

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .command(
      '$0',
      'Build inverted index from DB CSV file',
      (yargs) => {
        return yargs
          .option('db', {
            type: 'string',
            demandOption: true,
            description: 'Path to DB CSV file',
          })
          .option('out', {
            type: 'string',
            demandOption: true,
            description: 'Output path for index.json',
          })
          .option('config', {
            type: 'string',
            description: 'Path to repository root (default: current directory)',
          })
          .option('field1', {
            type: 'string',
            alias: 'f1',
            description: 'Column name for field 1 (supplier)',
            default: 's_field1',
          })
          .option('field2', {
            type: 'string',
            alias: 'f2',
            description: 'Column name for field 2 (project)',
            default: 's_field2',
          })
          .option('ngram-size', {
            type: 'number',
            description: 'n-gram size for tokenization',
            default: 2,
          })
          .option('log-level', {
            type: 'string',
            choices: ['debug', 'info', 'warn', 'error', 'silent'],
            description: 'Log level',
            default: 'info',
          })
          .example('$0 --db ./db/db.csv --out ./index.json', 'Build index from db.csv')
          .example(
            '$0 --db ./db/db.csv --out ./index.json --config ./configs/latest.json',
            'Build index with custom config'
          );
      }
    )
    .help()
    .alias('help', 'h')
    .version('0.1.1')
    .alias('version', 'v')
    .parse();

  const args = argv as unknown as BuildIndexArgs;

  // 设置日志级别
  if (args.logLevel) {
    logger.setLevel(args.logLevel as any);
  }

  logger.info('cli.build-index', `Starting index build...`);
  logger.info('cli.build-index', `DB: ${args.db}`);
  logger.info('cli.build-index', `Output: ${args.out}`);

  try {
    // 1. 加载配置
    const repoRoot = args.config || process.cwd();

    logger.info('cli.build-index', `Loading config from ${repoRoot}`);
    const config = await loadLatestConfig(repoRoot);

    logger.info(
      'cli.build-index',
      `Config loaded: version=${config.version}, sha=${config.sha}`
    );

    // 2. 构建索引
    const index = await buildIndex(args.db, config.normalize, {
      ngramSize: args.ngramSize,
      field1Column: args.field1,
      field2Column: args.field2,
    });

    // 3. 写入 JSON
    const outDir = path.dirname(args.out);
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(args.out, JSON.stringify(index, null, 2), 'utf-8');

    logger.info('cli.build-index', `Index saved to ${args.out}`);
    logger.info(
      'cli.build-index',
      `Summary: ${index.total_rows} rows, ${index.meta.unique_tokens} tokens, digest=${index.digest.substring(0, 16)}...`
    );

    console.log('\n✅ Index built successfully!');
    console.log(`   Output: ${args.out}`);
    console.log(`   Rows: ${index.total_rows}`);
    console.log(`   Tokens: ${index.meta.unique_tokens}`);
    console.log(`   Digest: ${index.digest.substring(0, 16)}...`);

    process.exit(0);
  } catch (error) {
    logger.error('cli.build-index', error as Error);
    console.error('\n❌ Failed to build index:');
    console.error(`   ${(error as Error).message}`);
    process.exit(1);
  }
}

main();
