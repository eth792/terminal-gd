# RPA自动化工具

一款基于 Electron 的跨平台桌面应用程序，支持多种业务流程自动化场景。

## 功能特性

- **登录认证**: 安全的用户登录系统
- **多功能模块**: 支持收发货管理、自动填报、表格数据提取
- **多语言执行**: 支持 Python、Java、Node.js 脚本执行
- **实时日志**: 完整的日志记录和实时显示
- **跨平台**: 支持 macOS 和 Windows

## 技术栈

- **框架**: Electron
- **前端**: React + TypeScript + Material UI
- **后端**: Node.js
- **构建工具**: Vite
- **代码质量**: ESLint + TypeScript

## 快速开始

```bash
# 1. 克隆项目
git clone <repository-url>
cd terminal-gd

# 2. 检查开发环境
pnpm setup

# 3. 安装依赖
pnpm install

# 4. 启动开发服务器
pnpm dev
```

## 开发指南

### 环境要求

- Node.js 16+
- pnpm 8+ (推荐使用 pnpm 作为包管理器)
- Python 3.x (可选，用于 Python 脚本执行)
- Java 8+ (可选，用于 Java 脚本执行)

### 安装 pnpm

```bash
# 使用 npm 安装 pnpm
npm install -g pnpm

# 或者使用 Homebrew (macOS)
brew install pnpm

# 或者使用 winget (Windows)
winget install pnpm
```

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

这将启动:
- Vite 开发服务器 (端口 3000)
- Electron 主进程
- 热重载功能

### 构建项目

```bash
# 构建渲染进程和主进程
pnpm build

# 打包应用
pnpm electron:pack

# 启动已构建的应用（生产模式）
pnpm electron:start

# 清理构建缓存
pnpm clean
```

### 代码检查

```bash
# 运行 ESLint
pnpm lint

# 运行 TypeScript 检查
pnpm type-check
```

### 运行测试

```bash
pnpm test
```

### pnpm 优势

- **更快的安装速度**: 使用硬链接和符号链接减少磁盘占用
- **更严格的依赖管理**: 避免幽灵依赖问题
- **更好的 monorepo 支持**: 原生支持工作区
- **磁盘空间高效**: 全局存储，避免重复安装

## 项目结构

```
src/
├── main/                 # 主进程代码
│   ├── main.ts          # Electron 主进程入口
│   ├── preload.ts       # 预加载脚本
│   └── scriptExecutor.ts # 脚本执行器
├── renderer/            # 渲染进程代码
│   ├── components/      # React 组件
│   ├── pages/          # 页面组件
│   ├── types/          # 类型定义
│   ├── utils/          # 工具函数
│   ├── App.tsx         # 应用主组件
│   └── main.tsx        # 渲染进程入口
└── test/               # 测试文件
```

## 使用指南

1. **登录**: 使用默认账户 admin/admin
2. **选择功能**: 在主页面选择需要的自动化功能
3. **配置脚本**: 在执行页面配置和编写脚本
4. **运行监控**: 实时查看执行进度和日志

## 贡献指南

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目基于 MIT 许可证开源。详见 LICENSE 文件。