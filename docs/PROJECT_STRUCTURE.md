# PROJECT STRUCTURE｜ocr-match-record

本仓库采用 **monorepo + pnpm workspaces** 管理，目标：
- **apps**：业务应用（桌面端 Electron、配置生成器等）
- **packages**：共享核心库（算法/阈值/报告 schema）
- **configs**：版本化的匹配配置产物
- **runs**：一次运行的“运行包”输出（统一格式，便于审阅与回溯）
- **sandbox / examples**：样例与实验代码，不参与构建

---

## 目录总览（当前）

```
.
├─ data/
│  ├─ db/             # ← 生产/开发读取的 Excel/CSV 数据源（不提交）
│  ├─ ocr_txt/        # ← 本地OCR文本（调试用，可不提交）
│  └─ images/         # ← 图片ocr输入源
├─ .cache/
│  └─ ocr-core/
│     └─ indexes/     # ← DB索引缓存（不提交）
├── apps/
│   └── electron-app/
│       ├── CLAUDE.MD
│       ├── docs/
│       │   ├── PRD.md
│       │   ├── README.md
│       │   ├── SCRIPT_EXECUTION_GUIDE.md
│       │   ├── UI交互逻辑.md
│       │   ├── script-execution-fix.md
│       │   ├── shipping-receiving-guide.md
│       │   ├── shipping-receiving-ui-improvements.md
│       │   └── 收发货.md
│       ├── jest.config.js
│       ├── package.json
│       ├── scripts/
│       │   ├── dev-setup.js
│       │   ├── start-electron.js
│       │   └── validate-app.js
│       ├── src/
│       │   ├── icon.icns
│       │   ├── icon.ico
│       │   ├── logo.jpg
│       │   ├── main/
│       │   │   ├── environmentChecker.ts
│       │   │   ├── main.ts
│       │   │   ├── preload.ts
│       │   │   └── scriptExecutor.ts
│       │   ├── renderer/
│       │   │   ├── App.tsx
│       │   │   ├── components/
│       │   │   │   ├── LogViewer.tsx
│       │   │   │   └── SystemMonitor.tsx
│       │   │   ├── index.html
│       │   │   ├── main.tsx
│       │   │   ├── pages/
│       │   │   │   ├── DashboardPage.tsx
│       │   │   │   ├── EnvironmentCheckPage.tsx
│       │   │   │   ├── ExecutionPage.tsx
│       │   │   │   ├── ExpenseReimbursementExecutionPage.tsx
│       │   │   │   ├── LoginPage.tsx
│       │   │   │   ├── OrderGenerationExecutionPage.tsx
│       │   │   │   └── ShippingReceivingExecutionPage.tsx
│       │   │   └── types/
│       │   │       ├── electron.d.ts
│       │   │       └── index.ts
│       │   └── types.d.ts
│       ├── tsconfig.json
│       ├── tsconfig.main.json
│       └── vite.config.ts
├── configs/                         # 配置产物（版本化）
│   ├── latest.json                  # 指向当前生效配置（{path, version, sha}）
│   └── vX.Y.Z/<sha>/...             # label_alias.json / normalize.user.json / domain.json
├── examples/                        # 示例与演示（不参与构建）
│   ├── SampleJava.java
│   ├── desktop/... (__pycache__/)
│   ├── sample_nodejs.js
│   ├── sample_python.py
│   ├── shipping_receiving_demo.py
│   └── myproject-0.0.1-SNAPSHOT.jar
├── packages/                        # 共享库
│   └── ocr-match-core/              # OCR 匹配核心算法库
│       ├── src/
│       │   ├── config/              # 配置加载与解析
│       │   │   ├── load.ts          # loadLatestConfig - 加载 configs/latest.json
│       │   │   ├── schema.ts        # Zod schemas - normalize/label_alias/domain
│       │   │   └── types.ts         # Config 类型定义
│       │   ├── normalize/           # 文本归一化管线
│       │   │   ├── pipeline.ts      # normalizePipeline - replacements → maps → strip
│       │   │   └── types.ts         # Normalize 类型定义
│       │   ├── extract/             # OCR 文本字段提取
│       │   │   ├── extractor.ts     # extractFromOcr - 行级扫描提取 supplier/project
│       │   │   └── types.ts         # Extract 类型定义
│       │   ├── indexer/             # 倒排索引构建
│       │   │   ├── builder.ts       # buildIndex - 构建 n-gram 倒排索引
│       │   │   ├── digest.ts        # computeDigest - SHA-256 校验
│       │   │   ├── parser.ts        # parseDbFile - CSV/Excel 解析
│       │   │   └── types.ts         # InvertedIndex 类型定义
│       │   ├── match/               # 匹配策略
│       │   │   ├── match.ts         # matchOneOcr - 三级匹配策略入口
│       │   │   ├── fast-exact.ts    # fastExact - 完全匹配（f1===q1 && f2===q2）
│       │   │   ├── anchor.ts        # anchorMatch - 单字段精确匹配
│       │   │   ├── recall.ts        # recallWithPrefilter - n-gram 召回 + 两阶段过滤
│       │   │   ├── rank.ts          # rankCandidates - 编辑距离 + Jaccard 混合打分
│       │   │   └── types.ts         # Match 类型定义（MatchMode/MatchResult）
│       │   ├── bucket/              # 结果分桶
│       │   │   ├── bucketize.ts     # bucketizeResult - exact/review/fail 分类
│       │   │   └── types.ts         # BucketType/BucketReason 枚举
│       │   ├── report/              # 报告输出
│       │   │   ├── schema.ts        # ResultRow - 20 列 CSV API 契约
│       │   │   └── writer.ts        # writeRunBundle - 生成 manifest/summary/CSV/JSONL
│       │   ├── cli/                 # CLI 工具
│       │   │   ├── build-index.ts   # ocr-build-index - 构建索引
│       │   │   ├── match-ocr.ts     # ocr-core - 批量匹配 OCR
│       │   │   └── eval-sidecar.ts  # ocr-eval - 评估准确率
│       │   ├── util/
│       │   │   └── log.ts           # logger - 结构化日志（console + JSONL）
│       │   └── index.ts             # 包入口（暴露核心 API）
│       ├── dist/                    # TypeScript 编译输出（.js/.d.ts/.map）
│       ├── package.json             # 包配置（bin/scripts/dependencies）
│       └── tsconfig.json            # TypeScript 配置
├── runs/                            # 运行包（统一输出）
│   └── run_YYYYmmdd_HHMMSS__prod/
│       ├── manifest.json            # 输入、参数、统计、版本指纹
│       ├── summary.md               # 人读一页小结
│       ├── results.csv              # 单一可信清单（exact/review/fail）
│       ├── results_top3.csv         # （可选）Top3 候选
│       ├── review.html              # （可选）静态审阅页：左表右图文
│       ├── review.json              # （可选）审阅页数据
│       └── inputs/                  # （可选）本次用到的 OCR/DB 清单
├── sandbox/                         # 实验/临时代码（不参与构建）
│   └── test_scripts/...
├── pnpm-workspace.yaml              # workspace 包含 apps/*、packages/*
├── package.json                     # 根：workspace 脚本（dev/build/test）
└── tsconfig.base.json               # 根 TS 基础配置（子包继承）
```

