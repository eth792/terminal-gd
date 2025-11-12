# Windows中文编码问题修复说明

## 问题描述

在Windows系统下运行脚本时，日志中的中文字符会显示为乱码。

## 问题原因

Windows命令行默认使用GBK编码（中文系统），而Node.js的`child_process.spawn()`默认使用UTF-8编码来解析子进程的输出。这导致当Python、Java或Node.js脚本输出中文时，会出现乱码。

## 解决方案

### 1. 安装依赖

项目已安装`iconv-lite`库用于编码转换：

```bash
npm install iconv-lite
```

### 2. 代码修改

在`src/main/scriptExecutor.ts`中进行了以下修改：

1. **导入iconv-lite库**
   ```typescript
   import * as iconv from 'iconv-lite';
   ```

2. **添加解码方法**
   ```typescript
   private decodeWindowsOutput(buffer: Buffer): string {
     try {
       // 使用iconv-lite库进行GBK解码（Windows中文系统默认使用GBK编码）
       return iconv.decode(buffer, 'gbk');
     } catch (error) {
       // 如果解码失败，回退到UTF-8
       console.warn('GBK decoding failed, falling back to UTF-8:', error);
       return buffer.toString('utf8');
     }
   }
   ```

3. **修改spawn调用**

   在所有使用`spawn()`的地方添加平台检测和编码配置：

   ```typescript
   // Windows下需要指定编码，避免中文乱码
   const spawnOptions = os.platform() === 'win32' ? {
     windowsHide: true,
     encoding: 'buffer' as BufferEncoding
   } : {};

   const process = spawn(command, args, spawnOptions);
   ```

4. **修改数据处理**

   在处理stdout和stderr时，根据平台选择合适的解码方式：

   ```typescript
   process.stdout?.on('data', (data) => {
     // Windows下使用GBK解码，其他平台使用UTF-8
     const output = os.platform() === 'win32'
       ? this.decodeWindowsOutput(data)
       : data.toString('utf8');
     // ... 后续处理
   });
   ```

### 3. 测试

使用测试脚本`examples/test_chinese_output.py`验证修复效果：

```python
print("你好，世界！")
print("这是一个测试脚本")
```

在Windows系统下运行此脚本，应该能够正确显示中文而不是乱码。

## 影响范围

此修复影响以下功能：
- Python脚本执行
- Java程序执行
- Node.js脚本执行
- 环境检查命令输出
- 所有子进程的标准输出和错误输出

## 平台兼容性

- **Windows**: 使用GBK编码解码（修复了中文乱码问题）
- **macOS/Linux**: 继续使用UTF-8编码（保持原有行为）

## 注意事项

1. 此修复基于Windows中文系统使用GBK编码的前提
2. 如果用户使用其他语言的Windows系统，可能需要调整编码类型
3. 建议在脚本中使用UTF-8编码保存文件，并在Python脚本开头添加：
   ```python
   # -*- coding: utf-8 -*-
   ```

## 后续优化建议

1. 可以考虑添加用户配置选项，允许用户自定义终端编码
2. 可以通过检测系统locale自动选择合适的编码
3. 为不同的脚本类型提供独立的编码配置
