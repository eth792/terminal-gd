#!/usr/bin/env node
/**
 * Phase 1 验收测试：提取准确率测试（5个样本）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { loadLatestConfig, extract } from './dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '../..');

// 使用全部19个有sidecar的样本进行完整测试
const testSamples = [
  'aibobaiyun4100962241',
  'andelijituanyouxiangongsi4100968520',
  'andelijituanyouxiangongsi4100968541',
  'baodingshiwuxingdianqi4100967040',
  'baodingshiwuxingdianqiyouxiangongsi4100968568',
  'baohuixianlan4100908540',
  'baohuixianlanjituan4100965990',
  'baoshengkejichuangxingufenyouxiangongsi4100912930',
  'baoshengkejichuangxingufenyouxiangongsi4100931553',
  'baoshengkejichuangxingufenyouxiangongsi4100931561',
  'baoshengkejichuangxingufenyouxiangongsi4100931841',
  'baoshengkejichuangxingufenyouxiangongsi4100954930',
  'baoshengkejichuangxingufenyouxiangongsi4100962417',
  'baoshengkejichuangxingufenyouxiangongsi4100965595',
  'baoshengkejichuangxingufenyouxiangongsi4100965901',
  'beijingheruisaierdianlikejigufen4100880820',
  'beijingheruisaierdianlikejigufen4100880903',
  'beijingheruisaierdianlikejigufen4100904491',
  'beijingheruisaierdianlikejigufen4100908541',
];

console.log('【Phase 1 完整验收测试】提取准确率测试（全部19个样本）\n');
console.log(`样本数量: ${testSamples.length}\n`);

try {
  // 加载配置
  const config = loadLatestConfig(repoRoot);
  console.log(`✅ 配置加载成功 (version=${config.version}, sha=${config.sha})\n`);

  let correctSupplier = 0;
  let correctProject = 0;
  const results = [];

  for (const sample of testSamples) {
    // 读取OCR文本
    const ocrPath = path.join(repoRoot, 'data/ocr_txt', `${sample}.txt`);
    if (!fs.existsSync(ocrPath)) {
      console.log(`⚠️  跳过 ${sample}: OCR文件不存在`);
      continue;
    }
    const ocrText = fs.readFileSync(ocrPath, 'utf-8');

    // 读取ground truth
    const sidecarPath = path.join(repoRoot, 'configs/sidecar_json', `${sample}.json`);
    if (!fs.existsSync(sidecarPath)) {
      console.log(`⚠️  跳过 ${sample}: sidecar文件不存在`);
      continue;
    }
    const sidecar = JSON.parse(fs.readFileSync(sidecarPath, 'utf-8'));
    const groundTruth = {
      supplier: sidecar.fields['供应商'] || '',
      project: sidecar.fields['工程名称'] || '',
    };

    // 提取字段
    const extracted = extract(ocrText, config);

    // 对比结果（归一化后）
    const supplierMatch =
      extracted.q_supplier === config.normalize.replacements.reduce(
        (acc, rule) => acc.replace(new RegExp(rule.pattern, rule.flags || 'g'), rule.replace),
        groundTruth.supplier
      ).replace(/\s+/g, '');

    const projectMatch =
      extracted.q_project.includes(
        config.normalize.replacements.reduce(
          (acc, rule) => acc.replace(new RegExp(rule.pattern, rule.flags || 'g'), rule.replace),
          groundTruth.project
        ).replace(/\s+/g, '').substring(0, 10)
      );

    if (supplierMatch || extracted.q_supplier.includes(groundTruth.supplier.replace(/\s+/g, ''))) {
      correctSupplier++;
    }
    if (projectMatch || extracted.q_project.includes(groundTruth.project.replace(/\s+/g, '').substring(0, 10))) {
      correctProject++;
    }

    results.push({
      sample: sample.substring(0, 30) + '...',
      supplier_ok: supplierMatch || extracted.q_supplier.includes(groundTruth.supplier.replace(/\s+/g, '')),
      project_ok: projectMatch || extracted.q_project.includes(groundTruth.project.replace(/\s+/g, '').substring(0, 10)),
      extracted_supplier: extracted.q_supplier.substring(0, 20),
      extracted_project: extracted.q_project.substring(0, 30),
      gt_supplier: groundTruth.supplier.substring(0, 20),
      gt_project: groundTruth.project.substring(0, 30),
      warns: extracted.warns.join(', '),
    });
  }

  // 输出结果
  console.log('═'.repeat(80));
  console.log('提取结果：\n');
  for (const r of results) {
    console.log(`样本: ${r.sample}`);
    console.log(`  供应商: ${r.supplier_ok ? '✅' : '❌'} [提取] ${r.extracted_supplier}... [真值] ${r.gt_supplier}...`);
    console.log(`  工  程: ${r.project_ok ? '✅' : '❌'} [提取] ${r.extracted_project}... [真值] ${r.gt_project}...`);
    if (r.warns) {
      console.log(`  警  告: ${r.warns}`);
    }
    console.log('');
  }

  console.log('═'.repeat(80));
  console.log('\n【验收结果】');
  console.log(`供应商准确率: ${correctSupplier}/${results.length} (${((correctSupplier / results.length) * 100).toFixed(1)}%)`);
  console.log(`工程准确率:   ${correctProject}/${results.length} (${((correctProject / results.length) * 100).toFixed(1)}%)`);
  console.log(`综合准确率:   ${((correctSupplier + correctProject) / (results.length * 2) * 100).toFixed(1)}%`);

  const passThreshold = 0.95; // 目标: > 95% 准确率
  const actualAccuracy = (correctSupplier + correctProject) / (results.length * 2);

  if (actualAccuracy >= passThreshold) {
    console.log(`\n✅ Phase 1 验收通过！准确率 ${(actualAccuracy * 100).toFixed(1)}% >= ${(passThreshold * 100).toFixed(1)}%`);
    process.exit(0);
  } else {
    console.log(`\n❌ Phase 1 验收未通过。准确率 ${(actualAccuracy * 100).toFixed(1)}% < ${(passThreshold * 100).toFixed(1)}%`);
    console.log('建议：检查提取逻辑、增加normalize规则、调整标签别名');
    process.exit(1);
  }
} catch (error) {
  console.error('\n❌ 测试失败:', error.message);
  console.error(error.stack);
  process.exit(1);
}
