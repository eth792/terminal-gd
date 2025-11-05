#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据处理示例脚本
用于演示收发货流程中的数据清理和结构化功能
"""

import json
import sys
from datetime import datetime

def process_ocr_data(raw_data):
    """
    处理OCR原始数据，进行清理和结构化
    """
    print("开始处理OCR数据...")

    # 数据验证
    required_fields = ['documentType', 'documentNumber', 'date', 'supplier', 'items']
    for field in required_fields:
        if field not in raw_data:
            raise ValueError(f"缺少必需字段: {field}")

    print(f"✓ 数据验证通过，包含所有必需字段")

    # 构建结构化数据
    processed_data = {
        "header": {
            "documentType": "RECEIPT",
            "documentNumber": raw_data["documentNumber"],
            "transactionDate": raw_data["date"],
            "supplierName": raw_data["supplier"],
            "processedAt": datetime.now().isoformat()
        },
        "items": [],
        "summary": {
            "totalItems": len(raw_data["items"]),
            "totalQuantity": 0,
            "totalAmount": 0.0
        }
    }

    # 处理每个条目
    print(f"\n处理 {len(raw_data['items'])} 个物料条目:")
    for idx, item in enumerate(raw_data["items"], 1):
        # 数据标准化
        standardized_item = {
            "lineNumber": idx,
            "materialName": item["name"],
            "quantity": float(item["quantity"]),
            "unit": item["unit"],
            "unitPrice": float(item.get("price", 0)),
            "totalPrice": float(item["quantity"]) * float(item.get("price", 0))
        }

        processed_data["items"].append(standardized_item)
        processed_data["summary"]["totalQuantity"] += standardized_item["quantity"]
        processed_data["summary"]["totalAmount"] += standardized_item["totalPrice"]

        print(f"  {idx}. {item['name']} - 数量: {item['quantity']} {item['unit']}")

    print(f"\n✓ 数据处理完成")
    print(f"  总条目数: {processed_data['summary']['totalItems']}")
    print(f"  总数量: {processed_data['summary']['totalQuantity']}")
    print(f"  总金额: ¥{processed_data['summary']['totalAmount']:.2f}")

    return processed_data

def main():
    print("=" * 60)
    print("数据处理脚本 - 收发货数据清理和结构化")
    print("=" * 60)

    # 模拟OCR识别的原始数据
    raw_data = {
        "documentType": "收货单",
        "documentNumber": "SH20241031001",
        "date": "2024-10-31",
        "supplier": "上海电力设备有限公司",
        "items": [
            {"name": "变压器配件", "quantity": 5, "unit": "套", "price": 12500.00},
            {"name": "绝缘子", "quantity": 100, "unit": "个", "price": 85.50},
            {"name": "电缆终端头", "quantity": 20, "unit": "个", "price": 320.00},
            {"name": "高压开关", "quantity": 3, "unit": "台", "price": 8500.00}
        ]
    }

    print(f"\n原始OCR数据:")
    print(json.dumps(raw_data, ensure_ascii=False, indent=2))

    try:
        # 处理数据
        processed_data = process_ocr_data(raw_data)

        # 输出结果
        print("\n" + "=" * 60)
        print("处理后的结构化数据:")
        print("=" * 60)
        print(json.dumps(processed_data, ensure_ascii=False, indent=2))

        print("\n✅ 脚本执行成功！")
        return 0

    except Exception as e:
        print(f"\n❌ 错误: {e}")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
