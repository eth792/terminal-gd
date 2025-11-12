# 脚本执行功能使用指南

本文档介绍 RPA 自动化工具的脚本执行功能，包括代码模式和文件模式两种执行方式。

## 功能概述

RPA 应用现已支持两种脚本执行方式：

1. **代码模式**：直接在应用界面输入代码并执行
2. **文件模式**：选择本地脚本文件进行执行

支持的编程语言：
- Python (推荐使用 Python 3.x)
- Node.js (JavaScript)
- Java (需要 JDK)

## 使用方法

### 一、通用执行页面（ExecutionPage）

#### 1. 代码模式

1. 打开应用，选择任一功能（订单生成/收发货/财务报销）
2. 在脚本配置区域，点击"代码模式"按钮
3. 从下拉框选择脚本语言（Python/Java/Node.js）
4. 在代码编辑框中输入脚本代码
5. （可选）在"命令行参数"框中输入参数
6. 点击"运行"按钮执行脚本
7. 在右侧日志区域实时查看执行结果

**示例代码（Python）：**
```python
print("Hello from Python!")
import sys
print(f"参数: {sys.argv[1:]}")
```

#### 2. 文件模式

1. 在脚本配置区域，点击"文件模式"按钮
2. 点击"选择脚本文件"按钮
3. 在文件对话框中浏览并选择脚本文件
   - Python 文件：*.py
   - JavaScript 文件：*.js
   - Java 文件：*.java
4. 系统会根据文件扩展名自动设置脚本语言
5. （可选）输入命令行参数
6. 点击"运行"按钮执行脚本

**提示：**
- 选择文件后会显示完整文件路径
- 支持选择任意位置的脚本文件
- 推荐使用 `test_scripts/` 目录中的示例脚本进行测试

### 二、收发货执行页面（ShippingReceivingExecutionPage）

这是一个多步骤工作流页面，其中"步骤2: 数据清理和结构化"支持文件选择功能。

#### 配置步骤

1. 打开"收发货"功能页面
2. 展开"步骤2: 数据清理和结构化"配置面板
3. 选择脚本类型（Python/Node.js/Java）
4. 在"执行模式"下拉框中选择：
   - **使用内置代码**：使用预设的示例代码
   - **选择脚本文件**：使用自定义脚本文件
5. 如果选择"选择脚本文件"，点击"选择脚本文件"按钮
6. 浏览并选择数据处理脚本（推荐 `test_scripts/data_processor.py`）
7. 配置其他选项（验证规则、字段映射、自定义参数）
8. 点击"开始执行"运行完整工作流

#### 工作流说明

收发货自动化包含3个步骤：
1. **扫描纸张**：模拟OCR识别纸质单据
2. **数据清理**：使用脚本处理OCR数据（支持文件选择）
3. **执行填报**：自动填写目标系统表单

## 测试脚本

项目提供了多个测试脚本位于 `test_scripts/` 目录：

### 1. hello.py
简单的Python测试脚本，演示：
- 打印系统信息和时间
- 处理命令行参数
- 输出JSON格式结果

### 2. hello.js
简单的Node.js测试脚本，功能同上。

### 3. DataProcessor.java
简单的Java测试脚本，功能同上。

### 4. data_processor.py
高级Python脚本，专门用于收发货数据处理：
- OCR数据验证
- 数据清理和标准化
- 字段映射
- 生成业务报告

## 技术实现

### 架构说明

```
前端（React）
  ├─ ExecutionPage: 通用执行页面
  │   ├─ 代码模式：直接输入代码
  │   └─ 文件模式：选择文件执行
  │
  └─ ShippingReceivingExecutionPage: 收发货页面
      └─ 步骤2支持文件选择

         ↓ IPC 通信

后端（Electron Main Process）
  ├─ main.ts: IPC处理器
  │   ├─ execute-script: 执行脚本
  │   └─ open-file-dialog: 打开文件对话框
  │
  └─ scriptExecutor.ts: 脚本执行引擎
      ├─ 环境检测（Python/Java/Node.js）
      ├─ 临时文件管理
      ├─ 进程管理（spawn）
      └─ 实时日志推送
```

