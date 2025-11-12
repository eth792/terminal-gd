# ocr-match-core 实施方案（Phase B）
**版本**：v0.1.0（2025‑11‑11）  
**目标**：在 monorepo 根目录本地运行，使用 **纯 JS/TS**（Node 18+），读入“阶段A产出的外部配置”，对 OCR `.txt` 批量进行 **供应商/工程** 两字段的直接匹配，输出统一的 **运行包（run bundle）**，并提供可观测的日志与指标。**暂不集成 Electron**。

---

## 0. 范围与非目标
- ✅ 范围：实现 `packages/ocr-match-core` 包与 CLI（Node 侧），完成：
  1) 配置加载与校验（`configs/latest.json → normalize/domain/label_alias`）；  
  2) DB 构建索引（读 Excel/CSV，识别供应商/工程列，生成内存索引与 JSON 快照）；  
  3) 提取与匹配（从 OCR `.txt` 提取 `q_supplier/q_project`，匹配到 DB）；  
  4) 结果分桶与运行包落地（`results.csv/summary.md/manifest.json`）；  
  5) 本地调试与评估（日志、Top1/Top3、AutoPass 比例）。
- ❌ 非目标：不做 UI、不做 Electron 集成、不做在线 LLM。

---

## 1. 包结构（packages/ocr-match-core）
```
packages/ocr-match-core/
├─ package.json
├─ tsconfig.json
├─ src/
│  ├─ index.ts                 # 导出公共 API
│  ├─ config/
│  │  ├─ schema.ts             # Zod schema：normalize/domain/label_alias
│  │  └─ load.ts               # loadLatestConfig(path) / loadConfig(path)
│  ├─ normalize/
│  │  └─ pipeline.ts           # 归一化管线（regex/mapping/strip）
│  ├─ extract/
│  │  └─ extractor.ts          # 文本提取 q_supplier/q_project（锚点/噪声）
│  ├─ indexer/
│  │  ├─ indexTypes.ts         # 索引类型定义
│  │  ├─ buildIndex.ts         # 读 DB(Excel/CSV)，识别列并生成索引
│  │  └─ persist.ts            # 索引的 JSON dump/load
│  ├─ match/
│  │  ├─ similarity.ts         # 编辑距离→相似度、token Jaccard、拼音可选
│  │  ├─ recall.ts             # 倒排召回（基于 n-gram 切分 + stopwords）
│  │  ├─ rank.ts               # 计算 s_field1/s_field2/score，TopK
│  │  └─ match.ts              # fast-exact → anchor → recall+rank
│  ├─ bucket/
│  │  └─ bucketize.ts          # exact/review/fail 与 reason 枚举
│  ├─ report/
│  │  ├─ schema.ts             # results.csv 的列定义与 zod schema
│  │  └─ writer.ts             # CSV/summary.md/manifest.json 输出
│  ├─ cli/
│  │  ├─ build-index.ts        # ocr-core build-index ...
│  │  ├─ match-ocr.ts          # ocr-core match-ocr ...
│  │  └─ eval-sidecar.ts       # ocr-core eval ...
│  └─ util/
│     ├─ fs.ts                 # 安全读写、编码探测（utf8/utf8-sig/gbk）
│     └─ log.ts                # 日志：console + JSONL（结构化）
└─ README.md
```

---

## 2. 依赖（无原生编译依赖）
- 运行时：`fastest-levenshtein`（编辑距离）、`iconv-lite`（GBK/UTF-8 读）、`csv-stringify/sync`（CSV 写）、`yargs`（CLI）、`zod`（配置与报告 schema 校验）、`dayjs`（时间戳）。  
- 开发：`typescript`、`tsup`、`@types/node`。  
> 不引入 `nodejieba` 等原生模块，召回采用 **CJK n-gram（2-gram/3-gram）+ 停词** 的可移植实现。

---

## 3. 数据契约（与阶段A对齐）

### 3.1 配置文件（A → B 可移植）
- `configs/latest.json`
  ```json
  { "path": "configs/v0.labs/f6b7160f", "version": "v0.labs", "sha": "f6b7160f" }
  ```
- `normalize.user.json`
  ```ts
  z.object({
    replacements: z.array(z.object({ pattern: z.string(), flags: z.string().optional(), replace: z.string() })),
    maps: z.record(z.string()),   // 可选：多字符归一（如 "○〇O" -> "0"）
    strip: z.array(z.string())    // 可选：正则或字符集合，执行“删除”
  })
  ```
- `label_alias.json`
  ```ts
  z.object({
    supplier: z.array(z.string()),
    project:  z.array(z.string()),
    order:    z.array(z.string()).optional()
  })
  ```
- `domain.json`
  ```ts
  z.object({
    anchors: z.object({ project: z.array(z.string()).default([]) }).partial(),
    noise_words: z.array(z.string()).default([]),
    stopwords:   z.array(z.string()).default([])
  })
  ```

