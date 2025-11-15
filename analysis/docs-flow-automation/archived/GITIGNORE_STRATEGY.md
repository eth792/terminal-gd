# .spec-workflow Git 策略精确分析

> **你的理解**："只把 specs/ 加入 git（排除备份文件），其他目录是辅助工具"

---

## ✅ 你的理解基本正确，但需要细化

### 完整目录结构分析

```
.spec-workflow/
├── 📁 specs/                    ← ✅ 核心内容，必须加入 git
│   └── docs-flow-automation/
│       ├── requirements.md      ← ✅ 加入 git
│       ├── design.md            ← ✅ 加入 git
│       ├── tasks.md             ← ✅ 加入 git
│       ├── tasks.md.backup      ← ❌ 排除（临时备份）
│       └── Implementation Logs/ ← ✅ 加入 git（AI 代码发现核心）
│           ├── task-1.md
│           ├── task-2.md
│           └── ...
│
├── 📁 templates/                ← ✅ 应该加入 git（可复用资源）
│   ├── requirements-template.md
│   ├── design-template.md
│   ├── tasks-template.md
│   └── ...
│
├── 📁 user-templates/           ← ✅ 应该加入 git（用户配置）
│   └── README.md
│
├── 📁 approvals/                ← ❌ 排除（MCP 运行时数据）
│   └── docs-flow-automation/
│       ├── .snapshots/          ← 临时快照
│       └── approval_*.json      ← 临时审批数据
│
├── 📁 steering/                 ← ⚠️ 空目录，无影响
├── 📁 archive/                  ← ⚠️ 可选（归档数据）
└── 📁 .cache/                   ← ❌ 排除（如果存在）
```

---

## 🎯 精确的 Git 策略

### 当前 .gitignore 状态

```bash
$ cat .gitignore | grep spec
.spec-workflow/      # ← 完全排除（太粗暴）
```

### 推荐的 .gitignore 配置

```gitignore
# .spec-workflow 的精细化控制

# 排除运行时数据
.spec-workflow/approvals/              # MCP 审批临时数据
.spec-workflow/.cache/                 # 缓存

# 排除备份文件
.spec-workflow/specs/*/*.backup        # tasks.md.backup 等
.spec-workflow/specs/*/.snapshots/     # 临时快照

# 排除归档（可选）
# .spec-workflow/archive/              # 如果不想追踪归档

# 其他目录默认加入 git：
# - specs/ (核心)
# - templates/ (可复用)
# - user-templates/ (用户配置)
# - steering/ (项目导向文档)
```

---

## 📊 目录分类表

| 目录 | 类型 | Git 策略 | 理由 |
|------|------|----------|------|
| **specs/** | 核心内容 | ✅ 加入 | AI 代码发现、开发历史 |
| **templates/** | 可复用资源 | ✅ 加入 | 其他项目可复用 |
| **user-templates/** | 用户配置 | ✅ 加入 | 用户自定义模板 |
| **approvals/** | 运行时数据 | ❌ 排除 | MCP 临时审批数据 |
| **specs/*/*.backup** | 临时备份 | ❌ 排除 | 编辑器自动备份 |
| **steering/** | 项目文档 | ⚠️ 可选 | 当前为空，有内容则加入 |
| **archive/** | 归档数据 | ⚠️ 可选 | 看是否需要追踪历史 |
| **.cache/** | 缓存 | ❌ 排除 | 临时缓存数据 |

---

## 🔍 关键发现

### 1. templates/ 也应该加入 git

```
理由：
✅ 这些模板是可复用资源
✅ 其他项目或团队成员可能需要
✅ 模板的演进历史有价值

当前状态：
$ git ls-files .spec-workflow/templates/
.spec-workflow/templates/design-template.md
.spec-workflow/templates/requirements-template.md
...
← 已经在 git 中了！

结论：保持现状
```

### 2. approvals/ 是运行时数据，应排除

```bash
$ ls .spec-workflow/approvals/docs-flow-automation/
.snapshots/                        # 临时快照
approval_1763109799738_z2r35orov.json  # 临时审批记录

性质：
- MCP server 的运行时数据
- 审批完成后即可删除
- 类似于 node_modules/

结论：应该排除
```

### 3. specs/*/*.backup 应该排除

```bash
$ find .spec-workflow/specs -name "*.backup"
.spec-workflow/specs/docs-flow-automation/tasks.md.backup

性质：
- 编辑器或工具自动创建的备份
- 临时文件，无需追踪
- 类似于 .swp 或 .DS_Store

结论：应该排除
```

---

## 💡 修正你的理解

### 你说的：

> "只把 specs/ 加入 git（排除备份文件），其他目录是辅助工具"

### 更精确的理解：

```
✅ 核心内容（必须加入）：
└── specs/               # 项目实施记录和 AI 代码发现

✅ 可复用资源（应该加入）：
├── templates/           # spec 模板（已在 git 中）
└── user-templates/      # 用户自定义模板（已在 git 中）

❌ 临时数据（应该排除）：
├── approvals/           # MCP 运行时审批数据
├── specs/*/*.backup     # 自动备份文件
└── .cache/              # 缓存数据

⚠️ 可选数据（根据需求）：
├── steering/            # 当前为空，有内容可加入
└── archive/             # 归档数据，可选
```

---

## 🔧 推荐的完整 .gitignore 配置

### 当前你的 .gitignore：

