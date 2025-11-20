#!/bin/bash
# 测试 match-table CLI 命令
# 使用示例数据验证功能

set -e

echo "=== Testing match-table CLI ==="
echo ""

# 检查是否存在测试数据
if [ ! -f "data/index.json" ]; then
    echo "❌ Index file not found: data/index.json"
    echo "   Please run 'pnpm ocr-build-index' first"
    exit 1
fi

# 创建测试 CSV（如果不存在）
TEST_INPUT="data/test_orders.csv"
if [ ! -f "$TEST_INPUT" ]; then
    echo "Creating sample test input: $TEST_INPUT"
    cat > "$TEST_INPUT" << 'EOF'
供应商名称,工程项目,金额,备注
北京四方继保工程技术有限公司,武汉长江中心B2地块配电工程,500万,测试数据
安德利集团有限公司,钟家村片老旧小区改造工程,300万,测试数据
EOF
    echo "✓ Test input created"
    echo ""
fi

# 运行 match-table
echo "Running match-table..."
pnpm -F ./packages/ocr-match-core exec node dist/cli/match-table.js \
  --input "$TEST_INPUT" \
  --supplier-col "供应商名称" \
  --project-col "工程项目" \
  --index data/index.json \
  --out runs/test_matched_orders.csv \
  --config . \
  --log-level info

echo ""
echo "=== Test completed ==="
echo "Output: runs/test_matched_orders.csv"
echo ""
echo "To view results:"
echo "  cat runs/test_matched_orders.csv"
