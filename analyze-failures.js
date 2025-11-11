import fs from 'fs';
import { resolve } from 'node:path';

const repoRoot = '/Users/caron/Developer/milk/terminal-gd';

// 从测试结果中识别出的失败样本
const failures = [
  // 供应商失败
  { sample: 'baoshengkejichuangxingufenyouxiangongsi4100912930', field: 'supplier', reason: '文件不符或OCR错误' },
  { sample: 'baoshengkejichuangxingufenyouxiangongsi4100931553', field: 'supplier', reason: '文件不符或OCR错误' },
  { sample: 'baoshengkejichuangxingufenyouxiangongsi4100962417', field: 'supplier', reason: 'OCR错误：折→新' },
  { sample: 'baoshengkejichuangxingufenyouxiangongsi4100965595', field: 'supplier', reason: 'OCR错误：宝→宏' },
  { sample: 'beijingheruisaierdianlikejigufen4100904491', field: 'supplier', reason: '截断' },
  // 工程失败
  { sample: 'andelijituanyouxiangongsi4100968541', field: 'project', reason: '缺少开头' },
  { sample: 'baodingshiwuxingdianqiyouxiangongsi4100968568', field: 'project', reason: '缺少开头' },
  { sample: 'baoshengkejichuangxingufenyouxiangongsi4100912930', field: 'project', reason: '内容太少' },
  { sample: 'baoshengkejichuangxingufenyouxiangongsi4100965595', field: 'project', reason: '标签识别错误' },
  { sample: 'baoshengkejichuangxingufenyouxiangongsi4100965901', field: 'project', reason: '缺少开头' },
  { sample: 'beijingheruisaierdianlikejigufen4100880820', field: 'project', reason: '公司名不同' },
];

console.log('【失败样本根因分析】\n');

// 按原因分组统计
const byReason = {};
for (const f of failures) {
  const key = f.reason;
  if (!byReason[key]) byReason[key] = [];
  byReason[key].push(f);
}

console.log('按原因分类：\n');
for (const [reason, cases] of Object.entries(byReason)) {
  console.log(`${reason}: ${cases.length}个`);
  for (const c of cases) {
    console.log(`  - ${c.sample.substring(0, 40)}... (${c.field})`);
  }
  console.log('');
}

// 检查标签变体
console.log('\n【标签变体检测】\n');
const labelVariants = {
  '供应商': [],
  '工程名称': []
};

for (const sample of ['baoshengkejichuangxingufenyouxiangongsi4100965595', 'andelijituanyouxiangongsi4100968541']) {
  const ocrPath = resolve(repoRoot, 'data/ocr_txt', `${sample}.txt`);
  if (fs.existsSync(ocrPath)) {
    const text = fs.readFileSync(ocrPath, 'utf-8');
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (/[工T]\S{0,2}程名称/.test(line)) {
        const match = line.match(/([工T]\S{0,2}程名称)/);
        if (match && !labelVariants['工程名称'].includes(match[1])) {
          labelVariants['工程名称'].push(match[1]);
        }
      }
      if (/供\S{0,2}商/.test(line)) {
        const match = line.match(/(供\S{0,2}商)/);
        if (match && !labelVariants['供应商'].includes(match[1])) {
          labelVariants['供应商'].push(match[1]);
        }
      }
    }
  }
}

console.log('发现的标签变体：');
for (const [label, variants] of Object.entries(labelVariants)) {
  if (variants.length > 0) {
    console.log(`  ${label}: ${variants.join(', ')}`);
  }
}
