#!/usr/bin/env node

/**
 * Sample Test Cases Generator
 *
 * Purpose: Extract stratified random samples from baseline test run results
 * to enable fast iteration testing (38 min → 2-3 min).
 *
 * Usage: node scripts/sample-test-cases.js <run_dir>
 * Example: node scripts/sample-test-cases.js runs/run_latest
 *
 * Output: runs/tmp/sample_files.txt (one filename per line)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Configuration
// ============================================================================

const SAMPLE_CONFIG = {
  exact: 5,
  review: 5,
  fail: {
    EXTRACT_EMPTY_SUPPLIER: 5,
    FIELD_SIM_LOW_SUPPLIER: 5,
    NO_CANDIDATE: 3,
    DELTA_TOO_SMALL: 3,
    default: 3  // Other fail reasons
  }
};

const OUTPUT_FILE = path.join('runs', 'tmp', 'sample_files.txt');

// ============================================================================
// CSV Parsing
// ============================================================================

/**
 * Parse results.csv from baseline run directory
 * @param {string} filePath - Path to results.csv
 * @returns {Array<Object>} Parsed records with { filename, bucket, reason, ... }
 */
function parseResultsCSV(filePath) {
  // Read file content
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim().length > 0);

  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Parse header
  const header = lines[0].split(',').map(col => col.trim());

  // Validate required columns (handle both filename and file_name)
  const filenameCol = header.includes('filename') ? 'filename' :
                       header.includes('file_name') ? 'file_name' : null;

  if (!filenameCol) {
    throw new Error(
      `Invalid CSV format: missing filename column (expected 'filename' or 'file_name')\n` +
      `Found columns: ${header.join(', ')}`
    );
  }

  const requiredColumns = ['bucket', 'reason'];
  const missingColumns = requiredColumns.filter(col => !header.includes(col));

  if (missingColumns.length > 0) {
    throw new Error(
      `Invalid CSV format: missing required columns (${missingColumns.join(', ')})\n` +
      `Found columns: ${header.join(', ')}`
    );
  }

  // Parse data rows
  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(val => val.trim());

    if (values.length !== header.length) {
      console.warn(`Warning: Line ${i + 1} has ${values.length} columns, expected ${header.length}. Skipping.`);
      continue;
    }

    const record = {};
    header.forEach((col, idx) => {
      record[col] = values[idx];
    });

    // Normalize filename column to 'filename' for consistent access
    if (filenameCol === 'file_name' && !record.filename) {
      record.filename = record.file_name;
    }

    results.push(record);
  }

  return results;
}

// ============================================================================
// Grouping and Sampling
// ============================================================================

/**
 * Group results by bucket and reason
 * @param {Array<Object>} results - Parsed CSV records
 * @returns {Object} Grouped results { 'exact': [...], 'review': [...], 'fail|NO_CANDIDATE': [...], ... }
 */
