#!/usr/bin/env node

/**
 * 开发环境设置脚本
 * 检查环境并提供开发指导
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 RPA自动化工具 - 开发环境检查\n');

// 检查 Node.js 版本
function checkNodeVersion() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

  console.log(`📋 Node.js 版本: ${nodeVersion}`);

  if (majorVersion < 16) {
    console.log('⚠️  警告: 建议使用 Node.js 16 或更高版本');
  } else {
    console.log('✅ Node.js 版本符合要求');
  }
}

// 检查 pnpm 是否安装
function checkPnpm() {
  try {
    const pnpmVersion = execSync('pnpm --version', { encoding: 'utf8' }).trim();
    console.log(`📦 pnpm 版本: ${pnpmVersion}`);
    console.log('✅ pnpm 已安装');
    return true;
  } catch (error) {
    console.log('❌ pnpm 未安装');
    console.log('请运行以下命令安装 pnpm:');
    console.log('  npm install -g pnpm');
    return false;
  }
}

// 检查可选的脚本运行环境
function checkOptionalRuntimes() {
  console.log('\n🔧 检查可选的脚本执行环境:');

  // 检查 Python
  try {
    const pythonVersion = execSync('python --version', { encoding: 'utf8' }).trim();
    console.log(`🐍 ${pythonVersion} - ✅ 可用`);
  } catch (error) {
    console.log('🐍 Python - ❌ 未安装 (可选)');
  }

  // 检查 Java
  try {
    const javaVersion = execSync('java -version', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    console.log('☕ Java - ✅ 可用');
  } catch (error) {
    console.log('☕ Java - ❌ 未安装 (可选)');
  }
}

// 检查项目文件结构
function checkProjectStructure() {
  console.log('\n📁 检查项目结构:');

  const requiredFiles = [
    'package.json',
    'src/main/main.ts',
    'src/renderer/main.tsx',
    'tsconfig.json',
    'vite.config.ts'
  ];

  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} (缺失)`);
    }
  });
}

// 提供开发指导
function showDevelopmentGuide() {
  console.log('\n📚 开发指南:');
  console.log('1. 安装依赖: pnpm install');
  console.log('2. 启动开发服务器: pnpm dev');
  console.log('3. 构建项目: pnpm build');
  console.log('4. 生产模式启动: pnpm electron:start');
  console.log('5. 运行测试: pnpm test');
  console.log('6. 代码检查: pnpm lint');
  console.log('7. 清理缓存: pnpm clean');
  console.log('\n🔧 故障排除:');
  console.log('- 如果遇到路径错误，请确保先运行 pnpm build');
  console.log('- 开发模式会自动启动 Vite 开发服务器和 Electron');
  console.log('\n🌟 默认登录信息: 用户名/密码 = admin/admin');
  console.log('🔗 更多信息请查看 README.md');
}

// 主函数
function main() {
  checkNodeVersion();

  const pnpmInstalled = checkPnpm();
  if (!pnpmInstalled) {
    return;
  }

  checkOptionalRuntimes();
  checkProjectStructure();
  showDevelopmentGuide();

  console.log('\n🎉 环境检查完成！');
}

main();