### 执行流程

1. **用户选择文件** → 触发文件对话框
2. **获取文件路径** → 更新UI显示
3. **点击运行** → 发送 IPC 请求
4. **后端接收请求** → ScriptExecutor处理
5. **环境检测** → 验证运行环境
6. **执行脚本** → spawn子进程
7. **实时日志** → 通过IPC推送到前端
8. **显示结果** → UI更新状态

### 关键文件

**前端：**
- `src/renderer/types/index.ts` - 类型定义
- `src/renderer/pages/ExecutionPage.tsx` - 通用执行页面
- `src/renderer/pages/ShippingReceivingExecutionPage.tsx` - 收发货页面

**后端：**
- `src/main/main.ts` - IPC处理
- `src/main/preload.ts` - API桥接
- `src/main/scriptExecutor.ts` - 脚本执行引擎

**测试：**
- `test_scripts/` - 测试脚本目录

## 常见问题

### Q1: 执行失败提示"环境不可用"
**A:** 确保系统已安装对应的运行环境：
- Python: 安装Python 3.x，确保 `python3` 或 `python` 命令可用
- Node.js: 安装Node.js，确保 `node` 命令可用
- Java: 安装JDK，确保 `java` 和 `javac` 命令都可用

### Q2: 文件路径无效
**A:**
- 确保文件确实存在
- 检查文件路径是否正确
- 在macOS/Linux上检查文件权限

### Q3: Java脚本执行失败
**A:**
- 确保类名与文件名一致（如 `DataProcessor.java` 包含 `public class DataProcessor`）
- Java脚本会先自动编译再执行
- 检查编译错误信息

### Q4: 如何传递命令行参数？
**A:** 在"命令行参数"输入框中输入参数，用空格分隔，例如：
```
--input data.csv --output result.json
```

### Q5: 如何查看详细的执行日志？
**A:**
- 所有stdout和stderr输出都会实时显示在日志区域
- 不同级别的日志用不同颜色显示（INFO/SUCCESS/WARNING/ERROR）
- 可以使用日志查看器的搜索和导出功能

## 安全注意事项

1. **不要执行不信任的脚本** - 脚本具有完整的系统访问权限
2. **验证脚本来源** - 仅执行可信来源的脚本文件
3. **检查脚本内容** - 执行前预览脚本代码
4. **限制权限** - 不要以管理员权限运行应用
5. **数据隔离** - 敏感数据应加密处理

## 开发指南

### 创建自定义脚本

**Python示例：**
```python
#!/usr/bin/env python3
import sys
import json

# 读取命令行参数
args = sys.argv[1:]

# 处理数据
result = {
    "status": "success",
    "data": process_data(args)
}

# 输出结果（会显示在日志中）
print(json.dumps(result, ensure_ascii=False, indent=2))
```

**Node.js示例：**
```javascript
#!/usr/bin/env node

const args = process.argv.slice(2);

const result = {
    status: 'success',
    data: processData(args)
};

console.log(JSON.stringify(result, null, 2));
```

**Java示例：**
```java
public class MyScript {
    public static void main(String[] args) {
        // 处理参数
        for (String arg : args) {
            System.out.println("参数: " + arg);
        }

        // 输出结果
        System.out.println("{\"status\": \"success\"}");
    }
}
```

### 最佳实践

1. **结构化输出** - 使用JSON格式输出结构化数据
2. **错误处理** - 使用try-catch捕获异常
3. **进度反馈** - 通过print/console.log输出进度信息
4. **退出代码** - 成功返回0，失败返回非0
5. **编码规范** - 使用UTF-8编码避免乱码

## 更新日志

### v1.1.0 (2024-10-31)
- ✨ 新增文件选择功能
- ✨ 支持代码模式和文件模式切换
- ✨ 添加文件对话框过滤器
- ✨ 自动识别脚本语言类型
- ✨ 收发货页面支持自定义脚本
- 📝 添加测试脚本和使用文档

### v1.0.0 (2024-10-21)
- 🎉 初始版本
- ✨ 支持Python/Java/Node.js脚本执行
- ✨ 实时日志查看
- ✨ 多语言环境检测