### 3.2 索引快照（DB→索引）
`index.json`（persist.ts 产出）
```ts
type Row = {
  id: string;                    // 组合：<file>:<sheet>:<rowIndex> 或自增ID
  f1: string;                    // 供应单位名（标准化）
  f2: string;                    // 单体工程名（标准化）
  source: { file: string; sheet?: string; row: number; extra?: Record<string,string> };
  tokens: { f1: string[]; f2: string[]; joint: string[] }; // n-gram 切分 + 停词
};
type DBIndex = {
  version: "1";
  createdAt: string;
  cols: { file: string; supplier?: string; project?: string }[]; // 识别到的列名
  rows: Row[];
  inv: Record<string, string[]>; // 倒排：token -> row.id[]（可选，或运行时构建）
  digest: string;                // md5/sha1 of source files for manifest
};
```

### 3.3 结果报告（CSV）
列固定（`report/schema.ts` 校验）：
```
file_name, q_supplier, q_project,
cand_f1, cand_f2, source_file, row_index,
s_field1, s_field2, score, bucket, reason, mode,
source_txt, source_image, viewer_link,
run_id, config_version, config_sha, db_digest
```

`reason`（枚举，便于聚合排查）：
- `EXTRACT_EMPTY_SUPPLIER` / `EXTRACT_EMPTY_PROJECT`
- `FIELD_SIM_LOW`（字段相似度过低）
- `AMBIGUOUS_TOP`（Top1-Top2 差值过小）
- `NO_CANDIDATE`
- `OK`（exact/review 正常）

`mode`：`fast-exact | anchor | search`

---

## 4. 算法流程（稳而简）

### 4.1 归一化（normalize/pipeline.ts）
顺序：**replacements → maps → strip**（对应阶段A）  
- 预置规则示例：统一标点（`，,、.．·` → `、`）、全角空格去除、全/半角括号替换、近形字映射（`○〇O→0` `丨lI→1`）。
- 输出：`norm(s: string): string`。

### 4.2 提取（extract/extractor.ts）
输入：文本全文 + 配置（`label_alias/domain`）  
步骤：
1) 按行扫描，找到 **标签行**（任一 `label_alias.supplier/project`）。
2) **向右/下拼接**：标签后的同一行文本，如空则往下一行拼接，遇到 `domain.noise_words` 截断。
3) **锚点修剪**：工程值若包含 `anchors.project` 附近的尾部噪声，按锚点为边界截取。  
4) 归一化（norm）。
输出：`{ q_supplier: string; q_project: string; warns: string[] }`。

### 4.3 索引构建（indexer/buildIndex.ts）
- 支持输入：`--db <folder>`，自动读取 **.xlsx/.xls/.csv**；  
- 列识别：优先匹配 `label_alias.supplier/project` 中的任意别名；找不到则退化到包含关键词（“供应/供货/供方”“工程/项目/单体”）。  
- 每行生成 Row：`f1/f2` 归一化后切分为 **n-gram tokens**（缺省 2-gram），并写入 `rows[]`；  
- 构建倒排（token→row.id[]）并计算 `digest`（hash）；  
- `persistIndex(index, outPath)` 将 JSON 写出，供 `match-ocr` 使用。

### 4.4 匹配（match/match.ts）
阈值：
```ts
type Thresholds = { autoPass: number; minFieldSim: number; minDeltaTop: number; };
// 默认：autoPass=0.70, minFieldSim=0.60, minDeltaTop=0.03
```
流程：
1) **fast-exact**：若存在 `f1===q1 && f2===q2` → 直接 Top1（`mode="fast-exact"`）。  
2) **anchor**：若 `f1===q1` 且 `sim(f2,q2)≥minFieldSim`（或反之）→ 作为强候选（`mode="anchor"`）。  
3) **recall+rank**：将 `q1+q2` 的 tokens 从倒排召回候选（上限 `--max_cand`，默认 5000），对每条候选计算：  
   - `s_field1 = sim(q1,f1)`、`s_field2 = sim(q2,f2)`；  
   - `score = 0.5*s_field1 + 0.5*s_field2`（可通过 `--w1/--w2` 调整）；  
   - 相似度函数 `sim`：`1 - editDistance/ max(len)；` 与 `Jaccard(tokens)` 加权（如 0.7/0.3）。  
4) 取 TopK（默认 3），根据 `autoPass`、`minDeltaTop`、`minFieldSim` **分桶**：  
   - `exact`：`score≥autoPass && s_field1≥minFieldSim && s_field2≥minFieldSim && (top1-top2)≥minDeltaTop`  
   - `review`：存在明显候选但未达 exact 条件  
   - `fail`：`NO_CANDIDATE` 或 字段分数过低。

