#!/usr/bin/env node
import fs from 'node:fs';

const ocrPath = '/Users/caron/Developer/milk/terminal-gd/data/ocr_txt/baoshengkejichuangxingufenyouxiangongsi4100931561.txt';
const ocrText = fs.readFileSync(ocrPath, 'utf-8');

const linesRaw = ocrText.split('\n');
const lines = linesRaw.map((l) => l.trim());

// 模拟查找"工程名称"标签
const labels = ["工程名称", "单体工程名称", "项目定义号", "项目定义号.1", "项目属性"];
const label = '工程名称';
let i = -1;
for (let idx = 0; idx < lines.length; idx++) {
  if (lines[idx].includes(label)) {
    i = idx;
    break;
  }
}

console.log(`找到标签 "${label}" 在第 ${i + 1} 行 (索引 ${i})\n`);

const line = lines[i];
const labelIndex = line.indexOf(label);
let value = line.substring(labelIndex + label.length).trim();
value = value.replace(/^[:：=\s]+/, '');

console.log(`标签后的值: "${value}"`);
console.log(`值长度: ${value.length}\n`);

// 测试向上查找条件
const needLookupPrev =
  (value.length < 5) ||
  (i > 0 && !/公司|有限|集团/.test(value) && /公司|有限|集团/.test(linesRaw[i - 1] || ''));

console.log(`needLookupPrev: ${needLookupPrev}\n`);

if (needLookupPrev && i > 0) {
  const prevLineRaw = linesRaw[i - 1];
  const prevLine = prevLineRaw.trim();

  console.log(`上一行: "${prevLine}"\n`);

  // 检查详细条件
  const hasOtherLabel = labels.some(l => prevLine.includes(l));
  const endsWithEntity = /公司|有限|集团|工程|项目|线路|站|小区|改造/.test(prevLine);

  console.log(`检查条件:`);
  console.log(`  prevLine非空: ${!!prevLine}`);
  console.log(`  !hasOtherLabel: ${!hasOtherLabel}`);
  console.log(`    (labels: ${labels.map(l => `"${prevLine.includes(l) ? '✓' : '✗'}${l}"`).join(', ')})`);
  console.log(`  endsWithEntity: ${endsWithEntity}`);

  if (prevLine && !hasOtherLabel && endsWithEntity) {
    console.log(`\n✅ 应该拼接上一行`);
    value = prevLine + (value ? ' ' + value : '');
    console.log(`拼接后的值: "${value}"`);
  } else {
    console.log(`\n❌ 不满足拼接条件`);
  }
}
