#!/usr/bin/env node

/**
 * Electron 应用启动脚本
 * 根据环境自动设置相应的配置
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const isDevelopment = process.env.NODE_ENV !== 'production';

console.log(`🚀 启动 RPA自动化工具 (${isDevelopment ? '开发' : '生产'}模式)`);

// 检查必要文件是否存在
function checkRequiredFiles() {
  const mainFile = path.join(__dirname, '../dist/main.js');

  if (!fs.existsSync(mainFile)) {
    console.error('❌ 主进程文件不存在，请先运行构建命令:');
    console.error('   pnpm build:main');
    process.exit(1);
  }

  if (!isDevelopment) {
    const rendererFile = path.join(__dirname, '../dist/renderer/index.html');
    if (!fs.existsSync(rendererFile)) {
      console.error('❌ 渲染进程文件不存在，请先运行构建命令:');
      console.error('   pnpm build:renderer');
      process.exit(1);
    }
  }
}

// 启动 Electron
function startElectron() {
  checkRequiredFiles();

  const electronPath = path.join(__dirname, '../node_modules/.bin/electron' + (process.platform === 'win32' ? '.cmd' : ''));
  const mainPath = path.join(__dirname, '../dist/main.js');

  // 设置环境变量
  const env = {
    ...process.env,
    NODE_ENV: isDevelopment ? 'development' : 'production',
  };

  if (isDevelopment) {
    console.log('🌐 开发模式：将连接到 http://localhost:3000');
  } else {
    console.log('📦 生产模式：将加载本地 HTML 文件');
  }

  console.log(`📂 主进程路径: ${mainPath}`);
  console.log(`⚡ Electron 路径: ${electronPath}`);
  // console.log(`调试信息 - Electron 可执行文件路径: ${electronPath}`);
  // console.log(`调试信息 - 主进程文件路径: ${mainPath}`);
  // console.log(`调试信息 - 环境变量:`, env);

  const child = spawn(electronPath, [mainPath], {
    env,
    stdio: 'inherit',
    shell: true // 在 shell 中执行命令，以确保 .cmd 文件被正确识别和执行
  });

  child.on('close', (code) => {
    console.log(`\n✨ 应用已关闭 (退出码: ${code})`);
  });

  child.on('error', (error) => {
    console.error('❌ 启动失败:', error.message);
    process.exit(1);
  });

  // 处理进程终止信号
  process.on('SIGINT', () => {
    console.log('\n🛑 正在关闭应用...');
    child.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    child.kill('SIGTERM');
  });
}

startElectron();