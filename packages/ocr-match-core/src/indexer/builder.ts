import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { normalize } from '../normalize/pipeline.js';
import type { NormalizeConfig, LabelAliasConfig } from '../config/schema.js';
import type { DbRow, InvertedIndex } from './types.js';
import { logger } from '../util/log.js';
import { resolveIndexedColumns } from './columnResolver.js';

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
    /** 字段1列名（供应商，已废弃，使用 labelAliasConfig 替代） */
    field1Column?: string;
    /** 字段2列名（工程名称，已废弃，使用 labelAliasConfig 替代） */
    field2Column?: string;
    /** Label alias配置（包含DB列名映射） */
    labelAliasConfig?: LabelAliasConfig;
  } = {}
): Promise<InvertedIndex> {
  const {
    ngramSize = 2,
    field1Column = 's_field1',
    field2Column = 's_field2',
    labelAliasConfig,
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
  let resolvedIndices: { supplierIdx: number; projectIdx: number; orderIdx: number | null } | null = null;
  let globalRowId = 0;

  for (const dbFile of dbFiles) {
    logger.info('indexer.parse', `Parsing ${path.basename(dbFile)}...`);

    const { columns, rows: rawRows } = await parseDbFile(dbFile);

    // 记录列信息（用于 meta，不再验证列名一致性）
    if (firstFileColumns === null) {
      firstFileColumns = columns;
    }

    // 记录文件列数（调试用）
    logger.info(
      'indexer.parse',
      `File "${path.basename(dbFile)}" has ${columns.length} columns`
    );

    // 查找列索引（每个文件独立解析）
    if (resolvedIndices === null) {
      // Priority chain: labelAliasConfig > legacy params > defaults
      const dbColumnNames = labelAliasConfig?._dbColumnNames ?? {
        supplier: [field1Column],
        project: [field2Column],
      };

      resolvedIndices = resolveIndexedColumns(columns, dbColumnNames);

      // 验证必需字段能够解析
      if (resolvedIndices.supplierIdx === -1) {
        throw new Error(
          `Cannot resolve 'supplier' field in ${path.basename(dbFile)}\n` +
          `  Tried aliases: ${dbColumnNames.supplier?.join(', ') || field1Column}\n` +
          `  Available columns (first 10): ${columns.slice(0, 10).join(', ')}...\n` +
          `  Total columns: ${columns.length}`
        );
      }

      if (resolvedIndices.projectIdx === -1) {
        throw new Error(
          `Cannot resolve 'project' field in ${path.basename(dbFile)}\n` +
          `  Tried aliases: ${dbColumnNames.project?.join(', ') || field2Column}\n` +
          `  Available columns (first 10): ${columns.slice(0, 10).join(', ')}...\n` +
          `  Total columns: ${columns.length}`
        );
      }

      // order 字段是可选的，不报错
      logger.info(
        'indexer.resolve',
        `Resolved columns: supplier=${resolvedIndices.supplierIdx}, project=${resolvedIndices.projectIdx}, order=${resolvedIndices.orderIdx ?? 'N/A'}`
      );
    }

    const { supplierIdx, projectIdx } = resolvedIndices;

    // 转换为 DbRow 格式
    let skippedCount = 0;
    for (let i = 0; i < rawRows.length; i++) {
      const values = rawRows[i];
      if (values.length < Math.max(supplierIdx, projectIdx) + 1) {
        logger.warn('indexer.parse', `Skipping malformed line ${i + 2} in ${path.basename(dbFile)}`);
        skippedCount++;
        continue;
      }

      globalRowId++;
      allRows.push({
        id: `${globalRowId}`,
        f1: values[supplierIdx] || '',
        f2: values[projectIdx] || '',
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

  // 查找第一个非隐藏的 sheet
  let wsname: string = wb.SheetNames[0]; // 默认第一个
  let sheetIndex = 0;

  for (let i = 0; i < wb.SheetNames.length; i++) {
    const sheetMeta = wb.Workbook?.Sheets?.[i];
    const hidden = sheetMeta?.Hidden || 0; // 0=visible, 1=hidden, 2=very hidden

    if (hidden === 0) {
      wsname = wb.SheetNames[i];
      sheetIndex = i;
      break;
    }
  }

  // 如果所有 sheet 都被隐藏，回退到第一个 sheet
  if (sheetIndex === 0 && wb.SheetNames.length > 0) {
    const firstSheetMeta = wb.Workbook?.Sheets?.[0];
    const firstHidden = firstSheetMeta?.Hidden || 0;

    if (firstHidden !== 0) {
      // 第一个 sheet 是隐藏的，说明所有 sheet 都被隐藏了
      logger.warn(
        'indexer.parse',
        `All sheets in ${path.basename(filePath)} are hidden. Using first sheet: "${wsname}"`
      );
    } else {
      // 第一个 sheet 就是可见的
      logger.info(
        'indexer.parse',
        `Using first visible sheet: "${wsname}" (index ${sheetIndex})`
      );
    }
  } else {
    logger.info(
      'indexer.parse',
      `Using first visible sheet: "${wsname}" (index ${sheetIndex})`
    );
  }

  const ws = wb.Sheets[wsname];

  // 转换为二维数组（不指定列名，读取所有原始行）
  const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  if (data.length === 0) {
    throw new Error('Empty Excel file');
  }

  // 智能检测列名行：在前5行中查找包含关键列名的行
  // 这样可以处理Excel文件有标题行、备注行等情况
  let headerRowIndex = 0;

  const keyColumns = ['供应单位名称', '单体工程名称', '计划编号', '物料名称']; // 典型列名

  for (let i = 0; i < Math.min(5, data.length); i++) {
    const row = data[i];
    const rowStr = row.map((v: any) => String(v || '').trim());

    // 检查这一行是否包含至少2个关键列名
    const matchedKeys = keyColumns.filter(key => rowStr.includes(key));

    if (matchedKeys.length >= 2) {
      headerRowIndex = i;
      logger.info(
        'indexer.parse',
        `Detected header row at line ${i + 1} in ${path.basename(filePath)} (matched ${matchedKeys.length} key columns)`
      );
      break;
    }
  }

  const columns = data[headerRowIndex].map((v: any) => String(v).trim());
  const rows = data.slice(headerRowIndex + 1).map((row: any[]) => row.map((v: any) => String(v).trim()));

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
