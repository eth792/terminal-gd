#!/usr/bin/env node
/**
 * 分析所有 19 个样本的标签-值结构
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '../..');

// 获取所有 sidecar 样本
const sidecarDir = path.join(repoRoot, 'configs/sidecar_json');
const sidecarFiles = fs.readdirSync(sidecarDir).filter(f => f.endsWith('.json'));

console.log(`分析 ${sidecarFiles.length} 个样本的标签-值结构\n`);
console.log('='.repeat(100));

const labels = ['供应商', '工程名称'];
const issues = [];

for (const sidecarFile of sidecarFiles) {
  const sampleName = sidecarFile.replace('.json', '');

  // 读取 sidecar
  const sidecarPath = path.join(sidecarDir, sidecarFile);
  const sidecar = JSON.parse(fs.readFileSync(sidecarPath, 'utf-8'));

  // 读取 OCR 文本
  const ocrPath = path.join(repoRoot, 'data/ocr_txt', `${sampleName}.txt`);
  if (!fs.existsSync(ocrPath)) {
    console.log(`⚠️  ${sampleName}: OCR 文件不存在`);
    continue;
  }

  const ocrText = fs.readFileSync(ocrPath, 'utf-8');
  const lines = ocrText.split('\n');

  console.log(`\n样本: ${sampleName}`);
  console.log(`供应商真值: ${sidecar.fields['供应商'] || 'N/A'}`);
  console.log(`工程真值: ${sidecar.fields['工程名称'] || 'N/A'}`);

  // 分析每个标签
  for (const label of labels) {
    const groundTruth = sidecar.fields[label];
    if (!groundTruth) continue;

    // 查找标签位置
    let labelLineIndex = -1;
    let labelLine = '';
    let valueAfterLabel = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes(label)) {
        labelLineIndex = i;
        labelLine = line;

        // 提取标签后的内容
        const labelIndex = line.indexOf(label);
        valueAfterLabel = line.substring(labelIndex + label.length).trim();
        valueAfterLabel = valueAfterLabel.replace(/^[:：=\s]+/, '');

        break;
      }
    }

    if (labelLineIndex === -1) {
      console.log(`  ❌ ${label}: 未找到标签`);
      issues.push({ sample: sampleName, field: label, issue: '未找到标签' });
      continue;
    }

    // 检查标签后的值是否包含大部分真值
    const gtNormalized = groundTruth.replace(/\s+/g, '').substring(0, 10);
    const hasValueAfter = valueAfterLabel.replace(/\s+/g, '').includes(gtNormalized);

    // 检查上一行是否包含真值
    const prevLine = labelLineIndex > 0 ? lines[labelLineIndex - 1] : '';
    const hasValueBefore = prevLine.replace(/\s+/g, '').includes(gtNormalized);

    // 检查下一行是否包含真值
    const nextLine = labelLineIndex < lines.length - 1 ? lines[labelLineIndex + 1] : '';
    const hasValueBelow = nextLine.replace(/\s+/g, '').includes(gtNormalized);

    console.log(`  ${label}:`);
    console.log(`    标签位置: 第 ${labelLineIndex + 1} 行`);
    console.log(`    标签行: ${labelLine.substring(0, 80)}...`);
    console.log(`    标签后值: ${valueAfterLabel.substring(0, 50)}... (匹配: ${hasValueAfter ? '✅' : '❌'})`);
    console.log(`    上一行值: ${prevLine.substring(0, 50).trim()}... (匹配: ${hasValueBefore ? '✅' : '❌'})`);
    console.log(`    下一行值: ${nextLine.substring(0, 50).trim()}... (匹配: ${hasValueBelow ? '✅' : '❌'})`);

    if (!hasValueAfter && !hasValueBelow) {
      issues.push({
        sample: sampleName,
        field: label,
        issue: hasValueBefore ? '值在标签之前（表格错位）' : '值未找到'
      });
    }
  }
}

console.log('\n' + '='.repeat(100));
console.log('\n【问题汇总】');
console.log(`总样本数: ${sidecarFiles.length}`);
console.log(`发现问题: ${issues.length} 个\n`);

const issuesByType = {};
for (const issue of issues) {
  const key = issue.issue;
  if (!issuesByType[key]) issuesByType[key] = [];
  issuesByType[key].push(`${issue.sample} - ${issue.field}`);
}

for (const [issueType, cases] of Object.entries(issuesByType)) {
  console.log(`\n${issueType}: ${cases.length} 个`);
  for (const c of cases.slice(0, 5)) {
    console.log(`  - ${c}`);
  }
  if (cases.length > 5) {
    console.log(`  ... 还有 ${cases.length - 5} 个`);
  }
}
