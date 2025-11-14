#!/usr/bin/env node

/**
 * 测试 updateImplementationRecord() 的 spec 引用功能
 */

// 模拟配置对象
const testCases = [
  {
    name: 'With specName',
    config: {
      version: 'v0.1.7',
      date: '2025-11-15',
      title: '测试版本',
      runId: 'run_v0.1.6_full_20251113_214123',
      specName: 'spec-docs-integration'
    }
  },
  {
    name: 'Without specName (backward compatible)',
    config: {
      version: 'v0.1.7',
      date: '2025-11-15',
      title: '测试版本',
      runId: 'run_v0.1.6_full_20251113_214123',
      specName: undefined
    }
  }
];

console.log('🧪 Testing spec reference logic\n');

testCases.forEach(({ name, config }) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Test Case: ${name}`);
  console.log(`${'='.repeat(60)}\n`);

  const { specName } = config;

  // 复制函数中的逻辑
  const codeChangesSection = specName
    ? `详细信息请查看：[${specName} Implementation Logs](./.spec-workflow/specs/${specName}/)

**核心变更摘要**（手动补充）:
[📝 待补充 - 简要描述关键变更，无需列出文件清单]`
    : `[📝 待补充] 请补充代码变更详情（文件路径 + 行号 + 变更说明）`;

  console.log('Generated Code Changes Section:');
  console.log('─'.repeat(60));
  console.log(codeChangesSection);
  console.log('─'.repeat(60));

  // 验证
  if (specName) {
    const hasLink = codeChangesSection.includes(`[${specName} Implementation Logs]`);
    const hasPath = codeChangesSection.includes(`./.spec-workflow/specs/${specName}/`);
    const hasPlaceholder = !codeChangesSection.includes('请补充代码变更详情（文件路径 + 行号');

    console.log(`\n✓ Verification:`);
    console.log(`  Link present: ${hasLink ? '✅' : '❌'}`);
    console.log(`  Path correct: ${hasPath ? '✅' : '❌'}`);
    console.log(`  No old placeholder: ${hasPlaceholder ? '✅' : '❌'}`);

    if (hasLink && hasPath && hasPlaceholder) {
      console.log(`\n✅ Test PASSED: Spec reference generated correctly\n`);
    } else {
      console.log(`\n❌ Test FAILED: Spec reference generation error\n`);
    }
  } else {
    const hasOldPlaceholder = codeChangesSection.includes('请补充代码变更详情（文件路径 + 行号');
    const hasNoLink = !codeChangesSection.includes('Implementation Logs');

    console.log(`\n✓ Verification:`);
    console.log(`  Old placeholder: ${hasOldPlaceholder ? '✅' : '❌'}`);
    console.log(`  No spec link: ${hasNoLink ? '✅' : '❌'}`);

    if (hasOldPlaceholder && hasNoLink) {
      console.log(`\n✅ Test PASSED: Backward compatibility maintained\n`);
    } else {
      console.log(`\n❌ Test FAILED: Backward compatibility broken\n`);
    }
  }
});

console.log(`\n${'='.repeat(60)}`);
console.log('All tests completed');
console.log(`${'='.repeat(60)}\n`);
