# 收发货自动化功能使用说明

## 功能概述

收发货自动化功能实现了从纸质单据到系统填报的全流程自动化，包含三个核心步骤：

1. **扫描纸张** - 使用OCR技术识别纸质收发货单据
2. **数据清理和结构化** - 对识别的数据进行验证、清理和格式化
3. **执行填报** - 自动登录目标系统并完成数据填报

## 业务流程

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│  纸质单据    │ ---> │  OCR识别      │ ---> │  JSON数据   │
│  扫描件     │      │  文字提取     │      │  原始格式   │
└─────────────┘      └──────────────┘      └─────────────┘
                                                   |
                                                   v
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│  系统单据    │ <--- │  自动填报     │ <--- │  结构化数据  │
│  (ERP/WMS)  │      │  表单提交     │      │  标准格式   │
└─────────────┘      └──────────────┘      └─────────────┘
```

## 功能特性

### 步骤1: 扫描纸张

**配置项**:
- 扫描器类型: 平板/馈纸式/便携式
- 分辨率: 200/300/600 DPI
- OCR引擎: Tesseract/百度OCR/腾讯OCR
- 图像预处理: 降噪、纠偏、二值化
- 自动旋转: 自动检测并纠正文档方向

**识别内容**:
- 单据类型和编号
- 供应商信息
- 物料明细 (名称、规格、数量、单位、价格)
- 日期和操作员信息
- 备注说明

### 步骤2: 数据清理和结构化

**处理功能**:
- 数据完整性验证
- 字段格式标准化
- 金额计算核对
- 物料编码映射
- 批号自动生成
- 库位自动分配

**验证规则**:
- 必填字段检查
- 数值范围验证
- 日期格式校验
- 供应商资质检查
- 库存容量限制

### 步骤3: 执行填报

**系统支持**:
- ERP系统 (企业资源计划)
- WMS系统 (仓库管理)
- SAP系统

**填报功能**:
- 自动登录认证
- 表单自动填写
- 数据验证确认
- 单据提交
- 执行报告生成

**安全特性**:
- 重试机制 (1-10次可配置)
- 填报速度控制 (慢速/中速/快速)
- 数据验证开关
- 操作日志记录

## 使用步骤

### 1. 启动应用

```bash
npm run dev
```

### 2. 登录系统

- 打开应用后进入登录页面
- 输入用户名和密码
- 系统会自动进行环境检测 (Node.js, Python, Java)

### 3. 进入收发货功能

- 在主控制台点击 "收发货" 卡片
- 或直接访问 `/shipping-receiving` 路由

### 4. 配置执行步骤

#### 步骤1配置:
- 选择扫描器类型和分辨率
- 选择OCR引擎
- 启用/禁用图像预处理

#### 步骤2配置:
- 选择数据处理脚本类型 (Python/Node.js/Java)
- 设置脚本路径
- 配置验证规则和字段映射
- 添加自定义参数

#### 步骤3配置:
- 选择目标系统类型
- 输入系统登录URL和凭据
- 设置填报速度和重试次数
- 启用数据验证

### 5. 执行流程

- 点击右上角 "开始执行" 按钮
- 系统会按顺序执行三个步骤
- 右侧日志区会实时显示执行进度
- 顶部进度条显示整体完成度

### 6. 查看结果

- 执行完成后查看执行报告
- 导出运行日志 (TXT格式)
- 检查生成的系统单号

## 示例脚本

### Python 示例

项目包含一个完整的演示脚本: `examples/shipping_receiving_demo.py`

运行演示:

```bash
python3 examples/shipping_receiving_demo.py
```

该脚本演示了完整的三步流程,包含详细的日志输出和模拟数据。

### 脚本执行流程

```python
# 步骤1: OCR识别
ocr_data = step1_scan_document()
# 返回: { documentNumber, supplier, items[], totalAmount, ... }

# 步骤2: 数据处理
structured_data = step2_clean_and_structure_data(ocr_data)
# 返回: { header{}, items[], summary{} }

