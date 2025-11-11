/**
 * 匹配主流程模块
 * 整合 extract → match → bucketize 的完整流程
 */
import { promises as fs } from 'fs';
import path from 'path';
import type { InvertedIndex } from './indexer/types.js';
import type { FullConfig } from './config/schema.js';
import { extract } from './extract/extractor.js';
import { match, type MatchMode } from './match/strategies.js';
import type { ScoredCandidate } from './match/rank.js';
import { bucketize, type BucketConfig } from './bucket/bucketize.js';
import type { FailReason, BucketType } from './bucket/reasons.js';
import { logger } from './util/log.js';

/**
 * 单个 OCR 文件的匹配结果
 */
export interface MatchOcrResult {
  // 文件信息
  file_name: string;
  source_txt?: string;  // OCR 文本文件路径（可选）
  source_image?: string; // OCR 图像文件路径（可选）

  // 提取字段
  q_supplier: string;
  q_project: string;

  // 匹配结果
  mode: MatchMode; // fast-exact | anchor | recall
  candidates: ScoredCandidate[]; // TopK 候选

  // 分桶结果
  bucket: BucketType;  // exact | review | fail
  reason: FailReason | null; // 失败/审核原因
}

/**
 * 匹配单个 OCR 文件（主流程）
 *
 * @param ocrFilePath - OCR .txt 文件路径
 * @param index - 预构建的倒排索引
 * @param config - 完整配置（normalize + label_alias + domain）
 * @param bucketConfig - 分桶配置
 * @returns 匹配结果
 */
export async function matchOcrFile(
  ocrFilePath: string,
  index: InvertedIndex,
  config: FullConfig,
  bucketConfig: BucketConfig
): Promise<MatchOcrResult> {
  const fileName = path.basename(ocrFilePath);

  // 1. 读取 OCR .txt 文件
  const ocrText = await fs.readFile(ocrFilePath, 'utf-8');

  // 2. 提取字段
  const extracted = extract(ocrText, {
    normalize: config.normalize,
    label_alias: config.label_alias,
    domain: config.domain,
  });

  logger.info('match.extract', `Extracted from ${fileName}: q1="${extracted.q_supplier}", q2="${extracted.q_project}"`);

  // 3. 匹配
  const matchResult = match(extracted.q_supplier, extracted.q_project, index, 0.6, 3);

  logger.info(
    'match.match',
    `Matched ${fileName}: mode=${matchResult.mode}, candidates=${matchResult.candidates.length}, recalled=${matchResult.recalledCount}`
  );

  // 4. 分桶
  const bucketResult = bucketize(extracted.q_supplier, extracted.q_project, matchResult.candidates, bucketConfig);

  logger.info(
    'match.bucket',
    `Bucketed ${fileName}: bucket=${bucketResult.bucket}, reason=${bucketResult.reason || 'null'}`
  );

  // 5. 组装结果
  return {
    file_name: fileName,
    source_txt: ocrFilePath,
    q_supplier: extracted.q_supplier,
    q_project: extracted.q_project,
    mode: matchResult.mode,
    candidates: matchResult.candidates,
    bucket: bucketResult.bucket,
    reason: bucketResult.reason,
  };
}

/**
 * 批量匹配多个 OCR 文件
 *
 * @param ocrFilePaths - OCR .txt 文件路径数组
 * @param index - 预构建的倒排索引
 * @param config - 完整配置
 * @param bucketConfig - 分桶配置
 * @returns 匹配结果数组
 */
export async function matchOcrBatch(
  ocrFilePaths: string[],
  index: InvertedIndex,
  config: FullConfig,
  bucketConfig: BucketConfig
): Promise<MatchOcrResult[]> {
  const results: MatchOcrResult[] = [];

  for (const filePath of ocrFilePaths) {
    try {
      const result = await matchOcrFile(filePath, index, config, bucketConfig);
      results.push(result);
    } catch (err) {
      logger.error('match.batch', `Failed to match ${filePath}: ${err}`);
      // 继续处理其他文件
    }
  }

  return results;
}
