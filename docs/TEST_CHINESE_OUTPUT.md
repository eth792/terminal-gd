# Windows中文输出测试指南

## 快速测试步骤

### 1. 准备环境

确保已安装依赖：
```bash
npm install
```

### 2. 构建项目

```bash
npm run build
```

或者使用开发模式：
```bash
npm run dev
```

### 3. 运行应用

```bash
npm run electron:start
```

或在开发模式下，应用会自动启动。

### 4. 测试中文输出

1. 在应用中选择要执行的脚本类型
2. 选择文件模式，浏览并选择 `examples/test_chinese_output.py`
3. 点击"执行"按钮
4. 观察日志输出

### 预期结果

日志窗口应该正确显示以下中文内容（而不是乱码）：

```
你好，世界！
这是一个测试脚本
用于验证中文字符在Windows系统下的显示
测试数字：12345
测试符号：！@#￥%……&*（）
测试英文：Hello World
这是标准错误输出
开始执行任务...
正在处理数据...
任务执行完成！
```

### 如果仍然出现乱码

检查以下几点：

1. **确认已安装iconv-lite**
   ```bash
   npm list iconv-lite
   ```
   应该显示已安装的版本。

2. **确认代码已更新**
   检查 `dist/scriptExecutor.js` 是否包含GBK解码相关代码。

3. **清理并重新构建**
   ```bash
   npm run clean
   npm install
   npm run build
   ```

4. **检查Python脚本编码**
   确保 `test_chinese_output.py` 文件以UTF-8编码保存。

5. **检查Windows代码页**
   在命令行运行：
   ```cmd
   chcp
   ```
   应该显示 `936` (GBK) 或 `65001` (UTF-8)。

## 创建自己的测试脚本

### Python示例

```python
#!/usr/bin/env python
# -*- coding: utf-8 -*-

print("测试中文输出")
print("Test English output")

import sys
print("错误输出测试", file=sys.stderr)
```

### Node.js示例

```javascript
console.log("测试中文输出");
console.log("Test English output");
console.error("错误输出测试");
```

### Java示例

```java
public class TestChinese {
    public static void main(String[] args) {
        System.out.println("测试中文输出");
        System.out.println("Test English output");
        System.err.println("错误输出测试");
    }
}
```

## 故障排查

### 问题：部分中文显示正常，部分乱码

**原因**：脚本文件本身可能使用了混合编码。

**解决**：
- 确保所有脚本文件统一使用UTF-8编码保存
- 在编辑器中转换文件编码为UTF-8

### 问题：英文正常，所有中文都乱码

**原因**：编码转换未生效。

**解决**：
1. 检查是否在Windows系统上运行
2. 确认 `iconv-lite` 已正确安装
3. 重新构建项目

### 问题：日志完全不显示

**原因**：可能是其他问题，与编码无关。

**解决**：
1. 检查浏览器开发者工具的控制台
2. 查看Electron主进程的日志
3. 确认IPC通信是否正常

## 其他语言的Windows系统

如果您使用的是非中文版Windows（如英文版、日文版等），可能需要调整编码配置。

当前代码默认使用GBK编码，这适用于简体中文Windows。对于其他语言：

- 日文Windows: 可能需要使用 `shift-jis` 编码
- 繁体中文Windows: 可能需要使用 `big5` 编码
- 英文Windows: 通常不需要特殊处理，使用UTF-8即可

如需修改，请编辑 `src/main/scriptExecutor.ts` 中的 `decodeWindowsOutput` 方法。

## 联系支持

如果问题仍未解决，请提供以下信息：

1. Windows版本和语言
2. Node.js版本
3. 项目构建日志
4. 实际看到的乱码截图
5. 执行的脚本内容
