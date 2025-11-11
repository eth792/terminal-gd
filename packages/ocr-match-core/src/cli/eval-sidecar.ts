#!/usr/bin/env node
/**
 * CLI 命令：评估工具
 * 对比 results.csv 和人工标注 sidecar，输出准确率评估
 */
import { promises as fs } from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { logger } from '../util/log.js';

interface EvalArgs {
  results: string;          // results.csv 文件路径
  sidecar: string;          // sidecar JSON 目录或文件
  out: string;              // 输出评估报告路径
  logLevel?: string;        // 日志级别
}

interface SidecarEntry {
  file_name: string;
  ground_truth: {
    supplier: string;
    project: string;
  };
}

interface ResultRow {
  file_name: string;
  q_supplier: string;
  q_project: string;
  cand_f1: string;
  cand_f2: string;
  score: number;
  bucket: string;
}

async function loadSidecar(sidecarPath: string): Promise<Map<string, SidecarEntry>> {
  const map = new Map<string, SidecarEntry>();

  // 检查是否为目录
  const stat = await fs.stat(sidecarPath);

  if (stat.isDirectory()) {
    // 读取目录下所有 .json 文件
    const files = await fs.readdir(sidecarPath);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(sidecarPath, file), 'utf-8');
        const entry: SidecarEntry = JSON.parse(content);
        map.set(entry.file_name, entry);
      }
    }
  } else {
    // 单个 JSON 文件（数组格式）
    const content = await fs.readFile(sidecarPath, 'utf-8');
    const entries: SidecarEntry[] = JSON.parse(content);
    for (const entry of entries) {
      map.set(entry.file_name, entry);
    }
  }

  return map;
}

async function loadResults(resultsPath: string): Promise<ResultRow[]> {
  const content = await fs.readFile(resultsPath, 'utf-8');
  const lines = content.trim().split('\n');

  if (lines.length === 0) {
    throw new Error('Empty results.csv');
  }

  // 跳过 header
  const rows: ResultRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 11) continue;

    rows.push({
      file_name: parts[0],
      q_supplier: parts[1],
      q_project: parts[2],
      cand_f1: parts[3],
      cand_f2: parts[4],
      score: parseFloat(parts[9]),
      bucket: parts[10],
    });
  }

  return rows;
}

function normalizeForComparison(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '');
}

function evaluateResults(
  results: ResultRow[],
  sidecar: Map<string, SidecarEntry>
): {
  top1_correct: number;
  top3_correct: number;
  total: number;
  auto_pass_correct: number;
  auto_pass_total: number;
  failures: Record<string, number>;
} {
  let top1_correct = 0;
  let top3_correct = 0;
  let total = 0;
  let auto_pass_correct = 0;
  let auto_pass_total = 0;
  const failures: Record<string, number> = {};

  for (const result of results) {
    const gt = sidecar.get(result.file_name);
    if (!gt) continue;

    total++;

    const gt_supplier = normalizeForComparison(gt.ground_truth.supplier);
    const gt_project = normalizeForComparison(gt.ground_truth.project);
    const pred_supplier = normalizeForComparison(result.cand_f1);
    const pred_project = normalizeForComparison(result.cand_f2);

    // Top1 准确率
    if (gt_supplier === pred_supplier && gt_project === pred_project) {
      top1_correct++;
    } else {
      // 记录失败原因
      const reason = result.bucket === 'fail' ? 'MATCH_FAIL' : 'WRONG_CANDIDATE';
      failures[reason] = (failures[reason] || 0) + 1;
    }

    // AutoPass 准确率
    if (result.bucket === 'exact') {
      auto_pass_total++;
      if (gt_supplier === pred_supplier && gt_project === pred_project) {
        auto_pass_correct++;
      }
    }

    // TODO: Top3 准确率需要读取 results_top3.csv
  }

  return {
    top1_correct,
    top3_correct: 0, // 暂不实现
    total,
    auto_pass_correct,
    auto_pass_total,
    failures,
  };
}

