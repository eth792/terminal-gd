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

  // DB-specific column name aliases
  _dbColumnNames: z
    .object({
      supplier: z.array(z.string()).default(['供应单位名称']),
      project: z.array(z.string()).default(['单体工程名称']),
      order: z.array(z.string()).optional().default(['订单号', '订号']),
    })
    .optional(),
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
  document_field_labels: z.array(z.string()).default([]),
  table_header_keywords: z.array(z.string()).default([]),
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

// bucketize.json schema
export const BucketizeConfigSchema = z.object({
  supplierHardMin: z.number().min(0).max(1).default(0.58),
  autoPass: z.number().min(0).max(1).default(0.75),
  minReview: z.number().min(0).max(1).default(0.65),
  minFieldSim: z.number().min(0).max(1).default(0.60),
  minDeltaTop: z.number().min(0).max(1).default(0.03),
  weights: z.tuple([z.number(), z.number()]).default([0.7, 0.3]),
}).refine(
  (data) => data.supplierHardMin <= data.minReview && data.minReview <= data.autoPass,
  { message: "Must have supplierHardMin <= minReview <= autoPass" }
).refine(
  (data) => Math.abs(data.weights[0] + data.weights[1] - 1.0) < 0.001,
  { message: "Weights must sum to 1.0" }
);

export type BucketizeConfig = z.infer<typeof BucketizeConfigSchema>;

// 完整配置集合
export interface FullConfig {
  normalize: NormalizeConfig;
  domain: DomainConfig;
  label_alias: LabelAliasConfig;
  bucketize?: BucketizeConfig;
  version: string;
  sha: string;
  root: string; // 配置根目录的绝对路径
}
