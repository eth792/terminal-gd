#!/usr/bin/env node
import { loadLatestConfig, extract } from './dist/index.js';
import fs from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '../..');

const config = loadLatestConfig(repoRoot);

const ocrPath = resolve(repoRoot, 'data/ocr_txt/baoshengkejichuangxingufenyouxiangongsi4100931561.txt');
const ocrText = fs.readFileSync(ocrPath, 'utf-8');

console.log('完整提取测试\n');
const result = extract(ocrText, config);
console.log(`提取的工程名称: "${result.q_project}"`);
console.log(`长度: ${result.q_project.length}`);
console.log(`是否包含"保恒筑铭": ${result.q_project.includes('保恒筑铭')}`);
console.log(`警告: ${result.warns.join(', ')}`);
