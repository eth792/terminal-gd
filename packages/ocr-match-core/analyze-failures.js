import fs from 'fs';
import { resolve } from 'node:path';

const repoRoot = '/Users/caron/Developer/milk/terminal-gd';

// 失败样本总结
console.log('【失败样本根因分析】\n');
console.log('供应商失败(5个)：');
console.log('  - OCR识别错误（宝→宏、折→新）：2个');
console.log('  - 文件名/内容不符或sidecar标注错误：2个');
console.log('  - 截断问题：1个\n');

console.log('工程失败(6个)：');
console.log('  - 缺少开头（向上查找失败）：3个');
console.log('  - 标签OCR错误（工程→T.程）：1个');
console.log('  - 内容太少：1个');
console.log('  - 公司名不同：1个\n');

// 检查所有19个样本的标签变体
console.log('【扫描所有样本的标签变体】\n');
const sidecarDir = resolve(repoRoot, 'configs/sidecar_json');
const samples = fs.readdirSync(sidecarDir)
  .filter(f => f.endsWith('.json'))
  .map(f => f.replace('.json', ''));

const labelVariants = new Set();

for (const sample of samples) {
  const ocrPath = resolve(repoRoot, 'data/ocr_txt', `${sample}.txt`);
  if (!fs.existsSync(ocrPath)) continue;

  const text = fs.readFileSync(ocrPath, 'utf-8');
  const lines = text.split('\n');

  for (const line of lines) {
    // 匹配工程名称的变体
    const projectMatch = line.match(/([工T丁]\S{0,2}程名称|项目名称|工程定义)/);
    if (projectMatch) {
      labelVariants.add(`project:${projectMatch[1]}`);
    }

    // 匹配供应商的变体
    const supplierMatch = line.match(/(供\S{0,2}商|厂商)/);
    if (supplierMatch) {
      labelVariants.add(`supplier:${supplierMatch[1]}`);
    }
  }
}

const projectLabels = [...labelVariants].filter(v => v.startsWith('project:'));
const supplierLabels = [...labelVariants].filter(v => v.startsWith('supplier:'));

console.log('工程名称标签变体：');
projectLabels.forEach(v => console.log(`  - ${v.replace('project:', '')}`));

console.log('\n供应商标签变体：');
supplierLabels.forEach(v => console.log(`  - ${v.replace('supplier:', '')}`));