# 步骤3: 自动填报
report = step3_auto_fill_system(structured_data)
# 返回: { executionId, receiptNumber, status, ... }
```

## 日志说明

### 日志级别

- **INFO**: 普通信息日志 (蓝色)
- **SUCCESS**: 成功操作日志 (绿色)
- **WARNING**: 警告信息 (黄色)
- **ERROR**: 错误信息 (红色)

### 日志功能

- 实时滚动显示
- 自动滚动到底部
- 日志搜索过滤
- 导出为文本文件
- 显示总计数量

## 数据结构示例

### OCR识别结果

```json
{
  "documentType": "收货单",
  "documentNumber": "SH20241021001",
  "date": "2024-10-21",
  "supplier": "上海电力设备有限公司",
  "items": [
    {
      "name": "变压器配件",
      "quantity": 5,
      "unit": "套",
      "unitPrice": 12500.00,
      "totalPrice": 62500.00
    }
  ],
  "totalAmount": 77450.00
}
```

### 结构化数据

```json
{
  "header": {
    "documentType": "GOODS_RECEIPT",
    "documentNumber": "SH20241021001",
    "transactionDate": "2024-10-21",
    "supplierCode": "SP001234",
    "warehouseCode": "WH001"
  },
  "items": [
    {
      "lineNumber": 1,
      "materialCode": "MAT0001",
      "materialName": "变压器配件",
      "quantity": 5.0,
      "unit": "SET",
      "batchNumber": "BATCH20241021"
    }
  ],
  "summary": {
    "totalItems": 3,
    "totalAmount": 77450.00
  }
}
```

### 执行报告

```json
{
  "executionId": "EXEC_1729558800",
  "executionTime": "2024-10-21T14:30:00",
  "sourceDocument": "SH20241021001",
  "receiptNumber": "GR2024102100156",
  "itemsProcessed": 3,
  "totalAmount": 77450.00,
  "status": "SUCCESS",
  "duration": "45秒"
}
```

## 技术要点

### 环境要求

- Node.js >= 16.0.0
- Python >= 3.7 (用于OCR和数据处理脚本)
- Java >= 11 (可选,用于Java脚本)

### 依赖库 (Python示例)

```bash
pip install pytesseract pillow opencv-python selenium
```

### OCR引擎

- Tesseract OCR (开源)
- 百度OCR API (需要API Key)
- 腾讯OCR API (需要API Key)

## 常见问题

### Q: OCR识别准确率低怎么办?

A:
1. 提高扫描分辨率 (推荐300-600 DPI)
2. 启用图像预处理
3. 确保纸质单据清晰、无褶皱
4. 使用更高级的OCR引擎 (如百度/腾讯云)

### Q: 数据验证失败如何处理?

A:
1. 检查日志中的具体错误信息
2. 确认业务规则配置正确
3. 手动检查OCR识别结果
4. 调整验证规则的严格程度

### Q: 填报提交失败?

A:
1. 确认目标系统URL正确
2. 检查登录凭据是否有效
3. 增加重试次数
4. 降低填报速度
5. 检查网络连接

### Q: 如何跳过某个步骤?

A: 在步骤配置的标题栏有开关按钮,可以禁用不需要的步骤。

## 扩展开发

### 自定义OCR引擎

在 `step1_scan_document()` 函数中添加新的OCR引擎支持:

```python
def custom_ocr_engine(image_path):
    # 实现自定义OCR逻辑
    return extracted_data
```

### 自定义数据验证规则

在 `step2_clean_and_structure_data()` 函数中添加验证逻辑:

```python
def validate_custom_rules(data):
    # 实现自定义验证规则
    if not meets_requirement:
        raise ValidationError("验证失败原因")
```

### 自定义填报逻辑

在 `step3_auto_fill_system()` 函数中实现目标系统的填报逻辑:

```python
def fill_custom_system(data):
    # 使用 Selenium/Playwright 等工具
    # 实现自动化填报
    pass
```

## 性能优化建议

1. **批量处理**: 一次处理多个单据
2. **并行OCR**: 使用多线程/多进程
3. **缓存结果**: 缓存常用的物料编码映射
4. **增量更新**: 只提交变更的数据
5. **异步提交**: 后台异步执行填报

## 安全注意事项

1. 凭据管理: 不要在代码中硬编码密码
2. 日志脱敏: 自动移除敏感信息
3. 访问控制: 限制系统访问权限
4. 审计日志: 记录所有操作历史
5. 数据备份: 定期备份原始数据

## 支持与反馈

如有问题或建议,请联系开发团队或在项目仓库提交 Issue。
