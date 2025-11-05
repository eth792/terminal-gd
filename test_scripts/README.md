# 测试脚本文件

这个目录包含用于测试RPA应用程序文件执行功能的示例脚本。

## 脚本列表

### 1. hello.py (Python)
简单的Python测试脚本，演示基本功能：
- 打印系统信息
- 处理命令行参数
- 输出JSON格式结果

**使用方法：**
```bash
python test_scripts/hello.py arg1 arg2
```

### 2. hello.js (Node.js)
简单的Node.js测试脚本，演示基本功能：
- 打印系统信息
- 处理命令行参数
- 输出JSON格式结果

**使用方法：**
```bash
node test_scripts/hello.js arg1 arg2
```

### 3. DataProcessor.java (Java)
简单的Java测试脚本，演示基本功能：
- 打印系统信息
- 处理命令行参数
- 输出JSON格式结果

**使用方法：**
```bash
# 编译
javac test_scripts/DataProcessor.java

# 运行
java -cp test_scripts DataProcessor arg1 arg2
```

### 4. data_processor.py (Python - 高级示例)
收发货业务数据处理脚本，用于演示实际业务场景：
- OCR数据验证
- 数据清理和标准化
- 字段映射和结构化
- 生成业务报告

**使用方法：**
```bash
python test_scripts/data_processor.py
```

## 在应用中使用

### 通用执行页面（ExecutionPage）

1. 启动应用并导航到任一功能页面（订单生成/收发货/财务报销）
2. 在脚本配置区域，选择"文件模式"
3. 点击"选择脚本文件"按钮
4. 浏览并选择 test_scripts 目录中的任一脚本
5. （可选）在命令行参数框中输入参数，例如：`--test arg1 arg2`
6. 点击"运行"按钮执行脚本
7. 在右侧日志区域查看执行结果

### 收发货执行页面（ShippingReceivingExecutionPage）

1. 启动应用并选择"收发货"功能
2. 展开"步骤2: 数据清理和结构化"配置面板
3. 在"执行模式"下拉框中选择"选择脚本文件"
4. 点击"选择脚本文件"按钮
5. 选择 `data_processor.py` 脚本
6. 点击"开始执行"运行完整流程
7. 查看日志输出，验证脚本执行结果

## 注意事项

1. **Python脚本**：确保系统已安装Python 3.x
2. **Node.js脚本**：确保系统已安装Node.js
3. **Java脚本**：确保系统已安装JDK（包含javac和java命令）
4. **文件路径**：选择文件时使用绝对路径或相对于项目根目录的路径
5. **权限**：在Unix/Linux系统上，可能需要为脚本添加执行权限：
   ```bash
   chmod +x test_scripts/*.py
   chmod +x test_scripts/*.js
   ```

## 自定义脚本

您可以创建自己的脚本文件来测试特定功能：

1. 创建脚本文件（.py / .js / .java）
2. 在脚本中实现所需逻辑
3. 确保脚本输出到标准输出（stdout）
4. 在应用中选择并执行脚本

脚本可以：
- 读取命令行参数
- 执行数据处理
- 调用外部API
- 读写文件
- 输出日志信息

所有输出都会实时显示在应用的日志查看器中。
