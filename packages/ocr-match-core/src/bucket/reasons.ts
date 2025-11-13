/**
 * 失败原因枚举
 * 用于记录为什么某个 OCR 文本最终落入 fail 或 review 桶
 */
export enum FailReason {
  // 提取阶段失败
  EXTRACT_EMPTY_SUPPLIER = 'EXTRACT_EMPTY_SUPPLIER', // 未提取到供应商字段
  EXTRACT_EMPTY_PROJECT = 'EXTRACT_EMPTY_PROJECT',   // 未提取到工程名称字段
  EXTRACT_BOTH_EMPTY = 'EXTRACT_BOTH_EMPTY',         // 两个字段都未提取到

  // 匹配阶段失败
  NO_CANDIDATES = 'NO_CANDIDATES',                   // 召回候选数为 0
  FIELD_SIM_LOW_SUPPLIER = 'FIELD_SIM_LOW_SUPPLIER', // 供应商字段相似度过低
  FIELD_SIM_LOW_PROJECT = 'FIELD_SIM_LOW_PROJECT',   // 工程名称字段相似度过低

  // 分桶阶段（需要人工审核）
  DELTA_TOO_SMALL = 'DELTA_TOO_SMALL',               // Top1-Top2 差值过小
  SCORE_BELOW_AUTO_PASS = 'SCORE_BELOW_AUTO_PASS',   // 分数低于自动通过阈值
  SUPPLIER_DIFF_SAME_PROJECT = 'SUPPLIER_DIFF_SAME_PROJECT', // 供应商不同但项目高度匹配
}

/**
 * 分桶类型
 */
export type BucketType = 'exact' | 'review' | 'fail';

/**
 * 分桶结果
 */
export interface BucketResult {
  bucket: BucketType;
  reason: FailReason | null; // exact 时为 null
}
