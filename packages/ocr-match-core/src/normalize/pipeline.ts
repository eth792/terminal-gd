/**
 * 归一化管线
 * 按顺序执行：replacements → maps → strip
 */
import type { NormalizeConfig } from '../config/schema.js';

/**
 * 归一化文本
 * @param text - 原始文本
 * @param config - 归一化配置
 * @returns 归一化后的文本
 */
export function normalize(text: string, config: NormalizeConfig): string {
  let result = text;

  // 步骤1：正则替换
  for (const rule of config.replacements) {
    const flags = rule.flags || 'g';
    const regex = new RegExp(rule.pattern, flags);
    result = result.replace(regex, rule.replace);
  }

  // 步骤2：字符映射（如果配置了maps）
  if (config.maps && Object.keys(config.maps).length > 0) {
    for (const [from, to] of Object.entries(config.maps)) {
      // maps是多字符到单字符的映射，如 "○〇O" -> "0"
      const chars = from.split('');
      for (const char of chars) {
        result = result.replace(new RegExp(escapeRegex(char), 'g'), to);
      }
    }
  }

  // 步骤3：删除字符（如果配置了strip）
  if (config.strip && config.strip.length > 0) {
    for (const pattern of config.strip) {
      // strip可以是正则或普通字符串
      try {
        const regex = new RegExp(pattern, 'g');
        result = result.replace(regex, '');
      } catch {
        // 如果不是合法正则，当作普通字符串处理
        result = result.replace(new RegExp(escapeRegex(pattern), 'g'), '');
      }
    }
  }

  return result;
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
