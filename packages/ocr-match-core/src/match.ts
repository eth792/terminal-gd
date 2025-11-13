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
import { normalize } from './normalize/pipeline.js';

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

  // 后处理标记
  was_cleaned?: boolean; // 是否经过后处理清洗
}

/**
 * 后处理清洗结果
 */
interface PostProcessResult {
  supplier: string;
  project: string;
  supplierModified: boolean;
  projectModified: boolean;
  wasModified: boolean;
}

/**
 * 后处理字段清洗（修复 extract 阶段的边界切割问题）
 *
 * 主要处理两类问题：
 * 1. 供应商字段"公司"后混入其他内容（如工程名、编号）
 * 2. 工程名字段开头混入行政前缀或单字"司"
 *
 * @param rawSupplier - extract 提取的原始供应商字段
 * @param rawProject - extract 提取的原始工程名字段
 * @returns 清洗后的字段
 */
function postProcessFields(rawSupplier: string, rawProject: string): PostProcessResult {
  let supplier = rawSupplier;
  let project = rawProject;
  let supplierModified = false;
  let projectModified = false;

  // ========== 规则 1：供应商 - 在"公司"后截断（保留"公司"）==========
  // 问题：extract 向右拼接时，"公司"后混入了工程名或其他内容
  // 示例："安德利集团有限公司钟家村片老旧小区..." → "安德利集团有限公司"
  const companyEndings = [
    '股份有限公司',
    '集团股份有限公司',
    '有限责任公司',
    '有限公司',
    '电气公司',
    '科技公司',
    '集团公司',
  ];

  for (const ending of companyEndings) {
    const idx = supplier.indexOf(ending);
    if (idx !== -1) {
      const original = supplier;
      supplier = supplier.substring(0, idx + ending.length);
      if (supplier !== original) {
        supplierModified = true;
      }
      break;
    }
  }

  // ========== 规则 2：工程名称 - 移除行政前缀和单字"司"残留 ==========

  // 2.1 移除"项目管理单位"等行政前缀（OCR 中的噪声）
  // 注意: 支持全角/半角冒号混用（OCR 文本可能包含任一种）
  const adminPrefixes = [
    '项目管理单位：客户服务中心市场及大客户服务室',
    '项目管理单位:客户服务中心市场及大客户服务室',  // 半角冒号版本
    '项目管理单位：运维检修部工程名称：',
    '项目管理单位:运维检修部工程名称:',              // 半角冒号版本
    '项目管理单位：检修分公司综合室工程名称：',
    '项目管理单位:检修分公司综合室工程名称:',        // 半角冒号版本
    '项目管理单位：',
    '项目管理单位:',                                // 半角冒号版本
  ];

  for (const prefix of adminPrefixes) {
    if (project.startsWith(prefix)) {
      project = project.substring(prefix.length).trim();
      projectModified = true;
      break;
    }
  }

  // 2.2 移除单字"司"前缀（公司名截断残留）
  // 示例："司武汉长江中心B2地块..." → "武汉长江中心B2地块..."
  if (project.startsWith('司')) {
    project = project.substring(1).trim();
    projectModified = true;
  }

  return {
    supplier: supplier.trim(),
    project: project.trim(),
    supplierModified,
    projectModified,
    wasModified: supplierModified || projectModified,
  };
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

  // 2.5 后处理清洗（修复边界切割问题）
  const cleaned = postProcessFields(extracted.q_supplier, extracted.q_project);

  if (cleaned.wasModified) {
    logger.info(
      'match.postprocess',
      `Cleaned ${fileName}: supplier=${cleaned.supplierModified ? 'YES' : 'NO'}, project=${cleaned.projectModified ? 'YES' : 'NO'}`
    );
    if (cleaned.supplierModified) {
      logger.debug('match.postprocess', `  Supplier: "${extracted.q_supplier}" → "${cleaned.supplier}"`);
    }
    if (cleaned.projectModified) {
      logger.debug('match.postprocess', `  Project: "${extracted.q_project}" → "${cleaned.project}"`);
    }
  }

  // 3. 匹配（使用清洗后的字段，传入归一化函数）
  // 创建归一化函数闭包，捕获 config.normalize
  const normalizer = (text: string) => normalize(text, config.normalize);

  const matchResult = match(cleaned.supplier, cleaned.project, index, 0.6, 3, normalizer);

  logger.info(
    'match.match',
    `Matched ${fileName}: mode=${matchResult.mode}, candidates=${matchResult.candidates.length}, recalled=${matchResult.recalledCount}`
  );

  // 4. 分桶（使用清洗后的字段）
  const bucketResult = bucketize(cleaned.supplier, cleaned.project, matchResult.candidates, bucketConfig);

  logger.info(
    'match.bucket',
    `Bucketed ${fileName}: bucket=${bucketResult.bucket}, reason=${bucketResult.reason || 'null'}`
  );

  // 5. 组装结果
  return {
    file_name: fileName,
    source_txt: ocrFilePath,
    q_supplier: cleaned.supplier,  // 使用清洗后的字段
    q_project: cleaned.project,     // 使用清洗后的字段
    mode: matchResult.mode,
    candidates: matchResult.candidates,
    bucket: bucketResult.bucket,
    reason: bucketResult.reason,
    was_cleaned: cleaned.wasModified,  // 标记是否被清洗
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
