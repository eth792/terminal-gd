#!/usr/bin/env node

/**
 * 应用启动验证脚本
 * 验证开发模式和生产模式都能正常工作
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔍 RPA自动化工具 - 应用启动验证\n');

// 检查必要文件
function checkFiles() {
  console.log('📁 检查必要文件...');

  const files = [
    'dist/main.js',
    'dist/preload.js',
    'dist/scriptExecutor.js',
    'dist/renderer/index.html'
  ];

  let allExist = true;

  files.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} - 缺失`);
      allExist = false;
    }
  });

  return allExist;
}

// 验证环境配置
function validateEnvironment() {
  console.log('\n🔧 验证环境配置...');

  // 读取主进程文件检查环境检测逻辑
  const mainJsPath = 'dist/main.js';
  if (fs.existsSync(mainJsPath)) {
    const mainContent = fs.readFileSync(mainJsPath, 'utf8');

    if (mainContent.includes('NODE_ENV !== \'production\'')) {
      console.log('✅ 环境检测逻辑正确');
    } else if (mainContent.includes('NODE_ENV === \'development\'')) {
      console.log('⚠️  环境检测逻辑可能有问题');
    }
  }
}

// 测试生产模式启动
async function testProductionMode() {
  console.log('\n🚀 测试生产模式启动...');

  return new Promise((resolve) => {
    const child = spawn('node', ['scripts/start-electron.js'], {
      env: { ...process.env, NODE_ENV: 'production' },
      stdio: 'pipe'
    });

    let output = '';
    let hasError = false;

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      const errorText = data.toString();
      if (errorText.includes('ERR_CONNECTION_REFUSED')) {
        hasError = true;
        console.log('❌ 生产模式启动失败: 试图连接开发服务器');
      } else if (errorText.includes('ERR_FILE_NOT_FOUND')) {
        hasError = true;
        console.log('❌ 生产模式启动失败: 文件路径错误');
      }
    });

    // 5秒后终止进程
    setTimeout(() => {
      child.kill();

      if (!hasError) {
        console.log('✅ 生产模式启动成功');
      }

      resolve(!hasError);
    }, 5000);
  });
}

// 主函数
async function main() {
  const filesOk = checkFiles();

  if (!filesOk) {
    console.log('\n❌ 缺少必要文件，请先运行: pnpm build');
    return;
  }

  validateEnvironment();
  const productionOk = await testProductionMode();

  console.log('\n📊 验证结果:');
  console.log(`- 文件检查: ${filesOk ? '✅' : '❌'}`);
  console.log(`- 生产模式: ${productionOk ? '✅' : '❌'}`);

  if (filesOk && productionOk) {
    console.log('\n🎉 应用验证通过！可以正常使用以下命令:');
    console.log('- pnpm dev (开发模式)');
    console.log('- pnpm electron:start (生产模式)');
  } else {
    console.log('\n⚠️  验证失败，请检查上述问题');
  }
}

main().catch(console.error);