```gitignore
# 太粗暴，完全排除了 .spec-workflow
.spec-workflow/
```

### 推荐改为：

```gitignore
# ============================================================
# .spec-workflow MCP Server
# ============================================================

# 排除运行时数据
.spec-workflow/approvals/           # MCP 审批临时数据
.spec-workflow/.cache/              # 缓存文件

# 排除临时备份
.spec-workflow/specs/*/*.backup     # tasks.md.backup 等
.spec-workflow/specs/*/.snapshots/  # 临时快照

# 可选：排除归档（如果不需要追踪）
# .spec-workflow/archive/

# 保留以下目录（默认加入 git）：
# - specs/          核心实施记录
# - templates/      可复用模板
# - user-templates/ 用户配置
# - steering/       项目导向文档
```

---

## 📋 实施步骤

### Step 1: 备份当前 .gitignore

```bash
cp .gitignore .gitignore.backup
```

### Step 2: 更新 .gitignore

```bash
# 编辑 .gitignore
vi .gitignore

# 找到这行：
.spec-workflow/

# 替换为（推荐配置）：
# ============================================================
# .spec-workflow MCP Server
# ============================================================
.spec-workflow/approvals/
.spec-workflow/.cache/
.spec-workflow/specs/*/*.backup
.spec-workflow/specs/*/.snapshots/
```

### Step 3: 清理之前可能误加入的文件

```bash
# 如果之前有文件被 .spec-workflow/ 规则阻止追踪
git rm --cached -r .spec-workflow/ 2>/dev/null || true

# 重新添加应该追踪的文件
git add .spec-workflow/specs/
git add .spec-workflow/templates/
git add .spec-workflow/user-templates/
```

### Step 4: 验证

```bash
# 检查哪些文件会被追踪
git status .spec-workflow/

# 应该看到：
# modified:   .spec-workflow/specs/docs-flow-automation/requirements.md
# modified:   .spec-workflow/specs/docs-flow-automation/design.md
# modified:   .spec-workflow/specs/docs-flow-automation/tasks.md
# ...
# new file:   .spec-workflow/specs/docs-flow-automation/Implementation Logs/...

# 不应该看到：
# .spec-workflow/approvals/
# .spec-workflow/specs/docs-flow-automation/tasks.md.backup
```

### Step 5: 提交

```bash
git add .gitignore
git commit -m "chore: refine .spec-workflow git strategy

- Track specs/ for AI code discovery
- Keep templates/ and user-templates/ (already tracked)
- Exclude runtime data (approvals/, .cache/)
- Exclude temporary files (*.backup, .snapshots/)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 🎯 回答你的核心问题

### 你问：

> ".spec-workflow 目录下，只把 specs 加入 git（排除备份文件），其他目录都是辅助工具。我的理解是否准确？"

### 答案：

**✅ 基本正确，但需要补充两点**

#### 你理解正确的部分：

1. ✅ **specs/ 应该加入 git** - 核心内容（AI 代码发现）
2. ✅ **排除备份文件** - *.backup, .snapshots/ 等

#### 需要补充的部分：

1. **templates/ 也应该加入 git**
   - 性质：可复用资源（spec 模板）
   - 当前状态：已经在 git 中了
   - 结论：保持现状，不要排除

2. **approvals/ 应该排除**
   - 性质：MCP 运行时数据（临时审批记录）
   - 类比：类似于 node_modules/
   - 结论：应该加入 .gitignore

#### 完整总结：

```
加入 git：
✅ specs/          (核心内容)
✅ templates/      (可复用资源，已追踪)
✅ user-templates/ (用户配置，已追踪)

排除（.gitignore）：
❌ approvals/      (运行时数据)
❌ *.backup        (临时备份)
❌ .cache/         (缓存)
```

---

## 📊 对比表：修正前后

| 方面 | 修正前（你的理解） | 修正后（完整理解） |
|------|-------------------|-------------------|
| **specs/** | ✅ 加入 git | ✅ 加入 git |
| **templates/** | ⚠️ 是辅助工具 | ✅ 应该加入 git（可复用） |
| **user-templates/** | ⚠️ 是辅助工具 | ✅ 应该加入 git（用户配置） |
| **approvals/** | ⚠️ 是辅助工具 | ❌ 应该排除（运行时数据） |
| **备份文件** | ✅ 应该排除 | ✅ 应该排除 |

---

## 💬 Linus 式总结

> **"你的理解方向正确，但分类不够精细。"**
>
> **不是所有"辅助工具"都应该排除：**
> - templates/ 是可复用资源 → 应该加入 git
> - approvals/ 是运行时数据 → 应该排除
>
> **正确的分类标准是：**
> - 有长期价值、可复用、需要版本控制 → 加入 git
> - 临时数据、运行时状态、可重新生成 → 排除

---

## ✅ 最终建议

使用我提供的 .gitignore 配置：

```gitignore
# 排除运行时数据和临时文件
.spec-workflow/approvals/
.spec-workflow/.cache/
.spec-workflow/specs/*/*.backup
.spec-workflow/specs/*/.snapshots/

# 其他目录默认加入 git
```

**收益**：
- ✅ specs/ 加入 git → AI 代码发现
- ✅ templates/ 保持追踪 → 可复用资源
- ✅ 排除临时数据 → git 历史干净
- ✅ 职责清晰 → 易于维护

需要我帮你实施这个配置吗？
