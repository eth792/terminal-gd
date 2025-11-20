#!/bin/bash
# 傻瓜式业务表格匹配脚本
# 默认列名：供应商、工程名称
# 自定义列名：通过参数传入

set -e

# ========== 颜色定义 ==========
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ========== 默认配置 ==========
DEFAULT_SUPPLIER_COL="供应商"
DEFAULT_PROJECT_COL="工程名称"
DEFAULT_INDEX="data/index.json"
DEFAULT_DB="data/db"
DEFAULT_OUT_DIR="data"

# ========== 帮助信息 ==========
show_help() {
    echo -e "${BLUE}=== 业务表格匹配脚本 ===${NC}"
    echo ""
    echo "用法："
    echo "  $0 <输入文件> [选项]"
    echo ""
    echo "示例："
    echo "  # 基础用法（默认列名：供应商、工程名称）"
    echo "  $0 orders.xlsx"
    echo ""
    echo "  # 自定义列名"
    echo "  $0 orders.xlsx --supplier-col \"供应商名称\" --project-col \"工程项目\""
    echo ""
    echo "  # 指定 Excel sheet"
    echo "  $0 orders.xlsx --sheet \"订单数据\""
    echo ""
    echo "  # 完整参数"
    echo "  $0 orders.xlsx \\"
    echo "      --supplier-col \"供应商名称\" \\"
    echo "      --project-col \"工程项目\" \\"
    echo "      --sheet \"订单数据\" \\"
    echo "      --out results.csv"
    echo ""
    echo "参数说明："
    echo "  --supplier-col <列名>   供应商列名（默认：供应商）"
    echo "  --project-col <列名>    工程名称列名（默认：工程名称）"
    echo "  --sheet <sheet名>       Excel sheet 名称（默认：第一个 sheet）"
    echo "  --out <输出文件>         输出文件路径（默认：data/matched_<时间戳>.csv）"
    echo "  --index <索引路径>      索引文件路径（默认：data/index.json）"
    echo "  --db <DB路径>           DB 文件路径（默认：data/db）"
    echo "  --include-top3          输出 Top3 候选"
    echo "  --autoPass <阈值>       自动通过阈值（默认：0.75）"
    echo "  --help, -h              显示此帮助信息"
    echo ""
}

# ========== 参数解析 ==========
INPUT_FILE=""
SUPPLIER_COL="$DEFAULT_SUPPLIER_COL"
PROJECT_COL="$DEFAULT_PROJECT_COL"
SHEET=""
OUT_FILE=""
INDEX_PATH="$DEFAULT_INDEX"
DB_PATH="$DEFAULT_DB"
INCLUDE_TOP3=""
AUTO_PASS=""
EXTRA_ARGS=""
SKIP_CONFIRM=false

# 第一个参数必须是输入文件
if [ $# -eq 0 ]; then
    show_help
    exit 1
fi

if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
    show_help
    exit 0
fi

INPUT_FILE="$1"
shift

# 解析剩余参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --supplier-col)
            SUPPLIER_COL="$2"
            shift 2
            ;;
        --project-col)
            PROJECT_COL="$2"
            shift 2
            ;;
        --sheet)
            SHEET="$2"
            shift 2
            ;;
        --out)
            OUT_FILE="$2"
            shift 2
            ;;
        --index)
            INDEX_PATH="$2"
            shift 2
            ;;
        --db)
            DB_PATH="$2"
            shift 2
            ;;
        --include-top3)
            INCLUDE_TOP3="--include-top3"
            shift
            ;;
        --autoPass)
            AUTO_PASS="--autoPass $2"
            shift 2
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        --yes|-y)
            SKIP_CONFIRM=true
            shift
            ;;
        *)
            # 未知参数传递给底层 CLI
            EXTRA_ARGS="$EXTRA_ARGS $1"
            shift
            ;;
    esac
done

# ========== 验证输入文件 ==========
if [ ! -f "$INPUT_FILE" ]; then
    echo -e "${RED}❌ 错误：输入文件不存在: $INPUT_FILE${NC}"
    exit 1
fi

# ========== 生成输出文件名 ==========
if [ -z "$OUT_FILE" ]; then
    # 默认输出文件：data/matched_<时间戳>.csv
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    OUT_FILE="${DEFAULT_OUT_DIR}/matched_${TIMESTAMP}.csv"
fi

# 确保输出目录存在
OUT_DIR=$(dirname "$OUT_FILE")
mkdir -p "$OUT_DIR"

