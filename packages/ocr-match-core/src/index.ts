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

// 将在后续 Task 中导出具体模块
// export * from './match';
// export * from './bucket';
// export * from './report';