function generateReport(
  eval_result: ReturnType<typeof evaluateResults>,
  outPath: string
): string {
  const top1_percent = eval_result.total > 0 ? (eval_result.top1_correct / eval_result.total) * 100 : 0;
  const auto_pass_percent =
    eval_result.auto_pass_total > 0 ? (eval_result.auto_pass_correct / eval_result.auto_pass_total) * 100 : 0;

  const report = `# OCR 匹配评估报告

**评估时间**: ${new Date().toISOString()}

---

## 准确率指标

| 指标 | 正确数 | 总数 | 准确率 |
|------|--------|------|--------|
| Top1 | ${eval_result.top1_correct} | ${eval_result.total} | ${top1_percent.toFixed(1)}% |
| AutoPass | ${eval_result.auto_pass_correct} | ${eval_result.auto_pass_total} | ${auto_pass_percent.toFixed(1)}% |

---

## 失败原因分布

${
  Object.entries(eval_result.failures).length > 0
    ? Object.entries(eval_result.failures)
        .sort((a, b) => b[1] - a[1])
        .map(([reason, count]) => `- **${reason}**: ${count} 次`)
        .join('\n')
    : '（无失败记录）'
}

---

## 总结

- **样本总数**: ${eval_result.total}
- **Top1 准确率**: ${top1_percent.toFixed(1)}%
- **AutoPass 准确率**: ${auto_pass_percent.toFixed(1)}%

${
  top1_percent < 80
    ? `⚠️ **Top1 准确率低于 80%**，建议检查：
1. 提取阶段错误率（是否 > 5%）
2. 增加 normalize 规则
3. 调整 n-gram 大小或相似度权重`
    : '✅ Top1 准确率达标'
}

---

生成时间：${new Date().toLocaleString()}
`;

  return report;
}

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .command(
      '$0',
      'Evaluate OCR matching results against ground truth',
      (yargs) => {
        return yargs
          .option('results', {
            type: 'string',
            demandOption: true,
            description: 'Path to results.csv',
          })
          .option('sidecar', {
            type: 'string',
            demandOption: true,
            description: 'Path to sidecar JSON directory or file',
          })
          .option('out', {
            type: 'string',
            demandOption: true,
            description: 'Output path for evaluation report (eval.md)',
          })
          .option('log-level', {
            type: 'string',
            choices: ['debug', 'info', 'warn', 'error', 'silent'],
            description: 'Log level',
            default: 'info',
          })
          .example(
            '$0 --results ./runs/run_test/results.csv --sidecar ./sidecar_json --out ./runs/run_test/eval.md',
            'Evaluate results against sidecar'
          );
      }
    )
    .help()
    .alias('help', 'h')
    .version('0.1.1')
    .alias('version', 'v')
    .parse();

  const args = argv as unknown as EvalArgs;

  // 设置日志级别
  if (args.logLevel) {
    logger.setLevel(args.logLevel as any);
  }

  logger.info('cli.eval', `Starting evaluation...`);
  logger.info('cli.eval', `Results: ${args.results}`);
  logger.info('cli.eval', `Sidecar: ${args.sidecar}`);

  try {
    // 1. 加载 sidecar
    logger.info('cli.eval', `Loading sidecar from ${args.sidecar}`);
    const sidecar = await loadSidecar(args.sidecar);
    logger.info('cli.eval', `Loaded ${sidecar.size} ground truth entries`);

    // 2. 加载 results.csv
    logger.info('cli.eval', `Loading results from ${args.results}`);
    const results = await loadResults(args.results);
    logger.info('cli.eval', `Loaded ${results.length} result entries`);

    // 3. 评估
    logger.info('cli.eval', `Evaluating...`);
    const eval_result = evaluateResults(results, sidecar);

    // 4. 生成报告
    const report = generateReport(eval_result, args.out);
    await fs.writeFile(args.out, report, 'utf-8');

    logger.info('cli.eval', `Evaluation report written to ${args.out}`);

    // 5. 打印统计
    const top1_percent = eval_result.total > 0 ? (eval_result.top1_correct / eval_result.total) * 100 : 0;

    console.log('\n✅ Evaluation completed!');
    console.log(`   Output: ${args.out}`);
    console.log(`   Total samples: ${eval_result.total}`);
    console.log(`   Top1 accuracy: ${top1_percent.toFixed(1)}%`);
    console.log(
      `   AutoPass accuracy: ${
        eval_result.auto_pass_total > 0
          ? ((eval_result.auto_pass_correct / eval_result.auto_pass_total) * 100).toFixed(1)
          : 0
      }%`
    );

    process.exit(0);
  } catch (error) {
    logger.error('cli.eval', error as Error);
    console.error('\n❌ Failed to evaluate results:');
    console.error(`   ${(error as Error).message}`);
    process.exit(1);
  }
}

main();
