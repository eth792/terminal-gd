/**
 * 配置加载与校验
 */
import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../util/log.js';
import {
  type FullConfig,
  type LabelAliasConfig,
  type BucketizeConfig,
  LatestConfigPointerSchema,
  NormalizeConfigSchema,
  DomainConfigSchema,
  LabelAliasConfigSchema,
  BucketizeConfigSchema,
} from './schema.js';

/**
 * 清洗配置：过滤超长别名
 * @param cfg - label_alias 配置
 * @returns 清洗后的配置
 */
function sanitizeConfig(cfg: LabelAliasConfig): LabelAliasConfig {
  const MAX_ALIAS_LEN = 50; // 合理的别名不会超过 50 字符
  let removedCount = 0;

  const sanitizeArray = (aliases: string[], fieldName: string): string[] => {
    return aliases.filter((s) => {
      if (s.length > MAX_ALIAS_LEN) {
        logger.warn(
          'config.sanitize',
          `Removed overly long ${fieldName} alias (${s.length} chars): ${s.slice(0, 50)}...`
        );
        removedCount++;
        return false;
      }
      return true;
    });
  };

  const sanitized: LabelAliasConfig = {
    supplier: sanitizeArray(cfg.supplier, 'supplier'),
    project: sanitizeArray(cfg.project, 'project'),
    order: cfg.order ? sanitizeArray(cfg.order, 'order') : undefined,
    _dbColumnNames: cfg._dbColumnNames,  // Preserve DB column name mappings
  };

  if (removedCount > 0) {
    logger.warn('config.sanitize', `Removed ${removedCount} overly long alias(es)`);
  }

  return sanitized;
}

/**
 * 从 configs/latest.json 加载最新配置
 * @param repoRoot - 仓库根目录，默认为 process.cwd()
 * @returns 完整配置对象
 */
export function loadLatestConfig(repoRoot: string = process.cwd()): FullConfig {
  const latestPath = path.join(repoRoot, 'configs', 'latest.json');

  if (!fs.existsSync(latestPath)) {
    throw new Error(`Latest config pointer not found: ${latestPath}`);
  }

  const latestContent = fs.readFileSync(latestPath, 'utf-8');
  const latestData = JSON.parse(latestContent);
  const pointer = LatestConfigPointerSchema.parse(latestData);

  logger.info('config.load', `Loading config version=${pointer.version}, sha=${pointer.sha}`);

  const configRoot = path.join(repoRoot, pointer.path);
  return loadConfig(configRoot, pointer.version, pointer.sha);
}

/**
 * 从指定路径加载配置
 * @param configRoot - 配置根目录（如 configs/v0.labs/f6b7160f）
 * @param version - 配置版本号
 * @param sha - 配置 SHA
 * @returns 完整配置对象
 */
export function loadConfig(configRoot: string, version: string, sha: string): FullConfig {
  if (!fs.existsSync(configRoot)) {
    throw new Error(`Config directory not found: ${configRoot}`);
  }

  // 加载并校验 normalize.user.json
  const normalizePath = path.join(configRoot, 'normalize.user.json');
  if (!fs.existsSync(normalizePath)) {
    throw new Error(`normalize.user.json not found in ${configRoot}`);
  }
  const normalizeContent = fs.readFileSync(normalizePath, 'utf-8');
  const normalizeData = JSON.parse(normalizeContent);
  const normalize = NormalizeConfigSchema.parse(normalizeData);

  // 加载并校验 domain.json
  const domainPath = path.join(configRoot, 'domain.json');
  if (!fs.existsSync(domainPath)) {
    throw new Error(`domain.json not found in ${configRoot}`);
  }
  const domainContent = fs.readFileSync(domainPath, 'utf-8');
  const domainData = JSON.parse(domainContent);
  const domain = DomainConfigSchema.parse(domainData);

  // 加载并校验 label_alias.json，然后清洗
  const labelAliasPath = path.join(configRoot, 'label_alias.json');
  if (!fs.existsSync(labelAliasPath)) {
    throw new Error(`label_alias.json not found in ${configRoot}`);
  }
  const labelAliasContent = fs.readFileSync(labelAliasPath, 'utf-8');
  const labelAliasData = JSON.parse(labelAliasContent);
  const labelAliasRaw = LabelAliasConfigSchema.parse(labelAliasData);

  // 清洗配置（过滤超长别名）
  const label_alias = sanitizeConfig(labelAliasRaw);

  // 加载并校验 bucketize.json（可选，向后兼容）
  const bucketizePath = path.join(configRoot, 'bucketize.json');
  let bucketize: BucketizeConfig | undefined;

  if (fs.existsSync(bucketizePath)) {
    try {
      const bucketizeContent = fs.readFileSync(bucketizePath, 'utf-8');
      const bucketizeData = JSON.parse(bucketizeContent);
      bucketize = BucketizeConfigSchema.parse(bucketizeData);
      logger.info('config.load', `Loaded bucketize.json: supplierHardMin=${bucketize.supplierHardMin}, autoPass=${bucketize.autoPass}`);
    } catch (e) {
      logger.warn('config.load', `Failed to load bucketize.json, using defaults: ${e instanceof Error ? e.message : String(e)}`);
      bucketize = BucketizeConfigSchema.parse({});
    }
  } else {
    logger.warn('config.load', `bucketize.json not found at ${bucketizePath}, using defaults`);
    bucketize = undefined; // 向后兼容，旧配置不强制要求
  }

  logger.info(
    'config.load',
    `Config loaded: replacements=${normalize.replacements.length}, ` +
      `stopwords=${domain.stopwords.length}, ` +
      `supplier_aliases=${label_alias.supplier.length}, ` +
      `project_aliases=${label_alias.project.length}`
  );

  return {
    normalize,
    domain,
    label_alias,
    bucketize,
    version,
    sha,
    root: configRoot,
  };
}
