/**
 * DB 文件行读取工具
 * 根据 source_file + row_index 读取原始行数据
 */
import XLSX from 'xlsx';
import Papa from 'papaparse';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * 缓存：避免重复读取同一个文件
 */
const fileCache = new Map<string, { columns: string[]; rows: string[][] }>();

/**
 * 读取 DB 文件的指定行
 * @param dbFilePath - DB 文件路径
 * @param rowIndex - 行号（从 1 开始，1 = 第一行数据，不包含 header）
 * @returns 原始行数据（键值对）
 */
export async function readDbRow(
  dbFilePath: string,
  rowIndex: number
): Promise<Record<string, string>> {
  // 1. 检查缓存
  if (!fileCache.has(dbFilePath)) {
    // 2. 读取文件
    const ext = path.extname(dbFilePath).toLowerCase();
    let columns: string[];
    let rows: string[][];

    if (ext === '.csv') {
      const csvContent = await fs.readFile(dbFilePath, 'utf-8');
      const parsed = Papa.parse(csvContent, {
        header: false,
        skipEmptyLines: true,
      });
      const allRows = parsed.data as string[][];
      columns = allRows[0];
      rows = allRows.slice(1);
    } else if (ext === '.xlsx' || ext === '.xls') {
      const workbook = XLSX.readFile(dbFilePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const allRows = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
      }) as string[][];
      columns = allRows[0];
      rows = allRows.slice(1);
    } else {
      throw new Error(`Unsupported DB file format: ${ext}`);
    }

    // 3. 缓存
    fileCache.set(dbFilePath, { columns, rows });
  }

  // 4. 读取指定行（rowIndex 从 1 开始，rows 数组从 0 开始）
  const { columns, rows } = fileCache.get(dbFilePath)!;
  const targetRow = rows[rowIndex - 1]; // rowIndex=1 → rows[0]（第一行数据）

  if (!targetRow) {
    throw new Error(`Row ${rowIndex} not found in ${dbFilePath}`);
  }

  // 5. 转换为键值对
  const result: Record<string, string> = {};
  for (let i = 0; i < columns.length; i++) {
    result[columns[i]] = targetRow[i]?.toString() || '';
  }

  return result;
}

/**
 * 清空缓存（可选，用于内存管理）
 */
export function clearDbCache(): void {
  fileCache.clear();
}
