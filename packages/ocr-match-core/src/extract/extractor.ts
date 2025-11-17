/**
 * OCR 文本字段提取器
 * 从 OCR 识别的文本中提取供应商和工程名称
 */
import type { LabelAliasConfig, DomainConfig } from '../config/schema.js';
import { normalize } from '../normalize/pipeline.js';
import type { NormalizeConfig } from '../config/schema.js';

export interface ExtractResult {
  q_supplier: string;
  q_project: string;
  warns: string[];
}

export interface ExtractConfig {
  label_alias: LabelAliasConfig;
  domain: DomainConfig;
  normalize: NormalizeConfig;
}

/**
 * 从 OCR 文本中提取字段
 * @param text - OCR 识别的原始文本
 * @param config - 提取配置
 * @returns 提取结果
 */
export function extract(text: string, config: ExtractConfig): ExtractResult {
  const warns: string[] = [];
  const linesRaw = text.split('\n'); // 保留原始行（含缩进）
  const lines = linesRaw.map((l) => l.trim()); // 修剪后的行（用于查找标签）

  // 合并所有字段标签（用于跨字段排除检查）
  const allFieldLabels = [...config.label_alias.supplier, ...config.label_alias.project];
  const documentFieldLabels = config.domain.document_field_labels || [];
  const tableHeaderKeywords = config.domain.table_header_keywords || [];

  // 提取供应商
  const supplier = extractField(
    lines,
    linesRaw,
    config.label_alias.supplier,
    allFieldLabels,
    documentFieldLabels,
    tableHeaderKeywords,
    config.domain.noise_words
  );
  if (!supplier) {
    warns.push('EXTRACT_EMPTY_SUPPLIER');
  }

  // 提取工程名称
  let project = extractField(
    lines,
    linesRaw,
    config.label_alias.project,
    allFieldLabels,
    documentFieldLabels,
    tableHeaderKeywords,
    config.domain.noise_words
  );
  if (!project) {
    warns.push('EXTRACT_EMPTY_PROJECT');
  }

  // 对工程名称进行锚点修剪
  if (project && config.domain.anchors?.project) {
    project = trimByAnchors(project, config.domain.anchors.project);
  }

  // 归一化
  const q_supplier = normalize(supplier || '', config.normalize);
  const q_project = normalize(project || '', config.normalize);

  return {
    q_supplier,
    q_project,
    warns,
  };
}

/**
 * 检查是否应该停止查找（三重检查机制）
 * @param line - 当前检查的行
 * @param currentFieldLabels - 当前字段的标签列表
 * @param allFieldLabels - 所有字段的标签列表（supplier + project）
 * @param documentFieldLabels - 文档噪点字段标签列表
 * @returns true 表示应该停止查找
 */
function shouldStopLookup(
  line: string,
  currentFieldLabels: string[],
  allFieldLabels: string[],
  documentFieldLabels: string[]
): boolean {
  // 检查1: 是否包含其他字段标签
  const hasOtherFieldLabel = allFieldLabels
    .filter((l) => !currentFieldLabels.includes(l))
    .some((l) => line.includes(l));

  // 检查2: 是否包含噪点字段标签
  const hasDocumentFieldLabel = documentFieldLabels.some((l) => line.includes(l));

  // 检查3: 是否以实体词结尾（防止拼接其他公司名称）
  const endsWithEntity = /公司|有限|集团$/.test(line.trim());

  return hasOtherFieldLabel || hasDocumentFieldLabel || endsWithEntity;
}

/**
 * 检查是否为表格表头（2+ 关键词匹配）
 * @param line - 当前检查的行
 * @param keywords - 表格表头关键词列表
 * @returns true 表示是表格表头
 */
function isTableHeader(line: string, keywords: string[]): boolean {
  if (keywords.length === 0) return false;

  const matchCount = keywords.filter((keyword) => line.includes(keyword)).length;
  return matchCount >= 2;
}

/**
 * 提取单个字段
 * @param lines - 修剪后的文本行数组（用于查找标签）
 * @param linesRaw - 原始文本行数组（含缩进，用于检测续行）
 * @param labels - 当前字段标签列表
 * @param allFieldLabels - 所有字段标签列表
 * @param documentFieldLabels - 文档噪点字段标签列表
 * @param tableHeaderKeywords - 表格表头关键词列表
 * @param noiseWords - 噪声词列表
 * @returns 提取的字段值
 */