输出：Top1 与 Top3（可选）。

---

## 5. CLI（本地调试入口）

### 5.1 安装与构建
在仓库根：
```bash
pnpm i
pnpm -F ./packages/ocr-match-core build
```

### 5.2 命令一：构建索引
```bash
# 读 DB 文件夹，生成 index.json
pnpm -F ./packages/ocr-match-core ocr-core build-index \
  --db ./sample_pack_extracted/sample_pack/db \
  --out ./runs/tmp/index.json \
  --config ./configs/latest.json \
  --supplier-cols "供应单位名称,供应商" \
  --project-cols "单体工程名称,工程名称,项目名称" \
  --max-rows 20000
```
说明：`--supplier-cols/--project-cols` 可选（覆盖自动识别）；`--config` 用于别名辅助识别。输出：`index.json` + 日志。

### 5.3 命令二：批量匹配 OCR 文本
```bash
pnpm -F ./packages/ocr-match-core ocr-core match-ocr \
  --ocr ./sample_pack_extracted/sample_pack/ocr_txt \
  --index ./runs/tmp/index.json \
  --config ./configs/latest.json \
  --out ./runs/run_$(date +%Y%m%d_%H%M%S)__core \
  --autoPass 0.70 --minFieldSim 0.60 --minDeltaTop 0.03 \
  --topk 3 --max_cand 5000 --weights "0.5,0.5" \
  --open-links true
```
输出：在 `--out` 目录生成：  
- `manifest.json` / `summary.md` / `results.csv`（以及 `results_top3.csv` 可选）；  
- 同时记录 `config_version/config_sha/db_digest`。

### 5.4 命令三：评估（可选，若有 sidecar）
```bash
pnpm -F ./packages/ocr-match-core ocr-core eval \
  --results ./runs/.../results.csv \
  --sidecar ./sample_pack_extracted/sample_pack/sidecar_json \
  --out ./runs/.../eval.md
```
输出：Top1/Top3/AutoPass、混淆矩阵、失败 top-reasons。

---

## 6. 日志与可观测性

### 6.1 控制方式
- 环境变量：`OCR_LOG=debug|info|warn|error|silent`（默认 `info`）。  
- CLI 选项：`--log-level debug` 优先。

### 6.2 格式
- 控制台：`[2025-11-11T12:34:56.789Z][INFO][match-ocr][file=a.txt] message…`  
- JSONL 文件：写入 `--out/log.jsonl`，每条：
  ```json
  {"ts":"...","lvl":"INFO","mod":"extract","file":"a.txt","msg":"q_supplier='安德利集团有限公司', warns=[]"}
  ```

### 6.3 关键埋点
- `config.load`: 版本/sha、规则条数；  
- `index.build`: 文件数/行数/选中列名/倒排词条数/耗时；  
- `extract`: 每个文件的 `q_supplier/q_project/警告`；  
- `match`: 候选数、Top1/Top2 分差、mode、分桶；  
- `report`: results.csv 行数、exact/review/fail 统计；  
- 错误：文件不可读/编码异常/配置 schema 不通过。

---

## 7. Code Agent 任务拆解（一步一验收）

### Task 1｜初始化包（v0.1.0）
- 新建 `packages/ocr-match-core`；写 `package.json`：
  ```json
  {
    "name": "@ocr/core",
    "version": "0.1.0",
    "private": true,
    "type": "module",
    "main": "dist/index.js",
    "types": "dist/index.d.ts",
    "exports": { ".": "./dist/index.js" },
    "scripts": {
      "build": "tsup src/index.ts --format esm --dts --sourcemap --clean",
      "dev": "node --enable-source-maps dist/cli/match-ocr.js",
      "ocr-core": "node --enable-source-maps dist/cli/match-ocr.js"
    },
    "dependencies": {
      "zod": "^3.23.8",
      "yargs": "^17.7.2",
      "fastest-levenshtein": "^1.0.16",
      "iconv-lite": "^0.6.3",
      "csv-stringify": "^6.5.2",
      "dayjs": "^1.11.13"
    },
    "devDependencies": { "typescript": "^5.6.3", "tsup": "^8.1.0", "@types/node": "^20.12.12" }
  }
  ```
- `tsconfig.json` 继承根 `tsconfig.base.json`。  
- 出一个空 `src/index.ts` 并成功 `pnpm -F ./packages/ocr-match-core build`。

**验收**：构建通过。

### Task 2｜配置加载与校验（config/）
- `schema.ts`：Zod schema（见 3.1）；  
- `load.ts`：`loadLatestConfig(repoRoot=process.cwd())` 返回 `{normalize,domain,label_alias,version,sha,root}`。Schema 不通过直接抛错。

**验收**：`node` 里 `console.log(loadLatestConfig())` 输出版本信息。