---

## 工作流与命令

- 安装依赖（根执行）
  ```bash
  pnpm i
  ```

- 开发（在根启动 electron-app）
  ```bash
  pnpm dev
  ```

- 构建所有包
  ```bash
  pnpm build
  ```

- 定向构建/运行子包
  ```bash
  pnpm -F ./apps/electron-app build
  pnpm -F ./apps/electron-app dev
  ```

- **ocr-match-core CLI 工具**

  构建核心包：
  ```bash
  cd packages/ocr-match-core && pnpm build
  ```

  构建 DB 索引：
  ```bash
  node --enable-source-maps packages/ocr-match-core/dist/cli/build-index.js \
    --db ./data/db/ledger-1.xlsx \
    --out ./runs/tmp/index_ledger1.json \
    --field1 "s_field1" \
    --field2 "s_field2"
  ```

  批量匹配 OCR 文本：
  ```bash
  node --enable-source-maps packages/ocr-match-core/dist/cli/match-ocr.js \
    --ocr ./data/ocr_txt \
    --index ./runs/tmp/index_ledger1.json \
    --db ./data/db/ledger-1.xlsx \
    --out ./runs/run_$(date +%Y%m%d_%H%M%S)__test \
    --include-top3
  ```

  评估匹配准确率（可选）：
  ```bash
  node --enable-source-maps packages/ocr-match-core/dist/cli/eval-sidecar.js \
    --results ./runs/run_XXX/results.csv \
    --sidecar ./configs/sidecar_json \
    --out ./runs/run_XXX/eval.md
  ```

