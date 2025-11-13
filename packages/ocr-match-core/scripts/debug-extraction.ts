/**
 * Debug script to trace extraction logic on failing cases
 */
import fs from 'node:fs';
import path from 'node:path';
import { extract } from '../src/extract/extractor.js';
import { loadConfig } from '../src/config/loader.js';

const PROJECT_ROOT = process.cwd();
const TEST_CASES = [
  'changjiangdianqi4100904488.txt',
  'jubangjituanyouxiangongsi4100961581.txt',
];

async function debugExtraction() {
  console.log('='.repeat(80));
  console.log('EXTRACTION LOGIC DEBUG');
  console.log('='.repeat(80));
  console.log('');

  // Load config
  const configPath = path.join(PROJECT_ROOT, 'configs', 'v0.labs', '10dae06c');
  console.log(`Loading config from: ${configPath}`);
  const config = await loadConfig(configPath);
  console.log(`✓ Config loaded`);
  console.log(`  - Supplier labels: ${config.label_alias.supplier.join(', ')}`);
  console.log(`  - Project labels: ${config.label_alias.project.join(', ')}`);
  console.log(`  - Noise words: ${config.domain.noise_words.length} words`);
  console.log('');

  for (const testCase of TEST_CASES) {
    console.log('='.repeat(80));
    console.log(`TEST CASE: ${testCase}`);
    console.log('='.repeat(80));
    console.log('');

    // Read OCR text
    const ocrPath = path.join(PROJECT_ROOT, 'data', 'ocr_txt', testCase);
    if (!fs.existsSync(ocrPath)) {
      console.log(`✗ File not found: ${ocrPath}`);
      console.log('');
      continue;
    }

    const ocrText = fs.readFileSync(ocrPath, 'utf-8');
    console.log('OCR TEXT:');
    console.log('-'.repeat(80));
    const lines = ocrText.split('\n');
    lines.forEach((line, i) => {
      const indent = line.length - line.trimStart().length;
      console.log(`[${i.toString().padStart(2, '0')}] (indent:${indent.toString().padStart(3)}) ${line}`);
    });
    console.log('-'.repeat(80));
    console.log('');

    // Extract fields
    console.log('EXTRACTION RESULT:');
    console.log('-'.repeat(80));
    const result = extract(ocrText, {
      label_alias: config.label_alias,
      domain: config.domain,
      normalize: config.normalize,
    });

    console.log(`q_supplier: "${result.q_supplier}"`);
    console.log(`q_project:  "${result.q_project}"`);
    console.log(`warns: ${result.warns.join(', ') || 'none'}`);
    console.log('-'.repeat(80));
    console.log('');

    // Analyze each line for label matches
    console.log('LABEL MATCHING ANALYSIS:');
    console.log('-'.repeat(80));

    const supplierLabels = config.label_alias.supplier;
    const projectLabels = config.label_alias.project;

    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Check supplier labels
      const supplierMatches = supplierLabels.filter(label => trimmed.includes(label));
      if (supplierMatches.length > 0) {
        console.log(`[${i.toString().padStart(2, '0')}] SUPPLIER LABEL: ${supplierMatches.join(', ')}`);
        supplierMatches.forEach(label => {
          const labelIndex = trimmed.indexOf(label);
          const afterLabel = trimmed.substring(labelIndex + label.length);
          console.log(`     → After "${label}": "${afterLabel.substring(0, 50)}${afterLabel.length > 50 ? '...' : ''}"`);
        });
      }

      // Check project labels
      const projectMatches = projectLabels.filter(label => trimmed.includes(label));
      if (projectMatches.length > 0) {
        console.log(`[${i.toString().padStart(2, '0')}] PROJECT LABEL: ${projectMatches.join(', ')}`);
        projectMatches.forEach(label => {
          const labelIndex = trimmed.indexOf(label);
          const afterLabel = trimmed.substring(labelIndex + label.length);
          console.log(`     → After "${label}": "${afterLabel.substring(0, 50)}${afterLabel.length > 50 ? '...' : ''}"`);
        });
      }
    });
    console.log('-'.repeat(80));
    console.log('');
    console.log('');
  }

  console.log('='.repeat(80));
  console.log('DEBUG COMPLETE');
  console.log('='.repeat(80));
}

// Run debug
debugExtraction().catch(console.error);