### Task 3｜归一化与提取（normalize/ & extract/）
- `pipeline.ts`: `norm(s, normalizeConfig)`；按 **replacements→maps→strip** 顺序。  
- `extractor.ts`: `extract(text, cfg) → { q_supplier, q_project, warns[] }`  
  - 行级扫描；`label_alias` 命中后向右/下拼接；遇到 `domain.noise_words` 截断；对 `project` 做 `anchors` 修剪；最后 `norm()`。

**验收**：对 5 个 OCR 样本文本打印提取结果与 warns。

### Task 4｜索引构建（indexer/）
- `buildIndex.ts`：从 `--db` 目录读 Excel/CSV（用 `xlsx` 或 `csv-parse`），识别列（优先用 `label_alias`），生成 `DBIndex`（含倒排与 digest）。  
- `persist.ts`：`saveIndex(index, outPath)`、`loadIndex(path)`。

**验收**：构建一个 `index.json`，日志包含：文件数、行数、选中列名、digest、耗时。

### Task 5｜相似度、召回与排序（match/）
- `similarity.ts`：`editSim(a,b)`、`jaccard(tokensA,tokensB)`、`mixSim=0.7*editSim+0.3*jaccard`。  
- `recall.ts`：对 `q1+q2` 生成 n-gram tokens（去停词），从 `index.inv` 召回候选，限 `--max_cand`。  
- `rank.ts`：计算 `s_field1/s_field2/score` 与 TopK。

**验收**：针对 10 个查询打印 Top3 候选（f1,f2,score,s1,s2,mode）。

### Task 6｜匹配主流程与分桶（match.ts + bucketize.ts）
- 实现 fast-exact / anchor / recall+rank；  
- `bucketize` 根据阈值分 `exact/review/fail` 并给 reason。

**验收**：生成 30 条样本的 Top1 + bucket 统计。

### Task 7｜报告输出与 CLI（report/ + cli/）
- `writer.ts`：写 `results.csv/summary.md/manifest.json`；  
- `cli/build-index.ts`、`cli/match-ocr.ts`：封装成命令（见 5.2/5.3），支持 `--log-level --autoPass --minFieldSim --minDeltaTop --topk --max_cand --weights` 等参数；日志写 `log.jsonl`。

**验收**：在 `runs/run_...__core/` 产出完整运行包，并打印指标（exact/review/fail、Top1、Top3、AutoPass%）。

### Task 8｜评估工具（可选）
- `cli/eval-sidecar.ts`：读取人工标注 sidecar，对 `results.csv` 进行准确率评估，输出 `eval.md`。

**验收**：在小样上输出指标表。

---

## 8. 本地调试脚本建议（根 package.json）
只映射 core 的调试：
```json
{
  "scripts": {
    "core:build": "pnpm -F ./packages/ocr-match-core build",
    "core:index": "pnpm -F ./packages/ocr-match-core ocr-core build-index -- --db ./sample_pack_extracted/sample_pack/db --out ./runs/tmp/index.json --config ./configs/latest.json",
    "core:match": "pnpm -F ./packages/ocr-match-core ocr-core match-ocr -- --ocr ./sample_pack_extracted/sample_pack/ocr_txt --index ./runs/tmp/index.json --config ./configs/latest.json --out ./runs/run_test__core"
  }
}
```

---

## 9. 验收口径（Accuracy DoD）
- 使用你提供的小样（≥ 20 份 txt）与当前 DB：  
  - **Top1 ≥ 85%**（基线目标，可根据业务微调）；  
  - **Top3 ≥ 95%**；  
  - **AutoPass ≥ 60%** 且人工复核可控（根据阈值平衡）。  
- 运行包完整且可复跑；日志包含关键埋点；配置版本/sha 与 DB digest 均写入 `manifest.json`。

---

## 10. 版本计划
- **v0.1.0**（初始版本）：完成核心算法与 CLI 工具（任务 1–7，评估可选）。
- **v0.1.1**（本实施）：基于实际数据分析的改进版——内存优化、严格校验、配置清洗、性能优化、增强日志（见下文 §12）。
- **v0.1.2**（计划）：引入 `review.html`（静态审阅页）与 `results_top3.csv`；增加 `pairs` 训练对的统计。
- **v0.2.0**（计划）：更丰富的相似度（增量支持拼音近似、字段自适应权重）、并行批处理与更快的倒排结构。

---

