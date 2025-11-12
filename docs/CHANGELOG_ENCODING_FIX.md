# Windows中文乱码修复 - 更改日志

## 版本：1.0.1-encoding-fix
**日期**: 2025-11-12

## 修复的问题

修复了在Windows系统下运行脚本时，日志中文字符显示为乱码的问题。

## 主要变更

### 1. 新增依赖
- **iconv-lite** (^0.6.3): 用于在Windows平台下进行GBK到UTF-8的编码转换

### 2. 代码修改

#### `src/main/scriptExecutor.ts`

- 导入`iconv-lite`库进行编码转换
- 新增`decodeWindowsOutput()`方法，用于Windows平台的GBK编码解码
- 修改所有`spawn()`调用，添加平台检测：
  - Windows平台：设置`encoding: 'buffer'`，手动进行GBK解码
  - 其他平台：继续使用UTF-8编码
- 受影响的方法：
  - `compileJavaFile()`: Java编译输出处理
  - `runScript()`: 脚本执行输出处理
  - `execCommand()`: 环境检查命令输出处理

### 3. 新增文件

- **`examples/test_chinese_output.py`**: 用于测试中文输出的Python示例脚本
- **`docs/WINDOWS_ENCODING_FIX.md`**: 详细的修复说明文档

## 技术细节

### 编码问题根源
Windows中文系统的命令行默认使用GBK编码，而Node.js的`child_process.spawn()`默认使用UTF-8解码子进程输出，导致编码不匹配。

### 解决方案
1. 在Windows平台检测到`os.platform() === 'win32'`时
2. 使用`encoding: 'buffer'`获取原始Buffer数据
3. 使用`iconv-lite`库将GBK编码的Buffer转换为UTF-8字符串

### 平台兼容性
- ✅ Windows (中文系统): 使用GBK解码
- ✅ macOS: 继续使用UTF-8
- ✅ Linux: 继续使用UTF-8

## 测试建议

在Windows系统上运行以下测试：

```bash
# 1. 安装依赖
npm install

# 2. 构建项目
npm run build

# 3. 运行应用
npm run electron:start

# 4. 在应用中执行 examples/test_chinese_output.py
# 检查日志输出是否显示正确的中文
```

## 向后兼容性

- ✅ 完全向后兼容
- ✅ 不影响现有功能
- ✅ macOS和Linux平台行为保持不变

## 已知限制

1. 仅支持Windows中文系统（GBK编码）
2. 其他语言的Windows系统可能需要不同的编码配置
3. 建议Python脚本文件使用UTF-8编码保存

## 相关问题

修复了以下场景的中文乱码：
- ✅ Python脚本中文输出
- ✅ Java程序中文输出
- ✅ Node.js脚本中文输出
- ✅ 编译错误信息中文显示
- ✅ 环境检查命令的中文输出

## 下一步计划

潜在的改进方向：
1. 添加用户可配置的编码选项
2. 自动检测系统locale并选择合适编码
3. 为不同脚本类型提供独立编码配置
