#!/bin/bash
set -e

# .gitignore 选择性跟踪规则验证测试
# 测试 .spec-workflow/ 目录的 git 跟踪规则是否正确配置

echo ""
echo "🧪 .gitignore 选择性跟踪规则测试"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 测试结果计数器
PASSED=0
FAILED=0

# Cleanup 函数（使用 trap 确保即使测试失败也会清理）
cleanup() {
  echo ""
  echo "🧹 清理测试文件..."
  rm -rf .spec-workflow/specs/test-gitignore-spec 2>/dev/null || true
  rm -rf .spec-workflow/approvals/test-gitignore-approval 2>/dev/null || true
  echo "  ✓ 清理完成"
}

trap cleanup EXIT

# ============================================================================
# Test 1: specs/ 目录下的文件应该被跟踪
# ============================================================================
echo "Test 1: specs/ 目录下的文件应该被跟踪"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 创建测试文件
mkdir -p .spec-workflow/specs/test-gitignore-spec
echo "test content" > .spec-workflow/specs/test-gitignore-spec/test.md

# 尝试暂存文件
git add .spec-workflow/specs/test-gitignore-spec/test.md 2>/dev/null || true

# 检查文件是否被 git 跟踪（未被忽略）
if git ls-files --error-unmatch .spec-workflow/specs/test-gitignore-spec/test.md &>/dev/null; then
  echo "✅ PASS: specs/ 目录下的文件被 git 跟踪（未被 .gitignore 排除）"
  PASSED=$((PASSED + 1))
else
  echo "❌ FAIL: specs/ 目录下的文件被 .gitignore 排除了（应该被跟踪）"
  FAILED=$((FAILED + 1))
fi

# 取消暂存（清理）
git reset HEAD .spec-workflow/specs/test-gitignore-spec/test.md &>/dev/null || true

echo ""

# ============================================================================
# Test 2: approvals/ 目录下的文件应该被排除
# ============================================================================
echo "Test 2: approvals/ 目录下的文件应该被排除"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 创建测试文件
mkdir -p .spec-workflow/approvals/test-gitignore-approval
echo "approval content" > .spec-workflow/approvals/test-gitignore-approval/approval.json

# 尝试暂存文件
git add .spec-workflow/approvals/test-gitignore-approval/approval.json 2>/dev/null || true

# 检查文件是否被 git 忽略
if git ls-files --error-unmatch .spec-workflow/approvals/test-gitignore-approval/approval.json &>/dev/null; then
  echo "❌ FAIL: approvals/ 目录下的文件被 git 跟踪了（应该被 .gitignore 排除）"
  FAILED=$((FAILED + 1))
else
  echo "✅ PASS: approvals/ 目录下的文件被 .gitignore 正确排除"
  PASSED=$((PASSED + 1))
fi

echo ""

# ============================================================================
# Test 3: *.backup 文件应该被排除
# ============================================================================
echo "Test 3: *.backup 文件应该被排除"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 创建测试文件
echo "backup content" > .spec-workflow/specs/test-gitignore-spec/test.md.backup

# 尝试暂存文件
git add .spec-workflow/specs/test-gitignore-spec/test.md.backup 2>/dev/null || true

# 检查文件是否被 git 忽略
if git ls-files --error-unmatch .spec-workflow/specs/test-gitignore-spec/test.md.backup &>/dev/null; then
  echo "❌ FAIL: *.backup 文件被 git 跟踪了（应该被 .gitignore 排除）"
  FAILED=$((FAILED + 1))
else
  echo "✅ PASS: *.backup 文件被 .gitignore 正确排除"
  PASSED=$((PASSED + 1))
fi

echo ""

# ============================================================================
# 测试总结
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "测试结果总结"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ 通过: $PASSED/3"
echo "  ❌ 失败: $FAILED/3"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "🎉 所有测试通过！.gitignore 规则配置正确。"
  exit 0
else
  echo "⚠️  部分测试失败，请检查 .gitignore 配置。"
  exit 1
fi