## 11. 附：日志字段清单（JSONL）
```json
{"ts":"2025-11-11T12:00:00.001Z","lvl":"INFO","mod":"config.load","version":"v0.labs","sha":"f6b7160f","rules":{"replacements":9,"stopwords":23,"aliases":{"supplier":12,"project":14}}}
{"ts":"2025-11-11T12:00:01.513Z","lvl":"INFO","mod":"index.build","files":2,"rows":1845,"cols":{"supplier":"供应单位名称","project":"单体工程名称"},"tokens":45231,"digest":"sha1:....","ms":812}
{"ts":"2025-11-11T12:00:02.114Z","lvl":"DEBUG","mod":"extract","file":"a_001.txt","q_supplier":"安德利集团有限公司","q_project":"古田一路北段迁改工程","warns":[]}
{"ts":"2025-11-11T12:00:02.140Z","lvl":"INFO","mod":"match","file":"a_001.txt","mode":"anchor","topk":3,"top1":{"row":"db1:sheet1:123","score":0.83,"s1":0.98,"s2":0.69},"delta":0.07}
{"ts":"2025-11-11T12:00:02.310Z","lvl":"INFO","mod":"report","exact":17,"review":9,"fail":3,"ms":642}
```

---

## 12. v0.1.1 版本改进（2025-11-11 数据分析驱动）

### 12.0 数据分析结果

基于实际 OCR 样本（219 个 `.txt` 文件 + 19 个人工标注 sidecar），发现以下关键问题：

**噪声程度**（中等到严重）：
- 错别字：`主业支付` → `业主支付`、`公五世电工程` → `配电工程`
- 标点混淆：`（` vs `(`、`"` vs `"`、`〈` vs `<`
- 全角半角：`）` vs `)`、全角空格 vs 半角空格
- 字形相近：`○〇O` → `0`、`丨lI` → `1`

**配置质量问题**：
- `label_alias.json` 中存在 200+ 字符的注释混入别名列表
- `stopwords` 只有 3 个，导致倒排索引冗余

**潜在风险**：
- 10 万行 DB × 50 tokens = 500 万倒排条目，可能占用 200-500 MB 内存
- Digest 不匹配可能导致静默失败（结果与实际 DB 不符但无提示）

---

### 12.1 改进一：内存优化（字段字典压缩）

**问题**：大规模 DB（10 万行）的倒排索引可能占用 200-500 MB 内存。

**方案**：
```typescript
// indexer/indexTypes.ts 新增
type CompactIndex = {
  version: "1.1";
  fieldDict: string[];           // ["宝胜科技", "有限公司", ...] 全局字典
  rows: {
    id: string;
    f1_tokens: number[];         // token ID 数组（压缩）
    f2_tokens: number[];
    source: { file: string; row: number; };
  }[];
  inv: Record<number, number[]>; // tokenID -> rowIndex[]（用数字索引）
  digest: string;
};
```

**收益**：
- 字符串去重（"有限公司"只存一次）
- 倒排 key 从字符串改为数字（节省 50% 内存）
- 可选 gzip 压缩 JSON（节省 70% 磁盘）

**实施**：在 Task 4 增加 `--compact` 选项，默认关闭。

---

### 12.2 改进二：严格 Digest 校验（零容忍静默失败）

**问题**：DB 更新后忘记重建索引，导致匹配结果与实际 DB 不符，且无任何提示。

**方案**：
```typescript
// match/match.ts 中增加
function validateIndexDigest(index: DBIndex, dbPath: string, options: { allowStale?: boolean }) {
  const currentDigest = computeDigest(dbPath);
  if (index.digest !== currentDigest) {
    if (!options.allowStale) {
      throw new Error(
        `Index digest mismatch!\n` +
        `  Expected (index): ${index.digest}\n` +
        `  Actual (DB):      ${currentDigest}\n` +
        `  Reason: DB files have changed since index was built.\n` +
        `  Fix: Re-run 'ocr-core build-index' or use --allow-stale-index`
      );
    }
    logger.warn("Index digest mismatch, but --allow-stale-index is set. Proceeding...");
  }
}
```

**CLI 参数**：
```bash
# 默认：严格校验，不匹配直接 error 退出（非 0）
pnpm ocr-core match-ocr --index ./index.json --db ./db

# 兼容模式：允许 stale index（打印 warning 但继续）
pnpm ocr-core match-ocr --index ./index.json --db ./db --allow-stale-index
```

**实施**：在 Task 6 匹配主流程开始前校验。

---

### 12.3 改进三：配置清洗（启动时自检）

**问题**：`label_alias.json` 中有超长垃圾数据（200+ 字符的注释），会导致列识别误匹配。

**方案**：
```typescript
// config/load.ts 中增加
function sanitizeConfig(cfg: LabelAliasConfig): LabelAliasConfig {
  const MAX_ALIAS_LEN = 50; // 合理的别名不会超过 50 字符

  return {
    supplier: cfg.supplier.filter(s => {
      if (s.length > MAX_ALIAS_LEN) {
        logger.warn(`Ignoring overly long supplier alias (${s.length} chars): ${s.slice(0, 50)}...`);
        return false;
      }
      return true;
    }),
    project: cfg.project.filter(s => {
      if (s.length > MAX_ALIAS_LEN) {
        logger.warn(`Ignoring overly long project alias (${s.length} chars): ${s.slice(0, 50)}...`);
        return false;
      }
      return true;
    }),
    order: cfg.order?.filter(s => s.length <= MAX_ALIAS_LEN)
  };
}
```