function groupByBucketAndReason(results) {
  const groups = {};

  results.forEach(record => {
    const bucket = record.bucket;
    const reason = record.reason || '';

    let groupKey;
    if (bucket === 'fail' && reason) {
      groupKey = `fail|${reason}`;
    } else {
      groupKey = bucket;
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(record);
  });

  return groups;
}

/**
 * Sample items from a group using Fisher-Yates shuffle
 * @param {Array<Object>} items - Items to sample from
 * @param {number} count - Number of items to sample
 * @returns {Array<Object>} Sampled items
 */
function sampleFromGroup(items, count) {
  // If group has fewer items than requested, use all
  if (items.length <= count) {
    if (items.length < count) {
      console.warn(`  Warning: Only ${items.length} items available, using all`);
    }
    return items;
  }

  // Fisher-Yates shuffle (partial shuffle for first `count` items)
  const shuffled = [...items];
  for (let i = 0; i < count; i++) {
    const randomIndex = i + Math.floor(Math.random() * (shuffled.length - i));
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

// ============================================================================
// File List Generation
// ============================================================================

/**
 * Write sampled filenames to output file
 * @param {Array<Object>} samples - Sampled records
 * @param {string} outputPath - Output file path
 */
function writeFileList(samples, outputPath) {
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Extract filenames
  const filenames = samples.map(record => record.filename);

  // Write to file (one filename per line, Unix line endings)
  const content = filenames.join('\n') + '\n';
  fs.writeFileSync(outputPath, content, 'utf-8');
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Main CLI entry point
 */
function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Error: Missing baseline run directory argument');
    console.error('');
    console.error('Usage: node scripts/sample-test-cases.js <run_dir>');
    console.error('Example: node scripts/sample-test-cases.js runs/run_latest');
    console.error('');
    console.error('Tip: Create a symlink for easy baseline management:');
    console.error('  ln -s run_20251117_1044 runs/run_latest');
    process.exit(1);
  }

  const runDir = args[0];

  // Validate baseline run directory exists
  if (!fs.existsSync(runDir)) {
    console.error(`Error: Baseline run directory does not exist: ${runDir}`);
    console.error('');
    console.error('Please create a symlink to your latest baseline run:');
    console.error('  ln -s run_YYYYmmdd_HHMMSS runs/run_latest');
    process.exit(1);
  }

  // Validate results.csv exists
  const resultsCSVPath = path.join(runDir, 'results.csv');
  if (!fs.existsSync(resultsCSVPath)) {
    console.error(`Error: results.csv not found in ${runDir}`);
    console.error('');
    console.error('Please ensure the baseline run directory contains a valid results.csv file.');
    process.exit(1);
  }

  console.log(`\n📊 Sample Test Cases Generator`);
  console.log(`   Baseline: ${runDir}`);
  console.log('');

  // Parse CSV
  let results;
  try {
    results = parseResultsCSV(resultsCSVPath);
    console.log(`✓ Loaded ${results.length} results from baseline`);
  } catch (error) {
    console.error(`Error parsing results.csv: ${error.message}`);
    process.exit(1);
  }

  // Group by bucket and reason
  const groups = groupByBucketAndReason(results);
  console.log(`✓ Grouped into ${Object.keys(groups).length} categories`);
  console.log('');

  // Sample from each group
  const allSamples = [];
  const stats = {};

  // Sample exact
  if (groups['exact']) {
    const samples = sampleFromGroup(groups['exact'], SAMPLE_CONFIG.exact);
    allSamples.push(...samples);
    stats['exact'] = { total: groups['exact'].length, sampled: samples.length };
    console.log(`  exact: ${groups['exact'].length} → ${samples.length} sampled`);
  }

  // Sample review
  if (groups['review']) {
    const samples = sampleFromGroup(groups['review'], SAMPLE_CONFIG.review);
    allSamples.push(...samples);
    stats['review'] = { total: groups['review'].length, sampled: samples.length };
    console.log(`  review: ${groups['review'].length} → ${samples.length} sampled`);
  }

  // Sample fail reasons
  const failGroups = Object.keys(groups).filter(key => key.startsWith('fail|'));
  failGroups.forEach(groupKey => {
    const reason = groupKey.split('|')[1];
    const sampleCount = SAMPLE_CONFIG.fail[reason] || SAMPLE_CONFIG.fail.default;

    const samples = sampleFromGroup(groups[groupKey], sampleCount);
    allSamples.push(...samples);
    stats[groupKey] = { total: groups[groupKey].length, sampled: samples.length };
    console.log(`  ${groupKey}: ${groups[groupKey].length} → ${samples.length} sampled`);
  });

  console.log('');
  console.log(`✓ Total samples: ${allSamples.length}`);

  // Write file list
  writeFileList(allSamples, OUTPUT_FILE);
  console.log(`✓ File list written to: ${OUTPUT_FILE}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Run: pnpm -F ./packages/ocr-match-core build');
  console.log('  2. Run: pnpm test:sample');
  console.log('');
}

// Run main if executed directly (ESM equivalent)
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// Export functions for testing
export {
  parseResultsCSV,
  groupByBucketAndReason,
  sampleFromGroup,
  writeFileList,
  SAMPLE_CONFIG
};
