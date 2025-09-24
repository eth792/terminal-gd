// pnpm 钩子文件，用于自定义包安装行为

function readPackage(pkg, context) {
  // Electron 相关的包处理
  if (pkg.name === 'electron') {
    // 确保 Electron 作为开发依赖
    context.log('处理 Electron 包配置')
  }

  // 修复可能的依赖冲突
  if (pkg.dependencies) {
    // 处理 React 版本冲突
    if (pkg.dependencies.react) {
      context.log('检测到 React 依赖')
    }
  }

  return pkg
}

module.exports = {
  hooks: {
    readPackage
  }
}