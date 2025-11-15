# Technical Decisions Log

This document records key architectural and design decisions made for the OCR Match Core project. Each decision is documented with its context, rationale, and consequences to help future maintainers understand why specific choices were made.

---

## Decision 1: Monorepo Structure

**Date**: 2025-11-10 (项目启动)

**Context**:
- 需要支持多个运行环境（Electron桌面应用 + 未来的CLI工具 + 可能的Web服务）
- 核心算法逻辑需要在多个项目间共享
- 希望统一管理依赖和构建流程

**Decision**: 采用"两个项目、一套真理"的 Monorepo 架构

**结构**:
1. **Desktop Runner (Electron)** - `apps/electron-app` - 生产环境运行器，用于批量处理 OCR 图像
2. **Shared Core** - `packages/ocr-match-core` - 共享算法库（normalize/extract/match/bucketize/report），未来所有项目都依赖此

**数据流**:
```
OCR 图像 → .txt → 字段提取（supplier/project）→ DB 模糊匹配 → 分桶（exact/review/fail）→ 运行包（CSV/JSON/Markdown）
```

**Consequences**:
- ✅ **优点**:
  - 核心算法只需维护一份代码
  - 新增运行环境（CLI/Web）时可直接复用 `packages/ocr-match-core`
  - 统一的TypeScript配置和代码风格
  - 方便跨项目调试和集成测试

- ⚠️ **权衡**:
  - 需要正确配置 pnpm workspace
  - 必须严格遵守 path filter 规则（`pnpm -F ./apps/electron-app`）
  - 构建顺序依赖管理（packages 必须先于 apps 构建）

- 📋 **约束**:
  - 仅构建 `apps/*` 和 `packages/*`
  - 不构建 `examples/` 和 `sandbox/`（实验性代码）
  - 必须使用 pnpm@9.12.2（通过 `packageManager` 锁定）

---

## Decision 2: Versioned Configurations (配置版本化)

**Date**: 2025-11-10 (核心流程实施)

**Context**:
- 配置文件（normalize规则/label_alias/domain知识）会随着优化不断调整
- 需要能够追溯任何历史运行结果是用哪个配置版本生成的
- 希望支持A/B测试不同配置方案
- 配置错误可能导致灾难性结果（如v0.1.7的配置污染）

**Decision**: 配置即代码，版本化管理在 `configs/v*/<sha>/` 下

**结构**:
```
configs/
├── latest.json              # 指针文件：指向当前激活的配置版本
├── v0.labs/
│   └── 10dae06c/            # 配置版本哈希
│       ├── normalize.user.json   # 文本归一化规则
│       ├── label_alias.json      # 字段标签别名映射
│       └── domain.json           # 领域知识（anchors/noise_words/stopwords）
└── v0.1.0/
    └── abc123de/
        ├── normalize.user.json
        ├── label_alias.json
        └── domain.json
```

**三大配置文件**:
1. **normalize.user.json** - 文本归一化规则（replacements/maps/strip）
2. **label_alias.json** - 字段标签的别名映射（supplier/project/order）
3. **domain.json** - 领域知识（anchors/noise_words/stopwords）

**Consequences**:
- ✅ **优点**:
  - 配置不可变性 - 历史配置永不修改，只能创建新版本
  - 可追溯性 - 每次运行在 `manifest.json` 和 `results.csv` 中记录 `config_version/config_sha`
  - 安全回滚 - 出问题可立即回退到稳定配置
  - 实验友好 - 可以并行测试多个配置分支（v0.labs/v0.1.x）

- ⚠️ **权衡**:
  - 磁盘空间占用略增（每个版本完整存储）
  - 更新配置需要修改 `latest.json` 指针

- 📋 **约束**:
  - **强制规则**: 一旦配置写入 `configs/vX.Y.Z/<sha>/`，永不修改
  - 所有配置变更必须创建新的 `<sha>/` 目录
  - `latest.json` 是唯一可修改的配置文件

**反面教训 (v0.1.7)**:
- 直接修改活跃配置文件导致提取逻辑全面崩溃
- 清理 label_alias.json 未经验证导致 27 个样本提取失败
- 验证了配置不可变性的重要性

---

## Decision 3: Immutable Run Bundles (不可变运行包)

**Date**: 2025-11-10 (核心流程实施)

**Context**:
- 每次完整测试运行耗时 30-50 分钟（222个样本）
- 需要能够对比不同版本的结果差异
- 希望支持离线审查和问题复现
- 调试时需要完整的上下文（输入/输出/中间状态/日志）

**Decision**: 每次执行产出一个独立的 `runs/` 文件夹，包含完整的输入/输出/指标，可独立复现

**结构**:
```
runs/
└── run_YYYYmmdd_HHMMSS__<tag>/     # 例：run_20251113_214123__v0.1.6_full
    ├── manifest.json                # 元数据：输入参数/统计/版本/fingerprints
    ├── summary.md                   # 人类可读的执行总结
    ├── results.csv                  # ✨ 单一数据源真理（Top1 + scores + bucket + reason）
    ├── results_top3.csv             # 可选：Top 3 候选
    ├── review.html                  # 可选：单页审查器（左侧表格 + 右侧图像/文本）
    └── log.jsonl                    # 结构化日志
```

