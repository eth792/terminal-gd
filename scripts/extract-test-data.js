#!/usr/bin/env node
/**
 * 从 configs/sidecar_json/*.json 提取供应商和工程名称字段，生成测试 CSV
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SIDECAR_DIR = path.join(__dirname, '../configs/sidecar_json');
const OUTPUT_CSV = path.join(__dirname, '../data/test_input.csv');

async function main() {
  // 读取所有 JSON 文件
  const files = fs.readdirSync(SIDECAR_DIR).filter(f => f.endsWith('.json'));

  console.log(`Found ${files.length} JSON files in sidecar_json/`);

  const rows = [];

  for (const file of files) {
    const filePath = path.join(SIDECAR_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    if (data.fields && data.fields['供应商'] && data.fields['工程名称']) {
      rows.push({
        供应商: data.fields['供应商'],
        工程名称: data.fields['工程名称'],
      });
    }
  }

  console.log(`Extracted ${rows.length} rows`);

  // 生成 CSV
  const csvLines = [];
  csvLines.push('供应商,工程名称'); // Header

  for (const row of rows) {
    // CSV 转义：如果字段包含逗号或引号，需要用双引号包裹
    const supplier = escapeCSV(row.供应商);
    const project = escapeCSV(row.工程名称);
    csvLines.push(`${supplier},${project}`);
  }

  const csvContent = csvLines.join('\n');

  // 确保 data/ 目录存在
  const dataDir = path.dirname(OUTPUT_CSV);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_CSV, csvContent, 'utf-8');

  console.log(`✅ CSV file created: ${OUTPUT_CSV}`);
  console.log(`   Rows: ${rows.length}`);
  console.log('');
  console.log('Preview (first 5 rows):');
  console.log(csvLines.slice(0, 6).join('\n'));
}

function escapeCSV(value) {
  if (!value) return '';

  // 如果包含逗号、双引号或换行符，需要用双引号包裹
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    // 双引号需要转义为两个双引号
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