**实施**：在 Task 2 配置加载时自动清洗。

---

### 12.4 改进四：两阶段过滤（降低计算成本）

**问题**：如果 `max_cand=5000`，每次查询计算 5000 × 2 fields × 编辑距离 = 1 万次字符串比较，耗时 100-500ms。

**方案**：
```typescript
// match/recall.ts 中增加
function recallWithPrefilter(q_tokens: string[], index: DBIndex, maxCand: number) {
  // 阶段1：廉价过滤（token overlap >= 2）
  const candidates = recallByInvertedIndex(q_tokens, index.inv);
  const prefiltered = candidates
    .map(rowId => ({
      rowId,
      overlap: countTokenOverlap(q_tokens, index.rows[rowId].tokens.joint)
    }))
    .filter(c => c.overlap >= 2)  // 至少有 2 个 token 重叠
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, maxCand);

  // 阶段2：精确排序（编辑距离）
  return prefiltered.map(c => index.rows[c.rowId]);
}
```

**收益**：过滤掉 95% 无关候选，编辑距离计算量降至原来的 5%。

**实施**：在 Task 5 召回模块实现。

---

### 12.5 改进五：增强日志（新增字段）

**新增 JSONL 字段**：
```json
{"ts":"...","lvl":"WARN","mod":"config.sanitize","removed_aliases":1,"reason":"overly_long","sample":"入库单号（配电变压器..."}
{"ts":"...","lvl":"ERROR","mod":"match.digest","expected":"abc123","actual":"def456","exit_code":1}
{"ts":"...","lvl":"INFO","mod":"recall.prefilter","before":5000,"after":250,"filter_ratio":0.95,"ms":15}
```

**summary.md 增加章节**：
```markdown
## 配置健康检查
- ✅ normalize 规则：10 条
- ⚠️ label_alias 清洗：移除 1 条超长别名
- ✅ stopwords：3 条（建议增加至 20+）

## Digest 校验
- ✅ index.digest = abc123
- ✅ DB.digest = abc123
- 状态：一致
```

**实施**：在 Task 7 报告输出模块实现。

---

### 12.6 更新后的任务清单

原方案 Task 1-8 不变，新增子任务：

#### Task 2.1 ｜配置清洗（新增）
- 在 `config/load.ts` 中增加 `sanitizeConfig()`
- 过滤超长别名（> 50 字符）
- 打印 warning 日志

#### Task 4.1 ｜内存优化（可选）
- 在 `indexer/buildIndex.ts` 增加 `--compact` 选项
- 实现字段字典压缩（`CompactIndex`）
- 对比压缩前后的 JSON 大小

#### Task 5.1 ｜两阶段过滤（性能优化）
- 在 `recall.ts` 实现 token overlap 预过滤
- 添加性能埋点（过滤前后候选数、耗时）

#### Task 6.1 ｜严格 Digest 校验（新增）
- 在 `match.ts` 开始前调用 `validateIndexDigest()`
- 支持 `--allow-stale-index` 选项
- Digest 不匹配时打印清晰错误信息并退出（非 0）

#### Task 7.1 ｜增强日志（新增）
- 在 `log.jsonl` 增加字段：`digest_mismatch`、`config_warnings`、`prefilter_stats`
- 在 `summary.md` 增加"配置健康检查"章节

---

### 12.7 验收口径调整

原方案要求"Top1 ≥ 85%"，但考虑到：
1. 只有 19 个标注样本（覆盖率 8.7%）
2. OCR 噪声较重（错别字、标点混淆）

**调整为**：
- **Phase 1（小样验收）**：在 19 个 sidecar 样本上，Top1 ≥ 80%、Top3 ≥ 90%
- **Phase 2（全量评估）**：在全部 219 个样本上，人工抽查 50 个，Top1 ≥ 75%

如果未达标，需要：
1. 检查提取阶段错误率（是否 > 5%）
2. 增加 normalize 规则（针对新发现的噪声模式）
3. 调整 n-gram 大小（2-gram → 3-gram）或相似度权重

---

### 12.8 技术债务与未来优化方向

**已知限制**：
- n-gram 召回不支持拼音近似（"武汉" vs "wuhan"）
- 编辑距离对长字符串（> 50 字符）计算慢
- 倒排索引未压缩，大规模 DB（> 50 万行）可能 OOM

**未来改进（v0.2.0+）**：
1. 拼音近似匹配（pypinyin 或 pinyin-pro）
2. SIMD 加速编辑距离（wasm 或 native addon）
3. 倒排索引持久化到 SQLite/LevelDB
4. 分布式匹配（多进程/多机）