> 说明：
> - 使用 **path filter** (`-F ./path`) 而非包名，避免 pnpm 查找失败
> - CLI 工具通过 `node --enable-source-maps` 直接调用编译后的脚本
> - 所有命令支持 `--log-level debug|info|warn|error|silent` 控制日志级别

---

## 运行包（runs）规范

**一次运行 = 一个目录（run bundle）**，统一产出：

- `manifest.json`：记录 `inputs`（db/ocr/config 路径与指纹）、`params`（阈值/召回策略）、`stats`（exact/review/fail/耗时）、`versions`（core/node 等）
- `summary.md`：人工审阅用 KPI（Top1/Top3/Auto-Pass/人工复核占比）+ 常见失败原因分布
- `results.csv`：**唯一可信清单**（列建议固定）
  ```
  file_name, q_supplier, q_project,
  cand_f1, cand_f2, source_file, row_index,
  s_field1, s_field2, score, bucket, reason,
  source_txt, source_image, viewer_link,
  run_id, config_version, config_sha, db_digest
  ```
- `review.html + review.json`（可选）：单页审阅（左侧列表、右侧图片+txt 同屏）

---

## examples 与 sandbox 的边界

- **examples/**：用于**演示/教程**的示例代码与数据（可包含多语言样例、演示脚本、样例数据集、打包产物演示如 `.jar/.zip`）。
  - 特点：长期保留、对外可参考，但**不参与构建/发布**。

- **sandbox/**：用于**临时试验**或“沙盒”性质的代码（比如快速验证脚本、临时测试、实验性想法）。
  - 特点：可随时增删、**不参与构建/发布**、不要求文档化。

> 两者共同点：都不进入 CI 构建与发布流程。**不参与构建**（“不递归构建”）的意思是：
> - CI/脚本仅对 `apps/*` 与 `packages/*` 执行 `build/test`，**不会**递归到 `examples/` 或 `sandbox/` 目录下运行任何构建命令；
> - 可以通过 pnpm 的 filter（如 `pnpm -r --filter ./apps/* --filter ./packages/* run build`）或 CI 的 include 路径来实现。

---

## 忽略与清理（建议）

根 `.gitignore` 建议包含：
```
node_modules
pnpm-lock.yaml
**/dist
**/build
**/__pycache__/
**/*.pyc
.DS_Store
```

另外，既然已使用 pnpm，建议 **删除子包内的 `package-lock.json` / `yarn.lock`**，避免锁文件混用导致的安装差异。

---

## 未来扩展（与本结构兼容）

- `packages/ocr-match-core/`：暴露 `normalize / extract / match / bucketize / ReportRowSchema` 等；Electron 与 trainer 共用。
- `apps/trainer-cli/`：本地学习/产出配置；生成 `configs/vX.Y.Z/<sha>` 与更新 `configs/latest.json`。
- Electron 内置“溯源跳转”：`results.csv` 的 `viewer_link` 指向 `review.html?file=<name>` 或自定义协议 `ocr://run/<id>?file=<name>`。
