#!/usr/bin/env node
/**
 * LCS Ratio 快速验证
 * 直接内联实现进行验证
 */

// 内联 lcsRatio 实现（用于验证）
function lcsRatio(s1, s2) {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const len1 = s1.length;
  const len2 = s2.length;

  let maxLen = 0;
  const dp = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        maxLen = Math.max(maxLen, dp[i][j]);
      }
    }
  }

  const maxPossible = Math.max(len1, len2);
  return maxPossible === 0 ? 1.0 : maxLen / maxPossible;
}

console.log('=== LCS Ratio 快速验证 ===\n');

const tests = [
  ['完全匹配', 'ABC', 'ABC', 1.0, '==='],
  ['子串匹配', '新荣TOD项目', '新荣TOD项目一期', 0.75, '>='],
  ['DB额外信息', '大桥现代产业园', '大桥现代产业园（武汉江夏）', 0.5, '>='],  // 7/13=0.538
  ['完全不同', 'ABC', 'XYZ', 0.0, '==='],
  ['空字符串', '', 'ABC', 0.0, '==='],
  ['两空字符串', '', '', 1.0, '==='],
];

let passed = 0;
tests.forEach(([name, s1, s2, expected, op]) => {
  const actual = lcsRatio(s1, s2);
  const success = op === '===' ? Math.abs(actual - expected) < 0.001 : actual >= expected;
  console.log(`${success ? '✅' : '❌'} ${name}: ${actual.toFixed(3)} ${op} ${expected}`);
  if (success) passed++;
});

console.log(`\n${passed}/${tests.length} 通过`);
process.exit(passed === tests.length ? 0 : 1);
