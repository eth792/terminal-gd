#!/bin/bash

# 🚨 紧急回滚脚本
# v0.1.7 事故教训：三要素完整回滚
# 确保源码、构建、索引三重完整性

set -euo pipefail  # 严格模式：任何错误立即退出

echo "🚨 Starting emergency rollback..."
echo "   Reason: Following v0.1.7 disaster lessons"
echo ""

# 预检：检查必要环境
check_prerequisites() {
    echo "📋 Pre-flight checks..."

    if ! command -v git &> /dev/null; then
        echo "❌ Error: git not found"
        exit 1
    fi

    if ! command -v pnpm &> /dev/null; then
        echo "❌ Error: pnpm not found"
        exit 1
    fi

    if [[ ! -d "packages/ocr-match-core/src" ]]; then
        echo "❌ Error: source directory not found"
        exit 1
    fi

    echo "✅ Prerequisites check passed"
    echo ""
}

# 第一要素：源代码回滚
rollback_source() {
    echo "🔄 Phase 1/3: Rolling back source code..."

    git restore packages/ocr-match-core/src/ 2>/dev/null || {
        echo "❌ Error: Failed to restore source code"
        exit 1
    }

    git restore configs/ 2>/dev/null || {
        echo "❌ Error: Failed to restore configs"
        exit 1
    }

    echo "✅ Source code rolled back"
    echo ""
}

# 第二要素：重新构建
rebuild_package() {
    echo "🔄 Phase 2/3: Rebuilding package..."

    pnpm -F ./packages/ocr-match-core build || {
        echo "❌ Error: Build failed"
        exit 1
    }

    if [[ ! -d "packages/ocr-match-core/dist" ]]; then
        echo "❌ Error: dist directory not created"
        exit 1
    fi

    echo "✅ Package rebuilt successfully"
    echo ""
}

# 第三要素：重建索引（防止 v0.1.7 式索引损坏）
rebuild_index() {
    echo "🔄 Phase 3/3: Rebuilding search index..."

    # 创建临时运行目录
    mkdir -p runs/tmp

    # 检查数据库是否存在
    if [[ ! -d "data/db" ]]; then
        echo "⚠️  Warning: database directory not found, skipping index rebuild"
        echo "   If you need index, run manually:"
        echo "   node packages/ocr-match-core/dist/cli/build-index.js \\"
        echo "     --db data/db \\"
        echo "     --out runs/tmp/index.json \\"
        echo "     --config . \\"
        echo "     --field1 \"供应单位名称\" \\"
        echo "     --field2 \"单体工程名称\""
        echo ""
        return 0
    fi

    # 重建索引
    node packages/ocr-match-core/dist/cli/build-index.js \
        --db data/db \
        --out runs/tmp/index.json \
        --config . \
        --field1 "供应单位名称" \
        --field2 "单体工程名称" || {
        echo "❌ Error: Index rebuild failed"
        exit 1
    }

    # 验证索引完整性
    if [[ ! -f "runs/tmp/index.json" ]]; then
        echo "❌ Error: Index file not created"
        exit 1
    fi

    node -e "
    const index = require('./runs/tmp/index.json');
    if (!index.rows || !index.total_rows || !index.digest) {
        console.error('❌ Error: Index file corrupted - missing required fields');
        console.error('Available fields:', Object.keys(index).join(', '));
        process.exit(1);
    }
    console.log('✅ Index verification passed');
    " || {
        echo "❌ Error: Index verification failed"
        exit 1
    }

    echo "✅ Search index rebuilt and verified"
    echo ""
}

# 主执行流程
main() {
    echo "════════════════════════════════════════"
    echo "   EMERGENCY ROLLBACK (v0.1.7 Style)"
    echo "════════════════════════════════════════"
    echo ""

    check_prerequisites
    rollback_source
    rebuild_package
    rebuild_index

    echo "════════════════════════════════════════"
    echo "✅ ROLLBACK COMPLETE - Safe to test"
    echo "════════════════════════════════════════"
    echo ""
    echo "Next steps:"
    echo "  1. Run single test to verify stability"
    echo "  2. If test passes, analyze what went wrong"
    echo "  3. Apply ONE fix at a time"
    echo ""
}

# 执行主流程
main "$@"