# ========== 打印执行信息 ==========
echo -e "${BLUE}=== 业务表格匹配 ===${NC}"
echo ""
echo -e "${GREEN}输入文件：${NC}$INPUT_FILE"
echo -e "${GREEN}供应商列：${NC}$SUPPLIER_COL"
echo -e "${GREEN}工程列：  ${NC}$PROJECT_COL"
if [ -n "$SHEET" ]; then
    echo -e "${GREEN}Excel Sheet：${NC}$SHEET"
fi
echo -e "${GREEN}索引路径：${NC}$INDEX_PATH"
echo -e "${GREEN}DB 路径： ${NC}$DB_PATH"
echo -e "${GREEN}输出文件：${NC}$OUT_FILE"
echo ""

# ========== 检查列名（智能提示）==========
echo -e "${YELLOW}正在检查输入文件的列名...${NC}"

# 使用简单的脚本读取 CSV/Excel 的第一行（列名）
if [[ "$INPUT_FILE" == *.csv ]]; then
    # CSV 文件：读取第一行
    COLUMNS=$(head -n 1 "$INPUT_FILE")
    echo -e "${BLUE}检测到的列名：${NC}"
    echo "$COLUMNS" | tr ',' '\n' | nl
elif [[ "$INPUT_FILE" == *.xlsx ]] || [[ "$INPUT_FILE" == *.xls ]]; then
    # Excel 文件：提示用户确认
    echo -e "${YELLOW}Excel 文件，无法自动检测列名${NC}"
    echo -e "${YELLOW}如果列名不匹配，请使用 --supplier-col 和 --project-col 参数${NC}"
fi

if [ "$SKIP_CONFIRM" = false ]; then
    echo ""
    echo -e "${YELLOW}如果列名不匹配，按 Ctrl+C 取消，然后重新运行：${NC}"
    echo -e "  pnpm match-table $INPUT_FILE --supplier-col \"实际列名\" --project-col \"实际列名\""
    echo ""
    echo -e "${GREEN}按回车继续...${NC}"
    read -r
fi

# ========== 构建命令 ==========
# 获取脚本所在目录的父目录（即项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 将所有相对路径转换为绝对路径
if [[ "$INPUT_FILE" != /* ]]; then
    INPUT_FILE="$PROJECT_ROOT/$INPUT_FILE"
fi
if [[ "$INDEX_PATH" != /* ]]; then
    INDEX_PATH="$PROJECT_ROOT/$INDEX_PATH"
fi
if [[ "$DB_PATH" != /* ]]; then
    DB_PATH="$PROJECT_ROOT/$DB_PATH"
fi
if [[ "$OUT_FILE" != /* ]]; then
    OUT_FILE="$PROJECT_ROOT/$OUT_FILE"
fi

CMD="pnpm -F ./packages/ocr-match-core exec node dist/cli/match-table.js"
CMD="$CMD --input \"$INPUT_FILE\""
CMD="$CMD --supplier-col \"$SUPPLIER_COL\""
CMD="$CMD --project-col \"$PROJECT_COL\""
CMD="$CMD --index \"$INDEX_PATH\""
CMD="$CMD --db \"$DB_PATH\""
CMD="$CMD --out \"$OUT_FILE\""
CMD="$CMD --config \"$PROJECT_ROOT\""

if [ -n "$SHEET" ]; then
    CMD="$CMD --sheet \"$SHEET\""
fi

if [ -n "$INCLUDE_TOP3" ]; then
    CMD="$CMD $INCLUDE_TOP3"
fi

if [ -n "$AUTO_PASS" ]; then
    CMD="$CMD $AUTO_PASS"
fi

if [ -n "$EXTRA_ARGS" ]; then
    CMD="$CMD $EXTRA_ARGS"
fi

# ========== 执行匹配 ==========
echo -e "${BLUE}=== 开始执行匹配 ===${NC}"
echo ""
echo -e "${YELLOW}执行命令：${NC}"
echo "$CMD"
echo ""

eval "$CMD"

EXIT_CODE=$?

# ========== 执行结果 ==========
echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ 匹配完成！${NC}"
    echo ""
    echo -e "${GREEN}输出文件：${NC}$OUT_FILE"
    echo ""
    echo -e "${BLUE}查看结果：${NC}"
    echo "  cat \"$OUT_FILE\""
    echo "  open \"$OUT_FILE\"  # macOS"
    echo ""

    # 显示前 5 行
    if [ -f "$OUT_FILE" ]; then
        echo -e "${BLUE}前 5 行预览：${NC}"
        head -n 5 "$OUT_FILE"
    fi
else
    echo -e "${RED}❌ 匹配失败，退出码：$EXIT_CODE${NC}"
    exit $EXIT_CODE
fi