**results.csv 的列契约**（不可随意增删）:
```
file_name, q_supplier, q_project,
cand_f1, cand_f2, source_file, row_index,
s_field1, s_field2, score, bucket, reason, mode,
source_txt, source_image, viewer_link,
run_id, config_version, config_sha, db_digest
```

**Consequences**:
- ✅ **优点**:
  - 完整可复现性 - 任何历史运行都可以精确复现
  - 版本对比 - 可以diff两个运行包的results.csv快速定位差异
  - 离线审查 - review.html可在任何浏览器打开
  - 问题诊断 - log.jsonl包含所有关键步骤的日志
  - 数据契约 - results.csv的列定义是API，保证向后兼容

- ⚠️ **权衡**:
  - 磁盘空间占用（每次完整测试约50-100MB）
  - 需要定期清理过期运行包

- 📋 **约束**:
  - **强制规则**: 永不破坏运行包契约 - `results.csv` 的列定义是 API，变更必须向后兼容
  - 每次运行必须记录 DB 的 hash（`db_digest`）确保可追溯
  - `manifest.json` 必须包含完整的环境信息（config_version/config_sha/db_digest/timestamp）

**关键实践**:
- 使用带时间戳和标签的目录名（`run_YYYYmmdd_HHMMSS__<tag>`）
- 标签规范：`vX.Y.Z_full`（完整测试）、`vX.Y.Z_quick`（快速测试）、`vX.Y.Z_debug`（调试测试）
- 保留至少最近 5 个版本的运行包

---

## Decision 4: 四阶段处理管线

**Date**: 2025-11-10 (核心流程设计)

**Context**:
- OCR文本质量不稳定（标点错误、字符识别错误、布局混乱）
- 需要从非结构化文本中提取结构化字段
- DB记录也有数据质量问题（缩写、别名、错别字）
- 需要支持模糊匹配但又要控制误匹配率

**Decision**: 设计四阶段处理管线 - Normalize → Extract → Match → Bucketize

**管线详情**:

### 1️⃣ Normalize (`normalize/pipeline.ts`)
- 按 `replacements → maps → strip` 顺序清洗文本
- 处理OCR常见错误（"工理"→"工程"、"巾"→"市"）
- 标准化标点符号（中文标点→英文标点）

### 2️⃣ Extract (`extract/extractor.ts`)
- 行级扫描找标签（`label_alias`）
- 向右/下拼接值，遇 `noise_words` 截断
- 对 `project` 执行 `anchors` 修剪

### 3️⃣ Match (`match/match.ts`)
三级匹配策略：
- **fast-exact**: 完全匹配（f1===q1 && f2===q2）→ 立即返回
- **anchor**: 单字段精确匹配 + 另一字段相似度 ≥ threshold
- **recall+rank**: n-gram 倒排召回 → 编辑距离+Jaccard 混合打分 → TopK

### 4️⃣ Bucketize (`bucket/bucketize.ts`)
根据阈值分类：
- **exact** - 自动通过（score ≥ autoPass, 字段分 ≥ minFieldSim, Top1-Top2 差值 ≥ minDeltaTop）
- **review** - 需人工审核
- **fail** - 无候选或分数过低，附带 `reason` 枚举

**Consequences**:
- ✅ **优点**:
  - 职责清晰 - 每个阶段只做一件事
  - 易于调试 - 可以单独测试每个阶段
  - 可扩展 - 增加新规则只需修改对应阶段

- ⚠️ **已知问题**:
  - Extract阶段的行级扫描存在多行布局解析错误（v0.1.6发现，影响50%失败案例）
  - Bucketize阶段的Rule 3.5实现经历多次调整（v0.1.4/v0.1.5/v0.1.6）

**相关版本历史**:
- v0.1.4: 修复Bucketize规则顺序错误（高置信度旁路）
- v0.1.5: 实施"项目优先"策略（Rule 3.5）
- v0.1.6: 调整Rule 3.5阈值 + 发现Extract阶段Bug
- v0.1.7: 尝试修复Extract逻辑失败（灾难性回归）

---

## 版本演进总结

### 关键里程碑
- **v0.1.0-v0.1.3**: 核心流程搭建（自动通过率 3.6%）
- **v0.1.4**: 第一次重大突破（3.6% → 27.5%，+7.6倍）- 修复Bucketize设计缺陷
- **v0.1.5**: 渐进优化（27.5% → 31.5%，+1.15倍）- 实施"项目优先"策略
- **v0.1.6**: 诊断阶段（31.5% → 32.0%）- 发现Extract根本缺陷
- **v0.1.7**: ❌ 失败尝试（32.0% → 0.0%）- 违反单次变更原则

### 核心教训
1. **Rule 1 违反的代价**: v0.1.7同时修改4处逻辑导致100%失败
2. **配置不可变性**: v0.1.7配置污染验证了Decision 2的必要性
3. **增量验证**: 必须使用小范围测试验证每个修改点
4. **提取逻辑复杂性**: Extract阶段需要更谨慎的重构策略

---

**最后更新**: 2025-11-15
**文档维护**: 每次重大架构决策或技术发现时更新
