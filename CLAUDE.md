# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 核心架构理念

这个 monorepo 遵循"两个项目、一套真理"的设计哲学：

1. **Desktop Runner (Electron)** - 生产环境运行器，用于批量处理 OCR 图像
2. **Shared Core (`packages/`)** - 共享算法库（normalize/extract/match/bucketize/report），未来所有项目都依赖此
3. **Versioned Configurations** - 配置即代码，版本化管理在 `configs/v*/<sha>` 下
4. **Immutable Run Bundles** - 每次执行产出一个独立的 `runs/` 文件夹，包含完整的输入/输出/指标，可独立复现

**数据流**：OCR 图像 → `.txt` → 字段提取（supplier/project）→ DB 模糊匹配 → 分桶（exact/review/fail）→ 运行包（CSV/JSON/Markdown）

## 关键设计约束

### 配置管理（configs/）
- **不可变性**：每个配置版本存在 `configs/vX.Y.Z/<sha>/` 下，永不修改
- **指针机制**：`configs/latest.json` 指向当前激活的配置版本
- **三大配置文件**：
  - `normalize.user.json` - 文本归一化规则（replacements/maps/strip）
  - `label_alias.json` - 字段标签的别名映射（supplier/project/order）
  - `domain.json` - 领域知识（anchors/noise_words/stopwords）
- 每次运行都会在 `manifest.json` 和 `results.csv` 中记录 `config_version/config_sha`

### 运行包结构（runs/）
每个运行包 `runs/run_YYYYmmdd_HHMMSS__<tag>/` 必须包含：
```
manifest.json     # 元数据：输入参数/统计/版本/fingerprints
summary.md        # 人类可读的执行总结
results.csv       # 单一数据源真理（Top1 + scores + bucket + reason）
results_top3.csv  # 可选：Top 3 候选
review.html       # 可选：单页审查器（左侧表格 + 右侧图像/文本）
log.jsonl         # 结构化日志
```

**results.csv 的列契约**（不可随意增删）：
```
file_name, q_supplier, q_project,
cand_f1, cand_f2, source_file, row_index,
s_field1, s_field2, score, bucket, reason, mode,
source_txt, source_image, viewer_link,
run_id, config_version, config_sha, db_digest
```

### 构建范围边界
- **仅构建** `apps/*` 和 `packages/*`
- **不构建** `examples/` 和 `sandbox/`（实验性代码）
- 根目录的 `pnpm dev/build` 脚本当前仅针对 `apps/electron-app`

## 开发命令

### 核心工作流
```bash
# 安装依赖（使用 pnpm）
pnpm install

# 开发 Electron 应用
pnpm dev
# 或直接运行 electron-app 的 dev 脚本
pnpm -F ./apps/electron-app dev

# 构建 Electron 应用
pnpm build
# 或
pnpm -F ./apps/electron-app build

# 打包为可分发应用
pnpm -F ./apps/electron-app electron:pack
pnpm -F ./apps/electron-app pack:mac    # macOS
pnpm -F ./apps/electron-app pack:win    # Windows
```

### Electron App 子命令
```bash
# 进入 apps/electron-app 后
npm run dev              # 完整开发流程（Vite + TypeScript 监听 + Electron）
npm run dev:vite         # 仅启动 Vite dev server
npm run build:main       # 构建主进程（TypeScript → dist/main.js）
npm run build:renderer   # 构建渲染进程（Vite → dist/）
npm run build:watch      # 监听模式编译主进程
npm run electron:dev     # 启动 Electron（需先构建 main.js）
npm run electron:start   # 生产模式启动 Electron

# 代码质量
npm run lint             # ESLint 检查
npm run type-check       # TypeScript 类型检查
npm test                 # Jest 单元测试

# 清理
npm run clean            # 删除 dist/build/node_modules/.cache
```

### 未来 ocr-match-core 命令（packages/ocr-match-core）
```bash
# 构建 core 包
pnpm -F ./packages/ocr-match-core build

# 构建 DB 索引
pnpm -F ./packages/ocr-match-core ocr-core build-index \
  --db ./sample_pack_extracted/sample_pack/db \
  --out ./runs/tmp/index.json \
  --config ./configs/latest.json

# 批量匹配 OCR 文本
pnpm -F ./packages/ocr-match-core ocr-core match-ocr \
  --ocr ./sample_pack_extracted/sample_pack/ocr_txt \
  --index ./runs/tmp/index.json \
  --config ./configs/latest.json \
  --out ./runs/run_$(date +%Y%m%d_%H%M%S)__core \
  --autoPass 0.70 --minFieldSim 0.60 --minDeltaTop 0.03
```

## Monorepo 架构细节

### 包管理器约束
- **必须使用 pnpm**（`packageManager: "pnpm@9.12.2"` 已锁定）
- 如遇到 `corepack` 未启用：
  ```bash
  corepack enable
  corepack prepare pnpm@9.12.2 --activate
  ```
- 使用 **path filter** 避免包名混淆：
  ```bash
  pnpm -F ./apps/electron-app <command>  # ✅ 正确
  pnpm -F rpa-automation-tool <command>  # ⚠️ 可能失败（包名依赖）
  ```

### 文件夹职责
- **apps/electron-app** - 生产桌面应用（Electron + React + TypeScript）
  - `src/main/` - Electron 主进程（Node 环境）
  - `src/renderer/` - React 渲染进程（浏览器环境）
  - `src/renderer/pages/` - 页面组件（Login/Dashboard/Execution 等）
  - `src/renderer/components/` - 通用组件（LogViewer/SystemMonitor）
