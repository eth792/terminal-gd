import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { normalize } from '../normalize/pipeline.js';
import type { NormalizeConfig } from '../config/schema.js';
import type { DbRow, InvertedIndex } from './types.js';
import { logger } from '../util/log.js';

/**
 * n-gram分词
 * @param text - 归一化后的文本
 * @param n - n-gram大小（默认2）
 * @returns token数组
 */
export function tokenize(text: string, n = 2): string[] {
  if (!text || text.length === 0) return [];
  if (text.length < n) return [text];

  const tokens: string[] = [];
  for (let i = 0; i <= text.length - n; i++) {
    tokens.push(text.substring(i, i + n));
  }
  return tokens;
}

/**
 * 计算文件SHA-256摘要
 * @param filePath - 文件路径
 * @returns 十六进制摘要字符串
 */
export function computeDigest(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * 计算多文件联合摘要
 * @param filePaths - 文件路径数组（已排序）
 * @returns 联合摘要字符串
 */
export function computeMultiFileDigest(filePaths: string[]): string {
  const hashes = filePaths.map(file => computeDigest(file));
  // 联合digest = hash(hash1 | hash2 | ...)
  return crypto.createHash('sha256').update(hashes.join('|')).digest('hex');
}

/**
 * 扫描目录，找出所有DB文件（.csv/.xlsx/.xls）
 * @param dirPath - 目录路径
 * @returns 文件路径数组（已排序）
 */
export function scanDbDirectory(dirPath: string): string[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = entries
    .filter(e => e.isFile())
    .filter(e => /\.(xlsx|xls|csv)$/i.test(e.name))
    .map(e => path.join(dirPath, e.name))
    .sort(); // 排序保证digest稳定

  if (files.length === 0) {
    throw new Error(`No DB files found in directory: ${dirPath}`);
  }

  return files;
}

/**
 * 构建倒排索引
 * @param rows - DB行数据
 * @param normalizeConfig - 归一化配置
 * @param ngramSize - n-gram大小
 * @returns 倒排索引
 */
export function buildInvertedIndex(
  rows: DbRow[],
  normalizeConfig: NormalizeConfig,
  ngramSize = 2
): Record<string, string[]> {
  const inverted: Record<string, string[]> = {};

  for (const row of rows) {
    // 归一化字段
    const f1_norm = normalize(row.f1, normalizeConfig);
    const f2_norm = normalize(row.f2, normalizeConfig);

    // 分词
    const tokens1 = tokenize(f1_norm, ngramSize);
    const tokens2 = tokenize(f2_norm, ngramSize);
    const allTokens = [...new Set([...tokens1, ...tokens2])]; // 去重

    // 构建倒排索引
    for (const token of allTokens) {
      if (!inverted[token]) {
        inverted[token] = [];
      }
      inverted[token].push(row.id);
    }
  }

  return inverted;
}

/**
 * 从 DB 文件或目录构建索引（支持 CSV/Excel）
 * @param dbPathOrDir - DB 文件路径或目录（.csv/.xlsx/.xls）
 * @param normalizeConfig - 归一化配置
 * @param options - 选项
 * @returns 完整索引对象
 */
export async function buildIndex(
  dbPathOrDir: string,
  normalizeConfig: NormalizeConfig,
  options: {
    /** n-gram大小 */
    ngramSize?: number;
    /** 字段1列名（供应商） */
    field1Column?: string;
    /** 字段2列名（工程名称） */
    field2Column?: string;
  } = {}
): Promise<InvertedIndex> {
  const {
    ngramSize = 2,
    field1Column = 's_field1',
    field2Column = 's_field2',
  } = options;

  const startTime = Date.now();
  logger.info('indexer.build', `Building index from ${dbPathOrDir}...`);

  // 1. 检测是文件还是目录
  const stat = fs.statSync(dbPathOrDir);
  const dbFiles = stat.isDirectory()
    ? scanDbDirectory(dbPathOrDir)
    : [dbPathOrDir];

  logger.info('indexer.build', `Found ${dbFiles.length} DB file(s):`);
  dbFiles.forEach((file, idx) => {
    logger.info('indexer.build', `  [${idx + 1}] ${path.basename(file)}`);
  });

  // 2. 计算联合digest
  const digest = dbFiles.length === 1
    ? computeDigest(dbFiles[0])
    : computeMultiFileDigest(dbFiles);
  logger.info('indexer.digest', `DB digest: ${digest.substring(0, 16)}...`);

  // 3. 解析所有文件并合并
  const allRows: DbRow[] = [];
  let firstFileColumns: string[] | null = null;
  let globalRowId = 0;

  for (const dbFile of dbFiles) {
    logger.info('indexer.parse', `Parsing ${path.basename(dbFile)}...`);

    const { columns, rows: rawRows } = await parseDbFile(dbFile);

    // 验证列名一致性
    if (firstFileColumns === null) {
      firstFileColumns = columns;
    } else {
      if (columns.join(',') !== firstFileColumns.join(',')) {
        throw new Error(
          `Column mismatch between files!\n` +
          `  First file: ${firstFileColumns.slice(0, 5).join(', ')}...\n` +
          `  Current file (${path.basename(dbFile)}): ${columns.slice(0, 5).join(', ')}...\n` +
          `  All DB files must have identical column names.`
        );
      }
    }

    // 查找列索引（只需要检查第一次）
    const field1Idx = columns.indexOf(field1Column);
    const field2Idx = columns.indexOf(field2Column);

    if (field1Idx === -1 || field2Idx === -1) {
      const availableColumns = columns.slice(0, 10).join(', ');
      const moreColumns = columns.length > 10 ? ` (and ${columns.length - 10} more)` : '';
      throw new Error(
        `Required columns not found in ${path.basename(dbFile)}:\n` +
        `  Looking for: ${field1Column}, ${field2Column}\n` +
        `  Available columns: ${availableColumns}${moreColumns}\n` +
        `  Total columns: ${columns.length}`
      );
    }

    // 转换为 DbRow 格式
    let skippedCount = 0;
    for (let i = 0; i < rawRows.length; i++) {
      const values = rawRows[i];
      if (values.length < Math.max(field1Idx, field2Idx) + 1) {
        logger.warn('indexer.parse', `Skipping malformed line ${i + 2} in ${path.basename(dbFile)}`);
        skippedCount++;
        continue;
      }

      globalRowId++;
      allRows.push({
        id: `${globalRowId}`,
        f1: values[field1Idx] || '',
        f2: values[field2Idx] || '',
        source_file: dbFile,
        row_index: i + 1,
      });
    }

    if (skippedCount > 0) {
      logger.info('indexer.parse', `Skipped ${skippedCount} malformed rows in ${path.basename(dbFile)}`);
    }
    logger.info('indexer.parse', `Parsed ${rawRows.length - skippedCount} rows from ${path.basename(dbFile)}`);
  }

  logger.info('indexer.parse', `Total rows merged: ${allRows.length}`);

  // 4. 构建倒排索引
  const inverted = buildInvertedIndex(allRows, normalizeConfig, ngramSize);
  const uniqueTokens = Object.keys(inverted).length;

  const elapsed = Date.now() - startTime;
  logger.info(
    'indexer.build',
    `Index built: ${allRows.length} rows, ${uniqueTokens} tokens in ${elapsed}ms`
  );

  return {
    version: '1.0',
    db_path: dbPathOrDir,
    db_files: dbFiles,
    digest,
    total_rows: allRows.length,
    built_at: new Date().toISOString(),
    rows: allRows,
    inverted,
    meta: {
      unique_tokens: uniqueTokens,
      columns: firstFileColumns!,
      ngram_size: ngramSize,
    },
  };
}

/**
 * 简单CSV行解析（处理引号）
 * @param line - CSV行
 * @returns 字段数组
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result.map(v => v.trim());
}

/**
 * 解析 CSV 文件
 * @param filePath - CSV 文件路径
 * @returns { columns: 列名数组, rows: 数据行数组 }
 */
function parseCsvFile(filePath: string): { columns: string[]; rows: string[][] } {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');

  if (lines.length === 0) {
    throw new Error('Empty CSV file');
  }

  const columns = parseCSVLine(lines[0]);
  const rows: string[][] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    rows.push(values);
  }

  return { columns, rows };
}