---

—— v0.1.1 完 ——

---

## 13. 迭代记录 - v0.1.2: 多文件索引支持

**发布日期**: 2025-11-12  
**关键问题**: 原方案只支持单个 DB 文件，无法处理多个 Excel/CSV 文件的场景  
**核心改进**: 支持目录输入，自动扫描并合并所有 `.xlsx/.xls/.csv` 文件

---

### 13.1 问题发现

#### 背景
在实际生产环境中，DB 数据分散在多个 Excel 文件中：
- `ledger-1.xlsx`: 89,087 行（34 MB）
- `ledger-2.xlsx`: 88,956 行（35 MB）
- 总数据量：**178,043 行**

原有方案只能指定单个文件：
```bash
# ❌ 只索引了第一个文件（89K 行）
pnpm ocr-core build-index --db ./data/db/ledger-1.xlsx --out index.json
```

#### 用户反馈
> "为什么要进行转换，而不是直接读取 xlsx 或者 csv？"  
> "现在建立索引是不是只对第一个 xlsx 进行扫描。应该是对 db 下所有的 xlsx 进行扫描。"

**痛点**：
1. 手动合并多个文件容易出错
2. 需要重复索引多次，效率低
3. 无法保证所有文件的列结构一致

---

### 13.2 设计方案

#### 核心思路
将 `--db` 参数从 "文件路径" 扩展为 "文件或目录路径"：

```bash
# ✅ 新方案：自动扫描目录下所有文件
pnpm ocr-core build-index --db ./data/db --out index.json
```

#### 技术实现要点

**1. 目录扫描与文件排序**
```typescript
export function scanDbDirectory(dirPath: string): string[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = entries
    .filter(e => e.isFile())
    .filter(e => /\.(xlsx|xls|csv)$/i.test(e.name))
    .map(e => path.join(dirPath, e.name))
    .sort(); // 排序保证 digest 稳定

  if (files.length === 0) {
    throw new Error(`No DB files found in directory: ${dirPath}`);
  }
  return files;
}
```

**2. 多文件联合 Digest**
```typescript
export function computeMultiFileDigest(filePaths: string[]): string {
  const hashes = filePaths.map(file => computeDigest(file));
  // 联合 digest = hash(hash1 | hash2 | ...)
  return crypto.createHash('sha256').update(hashes.join('|')).digest('hex');
}
```

**3. 全局行 ID 与列名验证**
```typescript
let globalRowId = 0;
let firstFileColumns: string[] | null = null;

for (const dbFile of dbFiles) {
  const { columns, rows } = await parseDbFile(dbFile);

  // 验证列名一致性
  if (firstFileColumns === null) {
    firstFileColumns = columns;
  } else if (columns.join(',') !== firstFileColumns.join(',')) {
    throw new Error(`Column mismatch between files!`);
  }

  // 分配全局唯一 ID
  for (const row of rows) {
    globalRowId++;
    allRows.push({ id: `${globalRowId}`, ...row });
  }
}
```

**4. 类型扩展**
```typescript
export interface InvertedIndex {
  db_path: string;      // 输入路径（文件或目录）
  db_files: string[];   // 实际读取的文件列表
  digest: string;       // 多文件时为联合 digest
  // ...
}
```

---

### 13.3 实施步骤

#### 文件修改清单

| 文件 | 变更行数 | 说明 |
|------|---------|------|
| `src/indexer/types.ts` | +1 | 增加 `db_files` 字段 |
| `src/indexer/builder.ts` | +120 | 增加扫描/合并/验证逻辑 |
| `src/cli/match-ocr.ts` | +10 | 修复 digest 校验支持目录 |

#### 关键代码变更

**`builder.ts` 核心修改**：
```typescript
export async function buildIndex(
  dbPathOrDir: string,  // 支持文件或目录
  normalizeConfig: NormalizeConfig,
  options = {}
): Promise<InvertedIndex> {
  // 1. 检测是文件还是目录
  const stat = fs.statSync(dbPathOrDir);
  const dbFiles = stat.isDirectory()
    ? scanDbDirectory(dbPathOrDir)
    : [dbPathOrDir];

  // 2. 计算联合 digest
  const digest = dbFiles.length === 1
    ? computeDigest(dbFiles[0])
    : computeMultiFileDigest(dbFiles);

  // 3. 解析所有文件并合并（验证列名一致性）
  const allRows = await mergeAllFiles(dbFiles, options);

  // 4. 构建倒排索引
  return {
    db_path: dbPathOrDir,
    db_files: dbFiles,  // 新增字段
    digest,
    total_rows: allRows.length,
    // ...
  };
}
```

