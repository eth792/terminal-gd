/**
 * 配置文件的 Zod schema 定义
 */
import { z } from 'zod';

// normalize.user.json schema
export const NormalizeConfigSchema = z.object({
  replacements: z.array(
    z.object({
      pattern: z.string(),
      flags: z.string().optional(),
      replace: z.string(),
    })
  ),
  maps: z.record(z.string()).optional().default({}),
  strip: z.array(z.string()).optional().default([]),
});

export type NormalizeConfig = z.infer<typeof NormalizeConfigSchema>;

// label_alias.json schema
export const LabelAliasConfigSchema = z.object({
  supplier: z.array(z.string()),
  project: z.array(z.string()),
  order: z.array(z.string()).optional(),
});

export type LabelAliasConfig = z.infer<typeof LabelAliasConfigSchema>;

// domain.json schema
export const DomainConfigSchema = z.object({
  anchors: z
    .object({
      project: z.array(z.string()).default([]),
    })
    .partial()
    .optional()
    .default({}),
  noise_words: z.array(z.string()).default([]),
  stopwords: z.array(z.string()).default([]),
});

export type DomainConfig = z.infer<typeof DomainConfigSchema>;

// configs/latest.json schema
export const LatestConfigPointerSchema = z.object({
  path: z.string(),
  version: z.string(),
  sha: z.string(),
  created_at: z.string().optional(),
});

export type LatestConfigPointer = z.infer<typeof LatestConfigPointerSchema>;

// 完整配置集合
export interface FullConfig {
  normalize: NormalizeConfig;
  domain: DomainConfig;
  label_alias: LabelAliasConfig;
  version: string;
  sha: string;
  root: string; // 配置根目录的绝对路径
}