/**
 * 解析 Excel 文件
 * @param filePath - Excel 文件路径
 * @returns { columns: 列名数组, rows: 数据行数组 }
 */
async function parseExcelFile(filePath: string): Promise<{ columns: string[]; rows: string[][] }> {
  // 动态导入 xlsx
  let XLSX: any;
  try {
    const xlsxModule = await import('xlsx');
    // ES Module 需要访问 .default（如果存在）
    XLSX = xlsxModule.default || xlsxModule;
  } catch (error) {
    throw new Error(
      `Failed to load 'xlsx' library. Please install it: pnpm add xlsx\n` +
      `Alternatively, convert your Excel file to CSV first.`
    );
  }

  const wb = XLSX.readFile(filePath);
  const wsname = wb.SheetNames[0];
  const ws = wb.Sheets[wsname];

  // 转换为二维数组
  const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  if (data.length === 0) {
    throw new Error('Empty Excel file');
  }

  const columns = data[0].map((v: any) => String(v).trim());
  const rows = data.slice(1).map((row: any[]) => row.map((v: any) => String(v).trim()));

  return { columns, rows };
}

/**
 * 解析 DB 文件（自动检测 CSV/Excel）
 * @param filePath - DB 文件路径
 * @returns { columns: 列名数组, rows: 数据行数组 }
 */
async function parseDbFile(filePath: string): Promise<{ columns: string[]; rows: string[][] }> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.csv') {
    logger.info('indexer.parse', `Parsing CSV file: ${filePath}`);
    return parseCsvFile(filePath);
  } else if (ext === '.xlsx' || ext === '.xls') {
    logger.info('indexer.parse', `Parsing Excel file: ${filePath}`);
    return await parseExcelFile(filePath);
  } else {
    throw new Error(
      `Unsupported file format: ${ext}\n` +
      `Supported formats: .csv, .xlsx, .xls`
    );
  }
}