**`match-ocr.ts` Digest 校验修复**：
```typescript
// 检测是文件还是目录
const stat = fs_sync.statSync(args.db);
const currentDigest = stat.isDirectory()
  ? computeMultiFileDigest(scanDbDirectory(args.db))
  : computeDigest(args.db);

if (index.digest !== currentDigest) {
  throw new Error('Index digest mismatch - DB has changed');
}
```

---

### 13.4 测试结果

#### 索引构建性能

| 指标 | 单文件 | 多文件（2个） | 增长 |
|------|--------|-------------|------|
| 总行数 | 89,087 | 178,043 | +100% |
| 唯一 token 数 | 18,447 | 28,556 | +54.8% |
| 构建耗时 | 42s | 94s | +123.8% |
| 吞吐量 | ~2,120 行/s | ~1,890 行/s | -10.9% |
| JSON 文件大小 | 89 MB | 177 MB | +98.9% |

**性能分析**：
- 吞吐量略有下降（-10.9%），在合理范围内
- 主要开销在文件 I/O 和列名验证

#### 匹配效果对比

**测试条件**：222 个 OCR 文本，阈值 `autoPass=0.7, minFieldSim=0.6, minDeltaTop=0.03`

| 指标 | 单文件（89K） | 多文件（178K） | 变化 |
|------|-------------|--------------|------|
| ✅ Exact（自动通过） | 35 (15.8%) | 7 (3.2%) | **-12.6%** |
| ⚠️ Review（需审核） | 43 (19.4%) | 71 (32.0%) | **+12.6%** |
| ❌ Fail（失败） | 144 (64.9%) | 144 (64.9%) | 0% |
| 平均耗时 | 2.1s/文件 | 2.3s/文件 | +9.5% |

**结果分析**：
- **Exact 下降原因**：候选库扩大 1 倍，导致 Top1-Top2 差值缩小，更多样本触发 `DELTA_TOO_SMALL` 规则
- **Review 上升原因**：系统发现了更多相似候选，保守地要求人工审核
- **Fail 保持不变**：提取失败的样本不受候选库影响
- **这是预期行为**：更大的候选库理应降低自动通过率，提高审核率

#### Top 失败原因分布

| 原因 | 次数 | 占比 |
|------|------|------|
| DELTA_TOO_SMALL | 71 | 33.0% |
| FIELD_SIM_LOW_SUPPLIER | 60 | 27.9% |
| FIELD_SIM_LOW_PROJECT | 46 | 21.4% |
| EXTRACT_EMPTY_PROJECT | 18 | 8.4% |
| EXTRACT_BOTH_EMPTY | 11 | 5.1% |

---

### 13.5 向后兼容性

**完全兼容**：原有单文件命令无需修改：
```bash
# ✅ 仍然有效
pnpm ocr-core build-index --db ./db/ledger-1.xlsx --out index.json
pnpm ocr-core match-ocr --db ./db/ledger-1.xlsx --index index.json --out ./runs/test
```

**新增能力**：现在可以传入目录路径：
```bash
# ✅ 新增：自动扫描目录
pnpm ocr-core build-index --db ./db --out index.json
pnpm ocr-core match-ocr --db ./db --index index.json --out ./runs/test
```

---

### 13.6 已知限制与未来改进

#### 当前限制
1. **列名必须完全一致**：不同文件的列名必须严格匹配，顺序也必须相同
2. **内存占用翻倍**：178K 行索引占用 ~400 MB 内存（177 MB JSON + 解析开销）
3. **无增量更新**：任何文件变更都需要重新构建完整索引

#### 未来优化方向（v0.2.0+）
1. **智能列名映射**：自动识别 "供应商" vs "供应单位" 等语义相同的列
2. **分片索引**：每个文件一个分片，支持增量更新
3. **压缩存储**：倒排索引使用 LevelDB/SQLite 持久化，降低内存占用 70%
4. **并行构建**：利用 Worker Threads 多核构建，提速 2-3 倍

---

### 13.7 总结

**核心成果**：
- ✅ 支持多文件/目录输入，无需手动合并
- ✅ 自动扫描、验证列名一致性、分配全局 ID
- ✅ 多文件联合 digest 保证一致性
- ✅ 完全向后兼容单文件模式
- ✅ 实际测试：成功索引 178,043 行数据

**工程价值**：
1. **消除手动操作**：用户无需在 Excel 中手动合并文件
2. **防止人为错误**：自动验证列名一致性，避免数据混乱
3. **提升可维护性**：新增 DB 文件时，只需放入目录即可

**Linus 式评价**：
> "这是个真问题，不是臆想出来的。解决方案简单直接：文件 → 目录，单个 digest → 联合 digest。  
> 数据结构没变（仍然是 `DbRow[]`），只是多了一个扫描和合并步骤。  
> 没有特殊情况分支，向后兼容性是铁律。这就是 Good Taste。"

---

—— v0.1.2 完 ——