function extractField(
  lines: string[],
  linesRaw: string[],
  labels: string[],
  allFieldLabels: string[],
  documentFieldLabels: string[],
  tableHeaderKeywords: string[],
  noiseWords: string[]
): string {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 查找标签
    for (const label of labels) {
      const labelIndex = line.indexOf(label);
      if (labelIndex === -1) continue;

      // 找到标签，提取后续内容
      let value = line.substring(labelIndex + label.length).trim();

      // 移除标签后的冒号、等号等分隔符
      value = value.replace(/^[:：=\s]+/, '');

      // 智能向上查找策略（检测表格错位）：
      // 策略1：上一行有深度缩进（>= 60 个空格），是表格右列的明显特征
      // 策略2：标签后值太短（< 5 字符）
      // 策略3：标签后值不包含实体词，但上一行包含（扩展的实体词列表）
      const prevIndent = i > 0 ? linesRaw[i - 1].length - linesRaw[i - 1].trimStart().length : 0;
      const needLookupPrev =
        (prevIndent >= 60) || // 策略1：深度缩进
        (value.length < 5) || // 策略2：值太短
        (i > 0 && !/公司|有限|集团/.test(value) && /公司|有限|集团|工程|项目|线路|站|小区|改造/.test(linesRaw[i - 1])); // 策略3

      if (needLookupPrev && i > 0) {
        let prevLineRaw = linesRaw[i - 1];
        let prevLine = prevLineRaw.trim();
        let lookupIndex = i - 1;

        // 特殊情况：如果标签后值完全为空，且上一行包含标签，跳过上一行继续向上查找
        if (value.length === 0 && labels.some(l => prevLine.includes(l)) && i > 1) {
          lookupIndex = i - 2;
          prevLineRaw = linesRaw[lookupIndex];
          prevLine = prevLineRaw.trim();
        }

        // 向上查找条件（使用辅助函数进行三重检查）
        const prevLineIndent = prevLineRaw.length - prevLineRaw.trimStart().length;
        const hasEntity = /公司|有限|集团|工程|项目|线路|站|小区|改造/.test(prevLine);
        const isDeepIndentValue = prevLineIndent >= 60 && !/^[:：、，。；]/.test(prevLine);

        // 使用 shouldStopLookup 检查是否应该停止（替代原来的 hasOtherLabel）
        const shouldStop = shouldStopLookup(prevLine, labels, allFieldLabels, documentFieldLabels);

        if (prevLine && !shouldStop && (hasEntity || isDeepIndentValue)) {
          // 拼接找到的行 + 当前行的值
          value = prevLine + (value ? ' ' + value : '');
        }
      }

      // 然后检查是否需要拼接下一行（续行）
      if (i + 1 < lines.length) {
        const nextLineRaw = linesRaw[i + 1];
        const nextLine = nextLineRaw.trim();

        // 检查是否为表格表头（使用辅助函数）
        if (isTableHeader(nextLine, tableHeaderKeywords)) {
          // 遇到表格表头，立即停止向下查找
          return value;
        }

        // 计算下一行的缩进（前导空格数）
        const indent = nextLineRaw.length - nextLineRaw.trimStart().length;
        const MIN_INDENT = 20;

        // 检查续行条件（使用辅助函数）
        const isDeepIndent = indent >= MIN_INDENT;
        const startsWithNoise = noiseWords.some((noise) => nextLine.startsWith(noise));
        const shouldStop = shouldStopLookup(nextLine, labels, allFieldLabels, documentFieldLabels);

        // 只拼接满足条件的续行
        if (nextLine && isDeepIndent && !shouldStop && !startsWithNoise) {
          value = value ? value + ' ' + nextLine : nextLine;
        }
      }

      // 截断噪声词
      value = truncateByNoiseWords(value, noiseWords);

      if (value) {
        return value;
      }
    }
  }

  return '';
}

/**
 * 根据噪声词截断文本
 * @param text - 原始文本
 * @param noiseWords - 噪声词列表
 * @returns 截断后的文本
 */
function truncateByNoiseWords(text: string, noiseWords: string[]): string {
  let result = text;

  for (const noise of noiseWords) {
    const index = result.indexOf(noise);
    if (index !== -1) {
      result = result.substring(0, index).trim();
    }
  }

  return result;
}

/**
 * 根据锚点修剪文本（主要用于工程名称）
 * 保留最后一个锚点及其之前的内容
 * @param text - 原始文本
 * @param anchors - 锚点列表（如 ["工程", "项目", "线路"]）
 * @returns 修剪后的文本
 */
function trimByAnchors(text: string, anchors: string[]): string {
  let lastAnchorIndex = -1;
  let lastAnchorLength = 0;

  // 找到最后一个锚点的位置
  for (const anchor of anchors) {
    const index = text.lastIndexOf(anchor);
    if (index > lastAnchorIndex) {
      lastAnchorIndex = index;
      lastAnchorLength = anchor.length;
    }
  }

  // 如果找到锚点，保留锚点及其之前的内容
  if (lastAnchorIndex !== -1) {
    return text.substring(0, lastAnchorIndex + lastAnchorLength).trim();
  }

  return text;
}
