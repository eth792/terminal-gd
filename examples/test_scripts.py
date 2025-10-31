#!/usr/bin/env python3
"""
快速测试脚本 - 验证Python脚本执行是否正常
"""

import json
import time

print("=" * 50)
print("步骤1: OCR识别测试")
print("=" * 50)

# 模拟OCR识别结果
ocr_result = {
    "documentType": "收货单",
    "documentNumber": "SH20241021001",
    "date": "2024-10-21",
    "supplier": "上海电力设备有限公司",
    "items": [
        {"name": "变压器配件", "quantity": 5, "unit": "套", "price": 12500.00},
        {"name": "绝缘子", "quantity": 100, "unit": "个", "price": 85.50},
        {"name": "电缆终端头", "quantity": 20, "unit": "个", "price": 320.00}
    ],
    "totalAmount": 69550.00
}

print("OCR识别完成: {} 个条目".format(len(ocr_result['items'])))
print(json.dumps(ocr_result, ensure_ascii=False, indent=2))

print("\n" + "=" * 50)
print("步骤2: 数据处理测试")
print("=" * 50)

# 模拟原始OCR数据
raw_data = ocr_result

# 数据清理和结构化
processed_data = {
    "header": {
        "documentType": "RECEIPT",
        "documentNumber": raw_data["documentNumber"],
        "supplier": raw_data["supplier"]
    },
    "items": [],
    "summary": {"totalItems": len(raw_data["items"])}
}

for idx, item in enumerate(raw_data["items"], 1):
    processed_data["items"].append({
        "lineNumber": idx,
        "materialName": item["name"],
        "quantity": item["quantity"],
        "unit": item["unit"]
    })

print("数据处理完成，处理了 {} 个条目".format(len(processed_data["items"])))
print(json.dumps(processed_data, ensure_ascii=False, indent=2))

print("\n" + "=" * 50)
print("步骤3: 自动填报测试")
print("=" * 50)

# 模拟系统配置
config = {
    "targetSystem": "erp",
    "loginUrl": "https://erp.company.com/login"
}

# 模拟自动填报流程
print("正在连接到系统: {}".format(config["loginUrl"]))
time.sleep(0.3)

print("正在登录系统...")
time.sleep(0.3)

print("正在填写单据: {}".format(processed_data["header"]["documentNumber"]))
time.sleep(0.3)

for item in processed_data["items"]:
    print("填写第 {} 行: {} - 数量 {}".format(
        item["lineNumber"],
        item["materialName"],
        item["quantity"]
    ))
    time.sleep(0.2)

# 模拟提交结果
result = {
    "success": True,
    "receiptNumber": "GR2024102100156",
    "itemsProcessed": len(processed_data["items"])
}

print("\n填报完成！")
print(json.dumps(result, ensure_ascii=False, indent=2))

print("\n" + "=" * 50)
print("所有测试通过! ✓")
print("=" * 50)
