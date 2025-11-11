/**
 * 端到端测试：extract → match → bucketize 完整流程
 * 使用 sidecar OCR 文本文件进行测试
 */
import { buildIndex, loadLatestConfig, matchOcrFile, DEFAULT_BUCKET_CONFIG } from './dist/index.js';

async function testEndToEnd() {
  console.log('=== 端到端测试：完整匹配流程 ===\n');

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

  // 2. 创建测试 OCR 文件
  console.log('2. 创建测试 OCR 文件');
  const fs = await import('fs/promises');
  const testOcrPath = './test-data/test_ocr.txt';

  // 测试内容：应该匹配到 "河南宏凯建筑劳务有限公司" + "许昌学院产教融合综合楼工程"
  // 模拟真实 OCR 格式，确保标签和值分开在不同区域
  const ocrContent = `到货验收单号：2022042835415      第1次交货
报装编号：                  P2021211                供应商：                  河南宏凯建筑劳务有限公司
项目管理单位                    检修分公司综合室              工程名称：                  许昌学院产教融合综合楼工程
供应商联系人/电话：            孙友兵15995122190            承运商联系人/电话：              15995122190
`;

  await fs.writeFile(testOcrPath, ocrContent, 'utf-8');
  console.log(`  测试文件已创建: ${testOcrPath}\n`);

  // 3. 执行端到端匹配
  console.log('3. 执行端到端匹配（extract → match → bucketize）');
  const result = await matchOcrFile(testOcrPath, index, config, DEFAULT_BUCKET_CONFIG);

  console.log(`  文件名: ${result.file_name}`);
  console.log(`  提取结果:`);
  console.log(`    q_supplier: "${result.q_supplier}"`);
  console.log(`    q_project: "${result.q_project}"`);
  console.log(`  匹配模式: ${result.mode}`);
  console.log(`  候选数: ${result.candidates.length}`);

  if (result.candidates.length > 0) {
    console.log(`  Top1 候选:`);
    const top1 = result.candidates[0];
    console.log(`    f1: "${top1.row.f1}"`);
    console.log(`    f2: "${top1.row.f2}"`);
    console.log(`    score: ${top1.score.toFixed(4)} (f1=${top1.f1_score.toFixed(4)}, f2=${top1.f2_score.toFixed(4)})`);
  }

  console.log(`  分桶结果: ${result.bucket}`);
  console.log(`  失败原因: ${result.reason || 'null'}\n`);

  // 4. 测试边界情况：空提取
  console.log('4. 测试边界情况：空提取');
  const emptyOcrPath = './test-data/test_ocr_empty.txt';
  await fs.writeFile(emptyOcrPath, '这里没有任何有效信息\n随便写点东西', 'utf-8');

  const result2 = await matchOcrFile(emptyOcrPath, index, config, DEFAULT_BUCKET_CONFIG);
  console.log(`  提取结果: q1="${result2.q_supplier}", q2="${result2.q_project}"`);
  console.log(`  分桶结果: ${result2.bucket}`);
  console.log(`  失败原因: ${result2.reason}\n`);

  // 5. 测试低相似度匹配
  console.log('5. 测试低相似度匹配');
  const lowSimOcrPath = './test-data/test_ocr_lowsim.txt';
  const lowSimContent = `
供应商名称：某某公司
工程名称：某某项目
`;
  await fs.writeFile(lowSimOcrPath, lowSimContent, 'utf-8');

  const result3 = await matchOcrFile(lowSimOcrPath, index, config, DEFAULT_BUCKET_CONFIG);
  console.log(`  提取结果: q1="${result3.q_supplier}", q2="${result3.q_project}"`);
  console.log(`  匹配模式: ${result3.mode}`);
  console.log(`  候选数: ${result3.candidates.length}`);
  if (result3.candidates.length > 0) {
    const top1 = result3.candidates[0];
    console.log(`  Top1 score: ${top1.score.toFixed(4)}`);
  }
  console.log(`  分桶结果: ${result3.bucket}`);
  console.log(`  失败原因: ${result3.reason}\n`);

  // 6. 验收检查
  console.log('=== 验收检查 ===');
  const checks = [
    { name: 'Fast-Exact 正确提取', pass: result.q_supplier === '河南宏凯建筑劳务有限公司' && result.q_project === '许昌学院产教融合综合楼工程' },
    { name: 'Fast-Exact 匹配模式', pass: result.mode === 'fast-exact' },
    { name: 'Fast-Exact 分桶为 exact', pass: result.bucket === 'exact' },
    { name: '空提取分桶为 fail', pass: result2.bucket === 'fail' },
    { name: '空提取原因正确', pass: result2.reason === 'EXTRACT_BOTH_EMPTY' },
    { name: '低相似度有候选', pass: result3.candidates.length > 0 },
  ];

  let allPassed = true;
  for (const check of checks) {
    console.log(`  ${check.pass ? '✓' : '✗'} ${check.name}`);
    if (!check.pass) allPassed = false;
  }

  console.log(`\n${allPassed ? '🎉 所有测试通过！' : '❌ 部分测试失败'}`);

  // 清理
  await fs.unlink(testOcrPath).catch(() => {});
  await fs.unlink(emptyOcrPath).catch(() => {});
  await fs.unlink(lowSimOcrPath).catch(() => {});

  return allPassed;
}

testEndToEnd().catch(err => {
  console.error('测试失败:', err);
  process.exit(1);
});
