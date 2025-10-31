#!/usr/bin/env python3
"""
收发货自动化演示脚本
模拟完整的收发货流程：扫描 -> 数据处理 -> 填报
"""

import json
import time
import sys
from datetime import datetime

def step1_scan_document():
    """步骤1: 模拟文档扫描和OCR识别"""
    print("=" * 60)
    print("步骤1: 扫描纸张并进行OCR识别")
    print("=" * 60)

    print("[INFO] 正在初始化扫描器...")
    time.sleep(1)

    print("[INFO] 检测到纸张文档，准备扫描...")
    time.sleep(0.5)

    print("[INFO] 正在扫描第 1 页 (分辨率: 300 DPI)...")
    time.sleep(1.5)

    print("[INFO] 正在预处理图像（降噪、纠偏、二值化）...")
    time.sleep(1)

    print("[INFO] 正在执行 OCR 识别 (引擎: Tesseract, 语言: chi_sim+eng)...")
    time.sleep(2)

    # 模拟OCR识别结果
    ocr_result = {
        "documentType": "收货单",
        "documentNumber": "SH20241021001",
        "date": "2024-10-21",
        "supplier": "上海电力设备有限公司",
        "supplierCode": "SP001234",
        "warehouse": "主仓库",
        "warehouseCode": "WH001",
        "items": [
            {
                "name": "变压器配件",
                "specification": "110KV级",
                "quantity": 5,
                "unit": "套",
                "unitPrice": 12500.00,
                "totalPrice": 62500.00
            },
            {
                "name": "绝缘子",
                "specification": "XWP-70",
                "quantity": 100,
                "unit": "个",
                "unitPrice": 85.50,
                "totalPrice": 8550.00
            },
            {
                "name": "电缆终端头",
                "specification": "10KV",
                "quantity": 20,
                "unit": "个",
                "unitPrice": 320.00,
                "totalPrice": 6400.00
            }
        ],
        "totalAmount": 77450.00,
        "operator": "张三",
        "remarks": "紧急入库"
    }

    print(f"[SUCCESS] OCR 识别完成！识别到 {len(ocr_result['items'])} 个物料条目")
    print(f"[INFO] 文档类型: {ocr_result['documentType']}")
    print(f"[INFO] 文档编号: {ocr_result['documentNumber']}")
    print(f"[INFO] 供应商: {ocr_result['supplier']}")
    print(f"[INFO] 总金额: ¥{ocr_result['totalAmount']:,.2f}")

    print("\n[DEBUG] OCR 识别原始数据:")
    print(json.dumps(ocr_result, ensure_ascii=False, indent=2))

    return ocr_result


def step2_clean_and_structure_data(raw_data):
    """步骤2: 数据清理和结构化"""
    print("\n" + "=" * 60)
    print("步骤2: 数据清理和结构化")
    print("=" * 60)

    print("[INFO] 正在加载业务规则配置...")
    time.sleep(0.8)

    print("[INFO] 正在验证数据完整性...")
    time.sleep(1)

    # 数据验证
    validation_checks = [
        "检查必填字段",
        "验证数据格式",
        "核对金额计算",
        "检查物料编码",
        "验证数量单位"
    ]

    for check in validation_checks:
        print(f"[INFO] {check}... ✓")
        time.sleep(0.3)

    print("[SUCCESS] 数据验证通过")

    print("[INFO] 正在执行数据标准化...")
    time.sleep(1)

    print("[INFO] 正在映射到目标系统字段...")
    time.sleep(1.2)

    # 构建结构化数据
    structured_data = {
        "header": {
            "documentType": "GOODS_RECEIPT",
            "documentNumber": raw_data["documentNumber"],
            "transactionDate": raw_data["date"],
            "supplierCode": raw_data.get("supplierCode", "UNKNOWN"),
            "supplierName": raw_data["supplier"],
            "warehouseCode": raw_data.get("warehouseCode", "WH001"),
            "warehouseName": raw_data.get("warehouse", "主仓库"),
            "operationType": "RECEIVE",
            "operator": raw_data.get("operator", "System"),
            "remarks": raw_data.get("remarks", ""),
            "createdAt": datetime.now().isoformat()
        },
        "items": [],
        "summary": {
            "totalItems": 0,
            "totalQuantity": 0.0,
            "totalAmount": 0.0,
            "currency": "CNY"
        }
    }

    # 处理物料明细
    print("[INFO] 正在处理物料明细数据...")
    for idx, item in enumerate(raw_data["items"], start=1):
        processed_item = {
            "lineNumber": idx,
            "materialCode": f"MAT{idx:04d}",  # 模拟物料编码
            "materialName": item["name"],
            "specification": item.get("specification", ""),
            "quantity": float(item["quantity"]),
            "unit": item["unit"].upper() if item["unit"] in ["套", "个"] else "PCS",
            "unitPrice": float(item["unitPrice"]),
            "totalPrice": float(item["totalPrice"]),
            "batchNumber": f"BATCH{datetime.now().strftime('%Y%m%d')}",
            "productionDate": datetime.now().strftime('%Y-%m-%d'),
            "expiryDate": "2026-12-31",
            "storageLocation": f"A-{idx:02d}-01"
        }
        structured_data["items"].append(processed_item)
        print(f"[INFO] 处理物料 {idx}/{len(raw_data['items'])}: {item['name']} - {item['quantity']}{item['unit']}")
        time.sleep(0.4)

    # 计算汇总信息
    structured_data["summary"]["totalItems"] = len(structured_data["items"])
    structured_data["summary"]["totalQuantity"] = sum(item["quantity"] for item in structured_data["items"])
    structured_data["summary"]["totalAmount"] = sum(item["totalPrice"] for item in structured_data["items"])

    print(f"[SUCCESS] 数据处理完成！")
    print(f"[INFO] 处理了 {structured_data['summary']['totalItems']} 个物料条目")
    print(f"[INFO] 总数量: {structured_data['summary']['totalQuantity']}")
    print(f"[INFO] 总金额: ¥{structured_data['summary']['totalAmount']:,.2f}")

    print("\n[DEBUG] 结构化数据:")
    print(json.dumps(structured_data, ensure_ascii=False, indent=2))

    return structured_data


