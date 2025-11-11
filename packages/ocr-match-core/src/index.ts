/**
 * @ocr/core - OCR 文本匹配核心库
 *
 * 提供 OCR 文本的归一化、提取、匹配、分桶等核心功能
 *
 * @version 0.1.1
 * @author ocr-match-core team
 */

export const VERSION = '0.1.1';

// 配置模块
export * from './config/schema.js';
export { loadLatestConfig, loadConfig } from './config/load.js';

// 归一化模块
export { normalize } from './normalize/pipeline.js';

// 提取模块
export { extract } from './extract/extractor.js';
export type { ExtractResult, ExtractConfig } from './extract/extractor.js';

// 工具模块
export { logger } from './util/log.js';

// 索引模块 (Task 4)
export { buildIndex, tokenize, computeDigest, buildInvertedIndex } from './indexer/builder.js';
export type { InvertedIndex, DbRow } from './indexer/types.js';

// 匹配模块 (Task 5)
export { levenshteinSimilarity, jaccardSimilarity, fieldSimilarity, hybridScore, singleFieldScore } from './match/similarity.js';
export { recallByTokens, recallByBothFields, lookupRows } from './match/recall.js';
export { scoreCandidates, rankCandidates, scoreAndRank, type ScoredCandidate } from './match/rank.js';
export { fastExactMatch, anchorMatch, recallAndRank, match, type MatchMode, type MatchResult } from './match/strategies.js';

// 将在后续 Task 中导出具体模块
// export * from './bucket';
// export * from './report';
