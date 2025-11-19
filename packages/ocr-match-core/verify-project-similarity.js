#!/usr/bin/env node
/**
 * projectFieldSimilarity 逻辑验证
 * 检查权重计算和边界条件
 */

// 内联实现（简化版，用于验证逻辑）
function levenshtein(s1, s2) {
  const len1 = s1.length, len2 = s2.length;
  const dp = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) dp[i][0] = i;
  for (let j = 0; j <= len2; j++) dp[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (s1[i-1] === s2[j-1]) {
        dp[i][j] = dp[i-1][j-1];
      } else {
        dp[i][j] = Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) + 1;
      }
    }
  }

  const dist = dp[len1][len2];
  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1.0 : 1 - dist / maxLen;
}

function jaccard(s1, s2, n = 2) {
  const tokenize = (s, n) => {
    const tokens = [];
    for (let i = 0; i <= s.length - n; i++) {
      tokens.push(s.slice(i, i + n));
    }
    return tokens;
  };

  const t1 = new Set(tokenize(s1, n));
  const t2 = new Set(tokenize(s2, n));

  const intersection = [...t1].filter(t => t2.has(t)).length;
  const union = t1.size + t2.size - intersection;

  return union === 0 ? 1.0 : intersection / union;
}

function lcsRatio(s1, s2) {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const len1 = s1.length, len2 = s2.length;
  let maxLen = 0;
  const dp = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

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

function fieldSimilarity(s1, s2) {
  const lev = levenshtein(s1, s2);
  const jac = jaccard(s1, s2, 2);
  return 0.5 * lev + 0.5 * jac;
}

function projectFieldSimilarity(s1, s2) {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const lev = levenshtein(s1, s2);
  const jac = jaccard(s1, s2, 2);
  const lcs = lcsRatio(s1, s2);

  return 0.2 * lev + 0.4 * jac + 0.4 * lcs;
}

console.log('=== projectFieldSimilarity 逻辑验证 ===\n');

const tests = [
  {
    name: '完全匹配（无回归）',
    s1: '武汉市轨道交通19号线工程',
    s2: '武汉市轨道交通19号线工程',
    expectExact: true
  },
  {
    name: '不完整 OCR（新算法应更高）',
    s1: '居住、社会福利项目',
    s2: '居住、社会福利项目（光谷P（2023）028地块',
    expectHigher: true,
    minNewScore: 0.75
  },
  {
    name: 'DB 额外信息',
    s1: '大桥现代产业园',
    s2: '大桥现代产业园（武汉江夏）',
    expectHigher: true
  }
];

let passed = 0;
tests.forEach(test => {
  const oldScore = fieldSimilarity(test.s1, test.s2);
  const newScore = projectFieldSimilarity(test.s1, test.s2);

  let success = true;
  let reason = '';

  if (test.expectExact) {
    success = Math.abs(newScore - 1.0) < 0.001;
    reason = `期望 1.0，实际 ${newScore.toFixed(3)}`;
  } else if (test.expectHigher) {
    success = newScore > oldScore;
    reason = `新 ${newScore.toFixed(3)} ${success ? '>' : '≤'} 旧 ${oldScore.toFixed(3)}`;

    if (test.minNewScore && newScore < test.minNewScore) {
      success = false;
      reason += ` (低于目标 ${test.minNewScore})`;
    }
  }

  console.log(`${success ? '✅' : '❌'} ${test.name}`);
  console.log(`  ${reason}`);
  console.log('');

  if (success) passed++;
});

console.log(`${passed}/${tests.length} 通过`);
process.exit(passed === tests.length ? 0 : 1);
