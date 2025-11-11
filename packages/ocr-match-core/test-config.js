#!/usr/bin/env node
/**
 * Task 2 验收测试：配置加载
 */
import { loadLatestConfig } from './dist/index.js';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '../..');

console.log('测试配置加载...\n');
console.log('仓库根目录:', repoRoot);

try {
  const config = loadLatestConfig(repoRoot);

  console.log('\n✅ 配置加载成功！\n');
  console.log('配置信息:');
  console.log('- 版本:', config.version);
  console.log('- SHA:', config.sha);
  console.log('- 根目录:', config.root);
  console.log('\n归一化规则:');
  console.log('- replacements:', config.normalize.replacements.length, '条');
  console.log('- maps:', Object.keys(config.normalize.maps || {}).length, '个');
  console.log('- strip:', config.normalize.strip.length, '个');
  console.log('\n标签别名:');
  console.log('- supplier:', config.label_alias.supplier.length, '个');
  console.log('- project:', config.label_alias.project.length, '个');
  console.log('- order:', config.label_alias.order?.length || 0, '个');
  console.log('\n领域配置:');
  console.log('- anchors.project:', config.domain.anchors?.project?.length || 0, '个');
  console.log('- noise_words:', config.domain.noise_words.length, '个');
  console.log('- stopwords:', config.domain.stopwords.length, '个');

  process.exit(0);
} catch (error) {
  console.error('\n❌ 配置加载失败:', error.message);
  process.exit(1);
}
