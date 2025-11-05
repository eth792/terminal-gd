#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试脚本 - Python Hello World
"""

import sys
import json
from datetime import datetime

def main():
    print("=" * 50)
    print("Python 脚本执行测试")
    print("=" * 50)

    # 打印基本信息
    print(f"执行时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Python 版本: {sys.version}")
    print(f"命令行参数: {sys.argv[1:]}")

    # 处理命令行参数
    if len(sys.argv) > 1:
        print(f"\n收到 {len(sys.argv) - 1} 个参数:")
        for i, arg in enumerate(sys.argv[1:], 1):
            print(f"  参数 {i}: {arg}")

    # 生成示例输出
    result = {
        "status": "success",
        "message": "Python 脚本执行成功",
        "timestamp": datetime.now().isoformat(),
        "args": sys.argv[1:] if len(sys.argv) > 1 else []
    }

    print("\n执行结果:")
    print(json.dumps(result, ensure_ascii=False, indent=2))

    print("\n脚本执行完成！")

if __name__ == "__main__":
    main()
