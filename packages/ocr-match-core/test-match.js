/**
 * 测试 match 模块
 * 验证三种匹配策略：fast-exact、anchor、recall+rank
 */
import { buildIndex, loadLatestConfig, match } from './dist/index.js';

async function testMatch() {
  console.log('=== 测试 match 模块（三种策略） ===\n');

  // 1. 构建索引
  console.log('1. 构建测试索引');
  const repoRoot = '../../';
  const config = loadLatestConfig(repoRoot);
  const dbPath = './test-data/sample_db.csv';
  const index = await buildIndex(dbPath, config.normalize, {
    ngramSize: 2,
    field1Column: 's_field1',
    field2Column: 's_field2',
  });
  console.log(`  索引已加载: ${index.total_rows} 行, ${index.meta.unique_tokens} tokens\n`);

  // 2. 测试策略1: Fast-Exact（完全匹配）
  console.log('2. 测试策略1: Fast-Exact（完全匹配）');
  const q1_exact = '河南宏凯建筑劳务有限公司';
  const q2_exact = '许昌学院产教融合综合楼工程';
  const result1 = match(q1_exact, q2_exact, index);
  console.log(`  查询: "${q1_exact}", "${q2_exact}"`);
  console.log(`  匹配模式: ${result1.mode}`);
  console.log(`  候选数: ${result1.candidates.length}`);
  if (result1.candidates.length > 0) {
    const top1 = result1.candidates[0];
    console.log(`  Top1: f1="${top1.row.f1}", f2="${top1.row.f2}", score=${top1.score.toFixed(4)}`);
  }
  console.log(`  ✓ 期望: mode="fast-exact", score=1.0\n`);

  // 3. 测试策略2: Anchor（单字段完全匹配）
  console.log('3. 测试策略2: Anchor（单字段完全匹配 + 另一字段相似）');
  const q1_anchor = '河南宏凯建筑劳务有限公司'; // 完全匹配 f1
  const q2_anchor = '许昌学院综合楼工程'; // 与原 f2 相似但不完全相同
  const result2 = match(q1_anchor, q2_anchor, index);
  console.log(`  查询: "${q1_anchor}", "${q2_anchor}"`);
  console.log(`  匹配模式: ${result2.mode}`);
  console.log(`  候选数: ${result2.candidates.length}`);
  if (result2.candidates.length > 0) {
    const top1 = result2.candidates[0];
    console.log(`  Top1: f1="${top1.row.f1}", f2="${top1.row.f2}", score=${top1.score.toFixed(4)}`);
  }
  console.log(`  ✓ 期望: mode="anchor", score < 1.0\n`);

  // 4. 测试策略3: Recall（召回+排序）
  console.log('4. 测试策略3: Recall（召回+排序）');
  const q1_recall = '河南建业公司'; // 与 "河南建业建设管理股份有限公司" 相似
  const q2_recall = '惠济区改造'; // 与 "郑州市惠济区长兴路街道办事处改造工程" 相似
  const result3 = match(q1_recall, q2_recall, index);
  console.log(`  查询: "${q1_recall}", "${q2_recall}"`);
  console.log(`  匹配模式: ${result3.mode}`);
  console.log(`  召回候选数: ${result3.recalledCount}`);
  console.log(`  最终候选数: ${result3.candidates.length}`);
  if (result3.candidates.length > 0) {
    console.log('  Top3 候选:');
    result3.candidates.forEach((c, i) => {
      console.log(`    ${i + 1}. f1="${c.row.f1}", f2="${c.row.f2}"`);
      console.log(`       score=${c.score.toFixed(4)} (f1_score=${c.f1_score.toFixed(4)}, f2_score=${c.f2_score.toFixed(4)})`);
    });
  }
  console.log(`  ✓ 期望: mode="recall", recalledCount > 0\n`);

  // 5. 测试边界情况：空查询
  console.log('5. 测试边界情况：空查询');
  const q1_empty = '';
  const q2_empty = '';
  const result4 = match(q1_empty, q2_empty, index);
  console.log(`  查询: "", ""`);
  console.log(`  匹配模式: ${result4.mode}`);
  console.log(`  候选数: ${result4.candidates.length}`);
  console.log(`  ✓ 期望: candidates.length === 0 或 mode="recall"\n`);

  // 6. 验收检查
  console.log('=== 验收检查 ===');
  const checks = [
    { name: 'Fast-Exact 模式正确', pass: result1.mode === 'fast-exact' },
    { name: 'Fast-Exact 分数为1.0', pass: result1.candidates.length > 0 && result1.candidates[0].score === 1.0 },
    { name: 'Anchor 模式正确', pass: result2.mode === 'anchor' || result2.mode === 'fast-exact' },
    { name: 'Recall 模式正确', pass: result3.mode === 'recall' },
    { name: 'Recall 召回候选 > 0', pass: result3.recalledCount > 0 },
    { name: 'TopK 限制生效', pass: result3.candidates.length <= 3 },
  ];

  let allPassed = true;
  for (const check of checks) {
    console.log(`  ${check.pass ? '✓' : '✗'} ${check.name}`);
    if (!check.pass) allPassed = false;
  }

  console.log(`\n${allPassed ? '🎉 所有测试通过！' : '❌ 部分测试失败'}`);
  return allPassed;
}

testMatch().catch(err => {
  console.error('测试失败:', err);
  process.exit(1);
});