def step3_auto_fill_system(structured_data):
    """步骤3: 自动填报到系统"""
    print("\n" + "=" * 60)
    print("步骤3: 执行自动填报")
    print("=" * 60)

    system_url = "https://erp.company.com/receiving"

    print(f"[INFO] 正在连接到目标系统: {system_url}")
    time.sleep(1.5)

    print("[INFO] 正在登录系统...")
    print("[INFO] 用户名: auto_user")
    time.sleep(1)

    print("[SUCCESS] 系统登录成功")

    print("[INFO] 正在打开收货单界面...")
    time.sleep(1)

    print("[INFO] 正在填写表头信息...")
    header_fields = [
        f"单据类型: {structured_data['header']['documentType']}",
        f"单据编号: {structured_data['header']['documentNumber']}",
        f"日期: {structured_data['header']['transactionDate']}",
        f"供应商: {structured_data['header']['supplierCode']} - {structured_data['header']['supplierName']}",
        f"仓库: {structured_data['header']['warehouseCode']} - {structured_data['header']['warehouseName']}"
    ]

    for field in header_fields:
        print(f"[INFO] 填写字段: {field}")
        time.sleep(0.5)

    print("[SUCCESS] 表头信息填写完成")

    # 填写物料明细
    print(f"\n[INFO] 正在填写物料明细 ({len(structured_data['items'])} 行)...")
    for item in structured_data["items"]:
        print(f"[INFO] 第 {item['lineNumber']} 行:")
        print(f"       - 物料: {item['materialCode']} - {item['materialName']}")
        print(f"       - 数量: {item['quantity']} {item['unit']}")
        print(f"       - 单价: ¥{item['unitPrice']:,.2f}")
        print(f"       - 金额: ¥{item['totalPrice']:,.2f}")
        print(f"       - 批号: {item['batchNumber']}")
        print(f"       - 库位: {item['storageLocation']}")
        time.sleep(1)

    print("[SUCCESS] 物料明细填写完成")

    # 数据验证
    print("\n[INFO] 正在验证填报数据...")
    verification_checks = [
        "检查必填字段完整性",
        "验证数值计算准确性",
        "核对库存容量限制",
        "检查供应商资质有效性",
        "验证审批流程配置"
    ]

    for check in verification_checks:
        print(f"[INFO] {check}...")
        time.sleep(0.4)

    print("[SUCCESS] 数据验证通过")

    # 提交单据
    print("\n[INFO] 正在提交收货单...")
    time.sleep(1.5)

    receipt_number = f"GR{datetime.now().strftime('%Y%m%d')}00156"
    print(f"[SUCCESS] 收货单提交成功！")
    print(f"[SUCCESS] 系统单号: {receipt_number}")

    # 生成执行报告
    print("\n[INFO] 正在生成执行报告...")
    time.sleep(0.8)

    execution_report = {
        "executionId": f"EXEC_{int(time.time())}",
        "executionTime": datetime.now().isoformat(),
        "sourceDocument": structured_data['header']['documentNumber'],
        "receiptNumber": receipt_number,
        "itemsProcessed": len(structured_data['items']),
        "totalAmount": structured_data['summary']['totalAmount'],
        "currency": "CNY",
        "status": "SUCCESS",
        "duration": "约 45 秒",
        "operator": "RPA_AUTO_SYSTEM",
        "remarks": "自动化流程执行成功"
    }

    print("\n" + "=" * 60)
    print("执行报告")
    print("=" * 60)
    print(json.dumps(execution_report, ensure_ascii=False, indent=2))

    return execution_report


def main():
    """主函数：执行完整的收发货自动化流程"""
    print("\n" + "#" * 60)
    print("# 收发货自动化流程演示")
    print("# 流程: 扫描纸张 -> 数据清理 -> 执行填报")
    print("#" * 60 + "\n")

    start_time = time.time()

    try:
        # 步骤1: 扫描和OCR识别
        ocr_data = step1_scan_document()

        # 步骤2: 数据清理和结构化
        structured_data = step2_clean_and_structure_data(ocr_data)

        # 步骤3: 自动填报
        report = step3_auto_fill_system(structured_data)

        # 总结
        elapsed_time = time.time() - start_time

        print("\n" + "=" * 60)
        print("流程执行完成")
        print("=" * 60)
        print(f"[SUCCESS] 所有步骤执行成功！")
        print(f"[INFO] 总耗时: {elapsed_time:.2f} 秒")
        print(f"[INFO] 收货单号: {report['receiptNumber']}")
        print(f"[INFO] 处理物料: {report['itemsProcessed']} 项")
        print(f"[INFO] 金额总计: ¥{report['totalAmount']:,.2f}")

        return 0

    except Exception as e:
        print(f"\n[ERROR] 流程执行失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
