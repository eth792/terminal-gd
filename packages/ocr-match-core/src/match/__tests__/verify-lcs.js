/**
 * LCS Ratio 验证脚本
 * 用于手工验证 lcsRatio() 函数的正确性
 *
 * 运行方式：node verify-lcs.js
 */

import { lcsRatio } from '../similarity.js';

console.log('=== LCS Ratio 验证测试 ===\n');

const tests = [
  {
    name: '完全匹配',
    s1: 'ABC',
    s2: 'ABC',
    expected: 1.0,
    operator: '==='
  },
  {
    name: '子串匹配（OCR 不完整）',
    s1: '新荣TOD项目',
    s2: '新荣TOD项目一期',
    expected: 0.75,
    operator: '>='
  },
  {
    name: 'DB 额外信息（括号）',
    s1: '大桥现代产业园',
    s2: '大桥现代产业园（武汉江夏）',
    expected: 0.7,
    operator: '>='
  },
  {
    name: '完全不同',
    s1: 'ABC',
    s2: 'XYZ',
    expected: 0.0,
    operator: '==='
  },
  {
    name: '空字符串（s1）',
    s1: '',
    s2: 'ABC',
    expected: 0.0,
    operator: '==='
  },
  {
    name: '空字符串（s2）',
    s1: 'ABC',
    s2: '',
    expected: 0.0,
    operator: '==='
  },
  {
    name: '两个空字符串',
    s1: '',
    s2: '',
    expected: 1.0,
    operator: '==='
  },
  {
    name: '长度差异（光谷项目）',
    s1: '居住、社会福利项目',
    s2: '居住、社会福利项目（光谷P（2023）028地块',
    expected: 0.5,
    operator: '>='
  }
];

let passed = 0;
let failed = 0;

tests.forEach(test => {
  const actual = lcsRatio(test.s1, test.s2);
  let success = false;

  switch (test.operator) {
    case '===':
      success = Math.abs(actual - test.expected) < 0.001;
      break;
    case '>=':
      success = actual >= test.expected;
      break;
    case '<=':
      success = actual <= test.expected;
      break;
  }

  const status = success ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} | ${test.name}`);
  console.log(`  s1: "${test.s1}"`);
  console.log(`  s2: "${test.s2}"`);
  console.log(`  期望: ${test.operator} ${test.expected}`);
  console.log(`  实际: ${actual.toFixed(3)}`);
  console.log('');

  if (success) {
    passed++;
  } else {
    failed++;
  }
});

console.log('=== 测试总结 ===');
console.log(`✅ 通过: ${passed}/${tests.length}`);
console.log(`❌ 失败: ${failed}/${tests.length}`);

if (failed === 0) {
  console.log('\n🎉 所有测试通过！lcsRatio() 实现正确。');
  process.exit(0);
} else {
  console.log('\n⚠️ 部分测试失败，请检查实现。');
  process.exit(1);
}
