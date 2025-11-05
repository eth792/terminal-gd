#!/usr/bin/env node
/**
 * 测试脚本 - Node.js Hello World
 */

const os = require('os');

console.log('='.repeat(50));
console.log('Node.js 脚本执行测试');
console.log('='.repeat(50));

// 打印基本信息
console.log(`执行时间: ${new Date().toLocaleString('zh-CN')}`);
console.log(`Node.js 版本: ${process.version}`);
console.log(`平台: ${os.platform()}`);
console.log(`架构: ${os.arch()}`);

// 处理命令行参数
const args = process.argv.slice(2);
if (args.length > 0) {
    console.log(`\n收到 ${args.length} 个参数:`);
    args.forEach((arg, index) => {
        console.log(`  参数 ${index + 1}: ${arg}`);
    });
} else {
    console.log('\n未收到命令行参数');
}

// 生成示例输出
const result = {
    status: 'success',
    message: 'Node.js 脚本执行成功',
    timestamp: new Date().toISOString(),
    args: args,
    environment: {
        nodeVersion: process.version,
        platform: os.platform(),
        arch: os.arch()
    }
};

console.log('\n执行结果:');
console.log(JSON.stringify(result, null, 2));

console.log('\n脚本执行完成！');
