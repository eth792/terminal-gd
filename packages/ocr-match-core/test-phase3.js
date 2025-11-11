/**
 * Phase 3 验收：10 个 sidecar 样本 Top3 候选人工检查
 * 使用真实 OCR 文件和 sample DB，输出 Top3 候选供人工审核
 */
import { buildIndex, loadLatestConfig, matchOcrBatch, DEFAULT_BUCKET_CONFIG } from './dist/index.js';
import { promises as fs } from 'fs';
import path from 'path';

async function phase3Validation() {
  console.log('=== Phase 3 验收：10 个样本 Top3 候选质量检查 ===\n');

  // 1. 加载配置和构建索引
  console.log('1. 加载配置和构建索引');
  const repoRoot = '../../';
  const config = loadLatestConfig(repoRoot);
  const dbPath = './test-data/sample_db.csv';
  const index = await buildIndex(dbPath, config.normalize, {
    ngramSize: 2,
    field1Column: 's_field1',
    field2Column: 's_field2',
  });
  console.log(`  索引已加载: ${index.total_rows} 行\n`);

  // 2. 选择 10 个 sidecar 样本（从 data/ocr_txt/ 目录）
  const ocrDir = '../../data/ocr_txt';
  let allFiles;
  try {
    allFiles = await fs.readdir(ocrDir);
  } catch (err) {
    console.error(`  ❌ 无法读取 OCR 目录: ${ocrDir}`);
    console.error(`  请确保 sidecar OCR 文件位于 ${ocrDir}`);
    return false;
  }

  const ocrFiles = allFiles.filter(f => f.endsWith('.txt')).slice(0, 10);
  console.log(`2. 选择 ${ocrFiles.length} 个样本进行测试\n`);

  if (ocrFiles.length === 0) {
    console.error('  ❌ 未找到 OCR 文件');
    return false;
  }

  // 3. 批量匹配
  console.log('3. 执行批量匹配（extract → match → bucketize）');
  const ocrPaths = ocrFiles.map(f => path.join(ocrDir, f));
  const results = await matchOcrBatch(ocrPaths, index, config, DEFAULT_BUCKET_CONFIG);

  // 4. 输出结果供人工审核
  console.log(`\n=== 匹配结果（Top3 候选）===\n`);

  for (const result of results) {
    console.log(`文件: ${result.file_name}`);
    console.log(`  提取字段:`);
    console.log(`    q_supplier: "${result.q_supplier}"`);
    console.log(`    q_project: "${result.q_project}"`);
    console.log(`  匹配模式: ${result.mode}`);
    console.log(`  分桶结果: ${result.bucket} ${result.reason ? `(${result.reason})` : ''}`);

    if (result.candidates.length > 0) {
      console.log(`  Top3 候选:`);
      result.candidates.forEach((c, i) => {
        console.log(`    ${i + 1}. [score=${c.score.toFixed(4)}] (f1=${c.f1_score.toFixed(4)}, f2=${c.f2_score.toFixed(4)})`);
        console.log(`       f1: "${c.row.f1}"`);
        console.log(`       f2: "${c.row.f2}"`);
      });
    } else {
      console.log(`  ❌ 无候选`);
    }
    console.log('');
  }

  // 5. 统计
  console.log('=== 统计信息 ===');
  const buckets = {
    exact: results.filter(r => r.bucket === 'exact').length,
    review: results.filter(r => r.bucket === 'review').length,
    fail: results.filter(r => r.bucket === 'fail').length,
  };

  const modes = {
    'fast-exact': results.filter(r => r.mode === 'fast-exact').length,
    anchor: results.filter(r => r.mode === 'anchor').length,
    recall: results.filter(r => r.mode === 'recall').length,
  };

  console.log(`  分桶分布: exact=${buckets.exact}, review=${buckets.review}, fail=${buckets.fail}`);
  console.log(`  模式分布: fast-exact=${modes['fast-exact']}, anchor=${modes.anchor}, recall=${modes.recall}`);

  const withCandidates = results.filter(r => r.candidates.length > 0);
  console.log(`  有候选的样本: ${withCandidates.length}/${results.length}\n`);

  // 6. 人工审核提示
  console.log('=== 人工审核指南 ===');
  console.log('请检查以下内容：');
  console.log('  1. Top1 候选是否与提取字段匹配（目标：≥ 80% 准确）');
  console.log('  2. Top3 是否包含正确答案（目标：≥ 90% 召回）');
  console.log('  3. 分数排序是否合理（Top1 > Top2 > Top3）');
  console.log('  4. 分桶结果是否符合预期\n');

  console.log('✅ Phase 3 验收脚本执行完成，请人工审核上述结果');
  return true;
}

phase3Validation().catch(err => {
  console.error('验收失败:', err);
  process.exit(1);
});
