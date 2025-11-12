#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试中文输出
用于验证Windows下日志中文显示是否正常
"""

print("你好，世界！")
print("这是一个测试脚本")
print("用于验证中文字符在Windows系统下的显示")
print("测试数字：12345")
print("测试符号：！@#￥%……&*（）")
print("测试英文：Hello World")

# 测试错误输出
import sys
print("这是标准错误输出", file=sys.stderr)

# 测试一些中文日志
print("开始执行任务...")
print("正在处理数据...")
print("任务执行完成！")