- **packages/** - 共享库（当前为空，计划添加 `@ocr/core`）
- **configs/** - 版本化配置（normalize/label_alias/domain）
- **runs/** - 运行输出（每次执行产生一个独立文件夹）
- **examples/, sandbox/** - 实验性代码，不参与构建

### Electron 应用的 IPC 架构
主进程和渲染进程通过 IPC 通信：
- **scriptExecutor.ts** - 主进程模块，执行 Python/Java/Node.js 脚本，流式输出日志
- **preload.ts** - 暴露安全的 API 给渲染进程（`window.electronAPI`）
- **renderer/** - 通过 `window.electronAPI` 调用主进程功能

关键 IPC 通道：
- `execute-script` - 启动脚本执行
- `script-log` - 实时日志流
- `script-error` / `script-exit` - 错误与退出事件
- `check-environment` - 检测 Python/Java/Node.js 运行环境

## ocr-match-core 算法流程（待实施）

### 四阶段处理管线
1. **Normalize** (`normalize/pipeline.ts`) - 按 `replacements → maps → strip` 顺序清洗文本
2. **Extract** (`extract/extractor.ts`) - 从 OCR `.txt` 提取 `q_supplier/q_project`
   - 行级扫描找标签（`label_alias`）
   - 向右/下拼接值，遇 `noise_words` 截断
   - 对 `project` 执行 `anchors` 修剪
3. **Match** (`match/match.ts`) - 三级匹配策略
   - `fast-exact`: 完全匹配（f1===q1 && f2===q2）→ 立即返回
   - `anchor`: 单字段精确匹配 + 另一字段相似度 ≥ threshold
   - `recall+rank`: n-gram 倒排召回 → 编辑距离+Jaccard 混合打分 → TopK
4. **Bucketize** (`bucket/bucketize.ts`) - 根据阈值分类
   - `exact` - 自动通过（score ≥ autoPass, 字段分 ≥ minFieldSim, Top1-Top2 差值 ≥ minDeltaTop）
   - `review` - 需人工审核
   - `fail` - 无候选或分数过低，附带 `reason` 枚举（`EXTRACT_EMPTY_SUPPLIER`/`FIELD_SIM_LOW` 等）

### 性能与可观测性
- **日志级别**：通过 `OCR_LOG=debug|info|warn|error` 或 `--log-level` 控制
- **JSONL 日志**：所有关键步骤写入 `log.jsonl`（config.load/index.build/extract/match/report）
- **指标埋点**：
  - 索引构建：文件数/行数/列名/倒排词条数/digest/耗时
  - 提取：每个文件的 q_supplier/q_project/警告
  - 匹配：候选数/Top1-Top2 差值/mode/分桶
  - 报告：exact/review/fail 统计

## 常见故障排查

### pnpm 过滤器问题
**问题**：`No projects matched the filters`
**原因**：包名与 `package.json` 的 `name` 字段不一致
**解决**：始终使用 path filter：
```bash
pnpm -F ./apps/electron-app <command>  # ✅
pnpm -F rpa-automation-tool <command>  # ❌ 可能失败
```

### Electron 无法启动
**问题**：`dist/main.js` 不存在
**解决**：先构建主进程再启动
```bash
npm run build:main  # 或 npm run build:watch（监听模式）
npm run electron:dev
```

### 混合锁文件
**问题**：同时存在 `package-lock.json` 和 `pnpm-lock.yaml`
**解决**：删除所有子包的 `package-lock.json`，只保留根目录的 `pnpm-lock.yaml`

### TypeScript 编译错误
**问题**：`tsconfig.json` 路径解析失败
**解决**：检查是否继承了 `tsconfig.base.json`：
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { ... }
}
```

## 技术栈与依赖

### Electron App
- **UI**: React 18 + Material-UI + Emotion
- **路由**: React Router v6
- **构建**: Vite (renderer) + tsc (main process)
- **打包**: electron-builder
- **日志**: electron-log

### ocr-match-core（计划）
- **运行时**: Node ≥ 18
- **核心算法**:
  - `fastest-levenshtein` - 编辑距离
  - `iconv-lite` - 编码检测（UTF-8/GBK）
  - `csv-stringify` - CSV 输出
- **配置**: Zod (schema 校验)
- **CLI**: yargs
- **无原生依赖** - 纯 JS/TS 实现，避免 `nodejieba` 等原生模块

## 下一步开发计划

1. **创建 `packages/ocr-match-core`** - 实现共享算法库（normalize/extract/match/bucketize/report）
2. **实施 CLI 工具** - `build-index` 和 `match-ocr` 命令
3. **集成到 Electron** - 将 core 包作为 Electron 主进程的依赖
4. **生成 review.html** - 实现单页审查器（表格+图像并排显示）
5. **训练工具** - 添加 `apps/trainer-cli` 生成配置并更新 `configs/latest.json`

## 代码风格与约定

- **TypeScript strict mode** 已启用（`tsconfig.base.json`）
- **ES2020 + ESNext** 模块系统
- **文件命名**：`camelCase.ts` 用于模块，`PascalCase.tsx` 用于 React 组件
- **日志格式**：`[timestamp][level][module][context] message`
- **错误处理**：关键路径必须有 try-catch，错误信息必须包含上下文（file/row/config）

## 注意事项

- **永不破坏运行包契约** - `results.csv` 的列定义是 API，变更必须向后兼容
- **配置不可变性** - 一旦配置写入 `configs/vX.Y.Z/<sha>/`，永不修改，只能创建新版本
- **DB digest** - 每次运行必须记录 DB 的 hash（确保可追溯）
- **日志可追溯性** - 所有关键操作必须写日志（config/index/extract/match/report）
- **性能基线** - Electron 启动 ≤3s，页面切换 ≤1s，日志延迟 ≤200ms
