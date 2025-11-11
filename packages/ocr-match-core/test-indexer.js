/**
 * 测试 indexer 模块
 * 验证 CSV 读取、n-gram 分词、倒排索引构建
 */
import { buildIndex, tokenize, computeDigest, loadLatestConfig } from './dist/index.js';

async function testIndexer() {
  console.log('=== 测试 indexer 模块 ===\n');

  // 1. 测试 tokenize 函数
  console.log('1. 测试 tokenize (2-gram)');
  const text1 = '河南宏凯';
  const tokens1 = tokenize(text1, 2);
  console.log(`  输入: "${text1}"`);
  console.log(`  输出: ${JSON.stringify(tokens1)}`);
  console.log(`  期望: ["河南","南宏","宏凯"]`);
  console.log(`  ✓ 通过: ${JSON.stringify(tokens1) === JSON.stringify(["河南","南宏","宏凯"])}\n`);

  // 2. 测试 computeDigest
  console.log('2. 测试 computeDigest');
  const dbPath = './test-data/sample_db.csv';
  const digest = computeDigest(dbPath);
  console.log(`  文件: ${dbPath}`);
  console.log(`  Digest: ${digest.substring(0, 16)}...`);
  console.log(`  长度: ${digest.length} (期望 64)`);
  console.log(`  ✓ 通过: ${digest.length === 64}\n`);

  // 3. 测试 buildIndex
  console.log('3. 测试 buildIndex (完整流程)');
  const repoRoot = '../../'; // 从 packages/ocr-match-core 到根目录
  const config = loadLatestConfig(repoRoot);
  const index = await buildIndex(dbPath, config.normalize, {
    ngramSize: 2,
    field1Column: 's_field1',
    field2Column: 's_field2',
  });

  console.log(`  版本: ${index.version}`);
  console.log(`  DB路径: ${index.db_path}`);
  console.log(`  Digest: ${index.digest.substring(0, 16)}...`);
  console.log(`  总行数: ${index.total_rows}`);
  console.log(`  唯一Token数: ${index.meta.unique_tokens}`);
  console.log(`  列名: ${index.meta.columns.join(', ')}`);
  console.log(`  n-gram大小: ${index.meta.ngram_size}`);

  // 4. 检查倒排索引结构
  console.log('\n4. 检查倒排索引（前 5 个 token）');
  const tokens = Object.keys(index.inverted).slice(0, 5);
  for (const token of tokens) {
    const rowIds = index.inverted[token];
    console.log(`  "${token}" -> [${rowIds.join(', ')}] (${rowIds.length} rows)`);
  }

  // 5. 测试特定 token 查询
  console.log('\n5. 测试 token 查询');
  const testToken = '河南';
  const matchingRows = index.inverted[testToken] || [];
  console.log(`  查询 token: "${testToken}"`);
  console.log(`  匹配行数: ${matchingRows.length}`);
  if (matchingRows.length > 0) {
    const rowId = matchingRows[0];
    const row = index.rows.find(r => r.id === rowId);
    console.log(`  第一个匹配行: id=${row.id}, f1="${row.f1}", f2="${row.f2}"`);
  }

  // 6. 验收条件
  console.log('\n=== 验收检查 ===');
  const checks = [
    { name: '行数正确', pass: index.total_rows === 5 },
    { name: 'Token数 > 0', pass: index.meta.unique_tokens > 0 },
    { name: 'Digest长度64', pass: index.digest.length === 64 },
    { name: '包含列名', pass: index.meta.columns.includes('s_field1') && index.meta.columns.includes('s_field2') },
    { name: '倒排索引非空', pass: Object.keys(index.inverted).length > 0 },
  ];

  let allPassed = true;
  for (const check of checks) {
    console.log(`  ${check.pass ? '✓' : '✗'} ${check.name}`);
    if (!check.pass) allPassed = false;
  }

  console.log(`\n${allPassed ? '🎉 所有测试通过！' : '❌ 部分测试失败'}`);
  return allPassed;
}

testIndexer().catch(err => {
  console.error('测试失败:', err);
  process.exit(1);
});
