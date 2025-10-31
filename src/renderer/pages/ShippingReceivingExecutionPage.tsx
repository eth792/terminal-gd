import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Grid,
  Paper,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack,
  PlayArrow,
  Stop,
  Refresh,
  ExpandMore,
  Info,
  Upload,
  CleaningServices,
  Send,
  Settings,
} from '@mui/icons-material';
import { ExecutionState, LogMessage } from '../types';
import LogViewer from '../components/LogViewer';

interface StepConfig {
  enabled: boolean;
  config: Record<string, any>;
  status: 'idle' | 'running' | 'completed' | 'error';
}

const ShippingReceivingExecutionPage: React.FC = () => {
  const navigate = useNavigate();
  const [executionState, setExecutionState] = useState<ExecutionState>({
    status: 'idle',
    progress: 0,
    logs: [],
    currentStep: '',
  });

  const [activeStep, setActiveStep] = useState(0);
  const [steps, setSteps] = useState<StepConfig[]>([
    {
      enabled: true,
      status: 'idle',
      config: {
        scannerType: 'flatbed',
        resolution: '300',
        colorMode: 'color',
        outputFormat: 'json',
        ocrEngine: 'tesseract',
        language: 'chi_sim+eng',
        preprocessImage: true,
        autoRotate: true,
      }
    },
    {
      enabled: true,
      status: 'idle',
      config: {
        scriptType: 'python',
        scriptPath: 'scripts/data_processor.py',
        validationRules: true,
        dataMapping: true,
        outputFormat: 'structured',
        customParams: '',
      }
    },
    {
      enabled: true,
      status: 'idle',
      config: {
        targetSystem: 'erp',
        loginUrl: 'https://erp.company.com/login',
        username: 'auto_user',
        autoFillSpeed: 'medium',
        verification: true,
        retryAttempts: 3,
        waitTime: 2000,
      }
    }
  ]);

  const stepLabels = ['扫描纸张', '数据清理', '执行填报'];

  // 添加日志消息
  const addLog = (level: LogMessage['level'], message: string, step?: number) => {
    const stepPrefix = step !== undefined ? `[${stepLabels[step]}] ` : '';
    const newLog: LogMessage = {
      id: Date.now().toString(),
      level,
      message: stepPrefix + message,
      timestamp: new Date().toISOString(),
    };

    setExecutionState(prev => ({
      ...prev,
      logs: [...prev.logs, newLog],
    }));
  };

  // 设置日志监听
  useEffect(() => {
    if (window.electronAPI) {
      const unsubscribe = window.electronAPI.onLogMessage((logData: any) => {
        addLog(logData.level, logData.message);
      });
      return () => unsubscribe();
    }
  }, []);

  // 执行完整流程
  const handleExecute = async () => {
    setExecutionState({ status: 'running', progress: 0, logs: [], currentStep: '' });
    addLog('INFO', '🚀 开始执行收发货自动化流程');

    try {
      for (let i = 0; i < steps.length; i++) {
        if (!steps[i].enabled) {
          addLog('WARNING', `步骤 ${stepLabels[i]} 已跳过`);
          continue;
        }

        setActiveStep(i);
        setExecutionState(prev => ({ ...prev, currentStep: stepLabels[i] }));
        addLog('INFO', `开始执行步骤 ${i + 1}: ${stepLabels[i]}`, i);

        // 更新步骤状态
        const newSteps = [...steps];
        newSteps[i].status = 'running';
        setSteps(newSteps);

        const stepProgress = ((i + 1) / steps.length) * 100;
        setExecutionState(prev => ({ ...prev, progress: stepProgress }));

        // 执行具体步骤
        await executeStep(i, newSteps[i].config);

        // 标记步骤完成
        newSteps[i].status = 'completed';
        setSteps(newSteps);
        addLog('SUCCESS', `✅ 步骤 ${stepLabels[i]} 执行完成`, i);

        // 步骤间延迟
        if (i < steps.length - 1) {
          addLog('INFO', '等待 2 秒后进入下一步...', i);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      setExecutionState(prev => ({ ...prev, status: 'completed', currentStep: '' }));
      addLog('SUCCESS', '🎉 收发货自动化流程执行完成！');

    } catch (error) {
      setExecutionState(prev => ({ ...prev, status: 'error', currentStep: '' }));
      addLog('ERROR', `❌ 流程执行失败: ${error}`);

      // 标记当前步骤为错误状态
      const newSteps = [...steps];
      if (activeStep < newSteps.length) {
        newSteps[activeStep].status = 'error';
        setSteps(newSteps);
      }
    }
  };

  // 执行具体步骤
  const executeStep = async (stepIndex: number, config: Record<string, any>) => {
    switch (stepIndex) {
      case 0:
        await executeScanningStep(config);
        break;
      case 1:
        await executeDataProcessingStep(config);
        break;
      case 2:
        await executeReportingStep(config);
        break;
      default:
        throw new Error(`未知的步骤索引: ${stepIndex}`);
    }
  };

  // 步骤1: 扫描纸张
  const executeScanningStep = async (config: any) => {
    addLog('INFO', `📷 扫描器配置: ${config.scannerType}, 分辨率: ${config.resolution}dpi`, 0);
    addLog('INFO', `OCR引擎: ${config.ocrEngine}, 语言: ${config.language}`, 0);

    // 模拟扫描过程
    addLog('INFO', '正在初始化扫描器...', 0);
    await new Promise(resolve => setTimeout(resolve, 1500));

    addLog('INFO', '检测到纸张文档，准备扫描...', 0);
    await new Promise(resolve => setTimeout(resolve, 1000));

    addLog('INFO', '正在扫描第 1 页...', 0);
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (config.preprocessImage) {
      addLog('INFO', '正在预处理图像（降噪、纠偏）...', 0);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    addLog('INFO', '正在执行 OCR 识别...', 0);
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 模拟OCR结果
    const mockOCRResult = {
      documentType: '收货单',
      documentNumber: 'SH20241021001',
      date: '2024-10-21',
      supplier: '上海电力设备有限公司',
      items: [
        { name: '变压器配件', quantity: 5, unit: '套', price: 12500.00 },
        { name: '绝缘子', quantity: 100, unit: '个', price: 85.50 },
        { name: '电缆终端头', quantity: 20, unit: '个', price: 320.00 }
      ],
      totalAmount: 69550.00
    };

    addLog('SUCCESS', `✅ OCR 识别完成，识别到 ${mockOCRResult.items.length} 个条目`, 0);
    addLog('INFO', `识别结果: ${JSON.stringify(mockOCRResult, null, 2)}`, 0);

    // 调用实际的脚本执行（这里用示例代码）
    if (window.electronAPI) {
      const scriptCode = `import json

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
`;

      try {
        const result = await window.electronAPI.executeScript({
          type: 'python',
          code: scriptCode,
          args: []
        });

        if (result.success) {
          addLog('SUCCESS', '脚本执行成功', 0);
        } else {
          addLog('ERROR', `脚本执行失败: ${result.error}`, 0);
        }
      } catch (error) {
        addLog('WARNING', `脚本执行遇到问题，使用模拟数据: ${error}`, 0);
      }
    }
  };

  // 步骤2: 数据清理和结构化
  const executeDataProcessingStep = async (config: any) => {
    addLog('INFO', `🧹 数据处理器: ${config.scriptType}`, 1);
    addLog('INFO', `启用验证规则: ${config.validationRules}`, 1);
    addLog('INFO', `启用数据映射: ${config.dataMapping}`, 1);

    // 模拟数据处理
    addLog('INFO', '正在加载业务规则...', 1);
    await new Promise(resolve => setTimeout(resolve, 1000));

    addLog('INFO', '正在验证数据完整性...', 1);
    await new Promise(resolve => setTimeout(resolve, 1500));

    addLog('INFO', '正在执行数据标准化...', 1);
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (config.dataMapping) {
      addLog('INFO', '正在映射到目标系统字段...', 1);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // 模拟处理后的结构化数据
    const processedData = {
      header: {
        documentType: 'RECEIPT',
        documentNumber: 'SH20241021001',
        transactionDate: '2024-10-21',
        supplierCode: 'SP001234',
        supplierName: '上海电力设备有限公司',
        warehouseCode: 'WH001',
        operationType: 'RECEIVE'
      },
      items: [
        {
          lineNumber: 1,
          materialCode: 'MAT001',
          materialName: '变压器配件',
          quantity: 5.0,
          unit: 'SET',
          unitPrice: 12500.00,
          totalPrice: 62500.00,
          batchNumber: 'BATCH20241021',
          expiryDate: '2025-10-21'
        },
        {
          lineNumber: 2,
          materialCode: 'MAT002',
          materialName: '绝缘子',
          quantity: 100.0,
          unit: 'PCS',
          unitPrice: 85.50,
          totalPrice: 8550.00,
          batchNumber: 'BATCH20241021',
          expiryDate: '2026-10-21'
        },
        {
          lineNumber: 3,
          materialCode: 'MAT003',
          materialName: '电缆终端头',
          quantity: 20.0,
          unit: 'PCS',
          unitPrice: 320.00,
          totalPrice: 6400.00,
          batchNumber: 'BATCH20241021',
          expiryDate: '2025-04-21'
        }
      ],
      summary: {
        totalItems: 3,
        totalQuantity: 125.0,
        totalAmount: 77450.00,
        currency: 'CNY'
      }
    };

    addLog('SUCCESS', `✅ 数据处理完成，处理了 ${processedData.items.length} 个物料条目`, 1);
    addLog('INFO', `处理后数据: ${JSON.stringify(processedData, null, 2)}`, 1);

    // 实际的数据处理脚本示例
    if (window.electronAPI) {
      const scriptCode = `import json

# 模拟原始OCR数据
raw_data = {
    "documentType": "收货单",
    "documentNumber": "SH20241021001",
    "date": "2024-10-21",
    "supplier": "上海电力设备有限公司",
    "items": [
        {"name": "变压器配件", "quantity": 5, "unit": "套", "price": 12500.00},
        {"name": "绝缘子", "quantity": 100, "unit": "个", "price": 85.50},
        {"name": "电缆终端头", "quantity": 20, "unit": "个", "price": 320.00}
    ]
}

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
`;

      try {
        const result = await window.electronAPI.executeScript({
          type: config.scriptType,
          code: scriptCode,
          args: config.customParams ? config.customParams.split(' ') : []
        });

        if (result.success) {
          addLog('SUCCESS', '数据处理脚本执行成功', 1);
        } else {
          addLog('ERROR', `数据处理脚本失败: ${result.error}`, 1);
        }
      } catch (error) {
        addLog('WARNING', `数据处理脚本遇到问题: ${error}`, 1);
      }
    }
  };

  // 步骤3: 执行填报
  const executeReportingStep = async (config: any) => {
    addLog('INFO', `📊 目标系统: ${config.targetSystem}`, 2);
    addLog('INFO', `填报速度: ${config.autoFillSpeed}`, 2);
    addLog('INFO', `启用验证: ${config.verification}`, 2);

    // 模拟系统登录
    addLog('INFO', `正在连接到 ${config.loginUrl}...`, 2);
    await new Promise(resolve => setTimeout(resolve, 2000));

    addLog('INFO', '正在登录系统...', 2);
    await new Promise(resolve => setTimeout(resolve, 1500));

    addLog('SUCCESS', '✅ 系统登录成功', 2);

    // 模拟填报过程
    addLog('INFO', '正在打开收货单界面...', 2);
    await new Promise(resolve => setTimeout(resolve, 1000));

    addLog('INFO', '正在填写表头信息...', 2);
    await new Promise(resolve => setTimeout(resolve, 1500));

    for (let i = 1; i <= 3; i++) {
      addLog('INFO', `正在填写第 ${i} 行物料信息...`, 2);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (config.verification) {
      addLog('INFO', '正在验证填报数据...', 2);
      await new Promise(resolve => setTimeout(resolve, 2000));
      addLog('SUCCESS', '✅ 数据验证通过', 2);
    }

    addLog('INFO', '正在提交收货单...', 2);
    await new Promise(resolve => setTimeout(resolve, 1500));

    addLog('SUCCESS', '✅ 收货单提交成功！单号: GR2024102100156', 2);
    addLog('INFO', '正在生成执行报告...', 2);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const report = {
      executionId: `EXEC_${Date.now()}`,
      timestamp: new Date().toISOString(),
      documentNumber: 'SH20241021001',
      receiptNumber: 'GR2024102100156',
      itemsProcessed: 3,
      totalAmount: 77450.00,
      executionTime: '45秒',
      status: 'SUCCESS'
    };

    addLog('SUCCESS', `📋 执行报告: ${JSON.stringify(report, null, 2)}`, 2);

    // 实际的填报脚本示例（简化版，不依赖selenium）
    if (window.electronAPI) {
      const scriptCode = `import json
import time

# 模拟处理后的数据
processed_data = {
    "header": {
        "documentNumber": "SH20241021001",
        "supplier": "上海电力设备有限公司"
    },
    "items": [
        {"lineNumber": 1, "materialName": "变压器配件", "quantity": 5},
        {"lineNumber": 2, "materialName": "绝缘子", "quantity": 100},
        {"lineNumber": 3, "materialName": "电缆终端头", "quantity": 20}
    ]
}

# 模拟系统配置
config = {
    "targetSystem": "erp",
    "loginUrl": "https://erp.company.com/login"
}

# 模拟自动填报流程
print("正在连接到系统: {}".format(config["loginUrl"]))
time.sleep(0.5)

print("正在登录系统...")
time.sleep(0.5)

print("正在填写单据: {}".format(processed_data["header"]["documentNumber"]))
time.sleep(0.5)

for item in processed_data["items"]:
    print("填写第 {} 行: {} - 数量 {}".format(
        item["lineNumber"],
        item["materialName"],
        item["quantity"]
    ))
    time.sleep(0.3)

# 模拟提交结果
result = {
    "success": True,
    "receiptNumber": "GR2024102100156",
    "itemsProcessed": len(processed_data["items"])
}

print("填报完成！")
print(json.dumps(result, ensure_ascii=False, indent=2))
`;

      try {
        const result = await window.electronAPI.executeScript({
          type: 'python',
          code: scriptCode,
          args: []
        });

        if (result.success) {
          addLog('SUCCESS', '填报脚本执行成功', 2);
        } else {
          addLog('ERROR', `填报脚本失败: ${result.error}`, 2);
        }
      } catch (error) {
        addLog('WARNING', `填报脚本遇到问题: ${error}`, 2);
      }
    }
  };

  // 停止执行
  const handleStop = () => {
    setExecutionState(prev => ({ ...prev, status: 'idle', progress: 0, currentStep: '' }));
    addLog('WARNING', '⏹️ 执行已停止');

    // 重置所有步骤状态
    const resetSteps = steps.map(step => ({ ...step, status: 'idle' as const }));
    setSteps(resetSteps);
    setActiveStep(0);
  };

  // 重置状态
  const handleReset = () => {
    setExecutionState({
      status: 'idle',
      progress: 0,
      logs: [],
      currentStep: '',
    });
    setActiveStep(0);
    const resetSteps = steps.map(step => ({ ...step, status: 'idle' as const }));
    setSteps(resetSteps);
  };

  const updateStepConfig = (stepIndex: number, field: string, value: any) => {
    const newSteps = [...steps];
    newSteps[stepIndex].config[field] = value;
    setSteps(newSteps);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'primary';
      case 'completed': return 'success';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ flexGrow: 1, height: '100vh' }}>
      {/* 顶部操作栏 */}
      <AppBar position="static" elevation={2}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            startIcon={<ArrowBack />}
            color="inherit"
            onClick={() => navigate('/dashboard')}
          >
            返回主页
          </Button>

          <Typography variant="h6" component="div" color="inherit">
            收发货自动化
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={executionState.status === 'idle' ? '待运行' :
                     executionState.status === 'running' ? '运行中' :
                     executionState.status === 'completed' ? '已完成' : '执行错误'}
              color={getStatusColor(executionState.status) as any}
              variant="filled"
            />

            {executionState.status === 'idle' || executionState.status === 'completed' || executionState.status === 'error' ? (
              <Button
                variant="contained"
                startIcon={<PlayArrow />}
                onClick={handleExecute}
                disabled={!steps.some(step => step.enabled)}
              >
                开始执行
              </Button>
            ) : (
              <Button
                variant="contained"
                color="error"
                startIcon={<Stop />}
                onClick={handleStop}
              >
                停止执行
              </Button>
            )}

            <Button
              startIcon={<Refresh />}
              color="inherit"
              onClick={handleReset}
            >
              重置
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* 进度条 */}
      {executionState.status === 'running' && (
        <LinearProgress
          variant="determinate"
          value={executionState.progress}
          sx={{ height: 4 }}
        />
      )}

      {/* 主要内容区 */}
      <Box sx={{ p: 2, height: 'calc(100vh - 64px)', overflow: 'auto' }}>
        <Grid container spacing={3} sx={{ height: '100%' }}>
          {/* 左侧配置区 */}
          <Grid item xs={12} lg={7} sx={{ height: '100%' }}>
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* 步骤进度 */}
              <Paper sx={{ p: 3, bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3, color: 'text.primary' }}>
                  执行流程
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
                  {stepLabels.map((label, index) => {
                    const stepStatus = steps[index].status;
                    const isActive = activeStep === index;
                    const isCompleted = stepStatus === 'completed';
                    const isError = stepStatus === 'error';
                    const isRunning = stepStatus === 'running';

                    return (
                      <React.Fragment key={label}>
                        <Box
                          sx={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 1.5,
                            position: 'relative',
                          }}
                        >
                          {/* 步骤图标 */}
                          <Box
                            sx={{
                              width: 64,
                              height: 64,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: isCompleted ? 'success.main' :
                                       isError ? 'error.main' :
                                       isRunning ? 'primary.main' :
                                       'grey.200',
                              boxShadow: isActive ? '0 4px 12px rgba(25, 118, 210, 0.4)' : 'none',
                              transition: 'all 0.3s ease',
                              border: isActive ? '3px solid' : '2px solid',
                              borderColor: isActive ? 'primary.main' : 'transparent',
                              transform: isActive ? 'scale(1.05)' : 'scale(1)',
                            }}
                          >
                            {index === 0 ? <Upload sx={{ fontSize: 32, color: isCompleted || isError || isRunning ? 'white' : 'grey.600' }} /> :
                             index === 1 ? <CleaningServices sx={{ fontSize: 32, color: isCompleted || isError || isRunning ? 'white' : 'grey.600' }} /> :
                             <Send sx={{ fontSize: 32, color: isCompleted || isError || isRunning ? 'white' : 'grey.600' }} />}
                          </Box>

                          {/* 步骤标签 */}
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: isActive ? 600 : 500,
                                fontSize: '0.875rem',
                                color: isActive ? 'primary.main' : 'text.primary',
                                mb: 0.5,
                              }}
                            >
                              {label}
                            </Typography>
                            {/* 状态标签 */}
                            <Chip
                              label={
                                isCompleted ? '已完成' :
                                isError ? '错误' :
                                isRunning ? '运行中' :
                                steps[index].enabled ? '待运行' : '已跳过'
                              }
                              size="small"
                              color={
                                isCompleted ? 'success' :
                                isError ? 'error' :
                                isRunning ? 'primary' : 'default'
                              }
                              variant={isCompleted || isError || isRunning ? 'filled' : 'outlined'}
                              sx={{
                                fontSize: '0.7rem',
                                height: 22,
                                fontWeight: 500,
                              }}
                            />
                          </Box>
                        </Box>

                        {/* 连接线 */}
                        {index < stepLabels.length - 1 && (
                          <Box
                            sx={{
                              width: 60,
                              height: 3,
                              bgcolor: steps[index].status === 'completed' ? 'success.main' : 'grey.300',
                              position: 'relative',
                              top: -20,
                              transition: 'all 0.3s ease',
                              borderRadius: 1,
                            }}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </Box>
              </Paper>

              {/* 步骤配置 */}
              <Box sx={{ flex: 1, overflow: 'auto' }}>
                {/* 步骤1: 扫描配置 */}
                <Accordion
                  expanded={activeStep === 0}
                  sx={{
                    mb: 2,
                    borderRadius: 2,
                    '&:before': { display: 'none' },
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                    border: 1,
                    borderColor: steps[0].status === 'running' ? 'primary.main' : 'divider',
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMore />}
                    sx={{
                      bgcolor: 'background.paper',
                      borderRadius: 2,
                      '&.Mui-expanded': {
                        borderBottomLeftRadius: 0,
                        borderBottomRightRadius: 0,
                      },
                      '&:hover': {
                        bgcolor: 'action.hover',
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: steps[0].status === 'completed' ? 'success.main' :
                                   steps[0].status === 'running' ? 'primary.main' :
                                   steps[0].status === 'error' ? 'error.main' :
                                   'primary.light',
                          color: 'white',
                        }}
                      >
                        <Upload sx={{ fontSize: 24 }} />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          步骤1: 扫描纸张
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          使用OCR技术识别纸质单据
                        </Typography>
                      </Box>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={steps[0].enabled}
                            onChange={(e) => {
                              e.stopPropagation();
                              const newSteps = [...steps];
                              newSteps[0].enabled = e.target.checked;
                              setSteps(newSteps);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        }
                        label="启用"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Chip
                        label={steps[0].status === 'idle' ? '待运行' :
                               steps[0].status === 'running' ? '运行中' :
                               steps[0].status === 'completed' ? '已完成' : '错误'}
                        color={getStatusColor(steps[0].status) as any}
                        size="small"
                        variant={steps[0].status !== 'idle' ? 'filled' : 'outlined'}
                        sx={{ minWidth: 80 }}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          select
                          label="扫描器类型"
                          value={steps[0].config.scannerType}
                          onChange={(e) => updateStepConfig(0, 'scannerType', e.target.value)}
                          SelectProps={{ native: true }}
                        >
                          <option value="flatbed">平板扫描仪</option>
                          <option value="sheetfed">馈纸式扫描仪</option>
                          <option value="portable">便携式扫描仪</option>
                        </TextField>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          select
                          label="分辨率 (DPI)"
                          value={steps[0].config.resolution}
                          onChange={(e) => updateStepConfig(0, 'resolution', e.target.value)}
                          SelectProps={{ native: true }}
                        >
                          <option value="200">200 DPI</option>
                          <option value="300">300 DPI</option>
                          <option value="600">600 DPI</option>
                        </TextField>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          select
                          label="OCR引擎"
                          value={steps[0].config.ocrEngine}
                          onChange={(e) => updateStepConfig(0, 'ocrEngine', e.target.value)}
                          SelectProps={{ native: true }}
                        >
                          <option value="tesseract">Tesseract</option>
                          <option value="baidu">百度OCR</option>
                          <option value="tencent">腾讯OCR</option>
                        </TextField>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={steps[0].config.preprocessImage}
                              onChange={(e) => updateStepConfig(0, 'preprocessImage', e.target.checked)}
                            />
                          }
                          label="图像预处理"
                        />
                      </Grid>
                    </Grid>
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        此步骤将扫描纸质单据并使用OCR技术提取文本信息，生成结构化的JSON数据。
                      </Typography>
                    </Alert>
                  </AccordionDetails>
                </Accordion>

                {/* 步骤2: 数据处理配置 */}
                <Accordion
                  expanded={activeStep === 1}
                  sx={{
                    mb: 2,
                    borderRadius: 2,
                    '&:before': { display: 'none' },
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                    border: 1,
                    borderColor: steps[1].status === 'running' ? 'primary.main' : 'divider',
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMore />}
                    sx={{
                      bgcolor: 'background.paper',
                      borderRadius: 2,
                      '&.Mui-expanded': {
                        borderBottomLeftRadius: 0,
                        borderBottomRightRadius: 0,
                      },
                      '&:hover': {
                        bgcolor: 'action.hover',
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: steps[1].status === 'completed' ? 'success.main' :
                                   steps[1].status === 'running' ? 'primary.main' :
                                   steps[1].status === 'error' ? 'error.main' :
                                   'primary.light',
                          color: 'white',
                        }}
                      >
                        <CleaningServices sx={{ fontSize: 24 }} />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          步骤2: 数据清理和结构化
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          对OCR数据进行验证、清理和格式化
                        </Typography>
                      </Box>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={steps[1].enabled}
                            onChange={(e) => {
                              e.stopPropagation();
                              const newSteps = [...steps];
                              newSteps[1].enabled = e.target.checked;
                              setSteps(newSteps);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        }
                        label="启用"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Chip
                        label={steps[1].status === 'idle' ? '待运行' :
                               steps[1].status === 'running' ? '运行中' :
                               steps[1].status === 'completed' ? '已完成' : '错误'}
                        color={getStatusColor(steps[1].status) as any}
                        size="small"
                        variant={steps[1].status !== 'idle' ? 'filled' : 'outlined'}
                        sx={{ minWidth: 80 }}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          select
                          label="脚本类型"
                          value={steps[1].config.scriptType}
                          onChange={(e) => updateStepConfig(1, 'scriptType', e.target.value)}
                          SelectProps={{ native: true }}
                        >
                          <option value="python">Python</option>
                          <option value="nodejs">Node.js</option>
                          <option value="java">Java</option>
                        </TextField>
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="脚本路径"
                          value={steps[1].config.scriptPath}
                          onChange={(e) => updateStepConfig(1, 'scriptPath', e.target.value)}
                          placeholder="scripts/data_processor.py"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={steps[1].config.validationRules}
                              onChange={(e) => updateStepConfig(1, 'validationRules', e.target.checked)}
                            />
                          }
                          label="启用数据验证"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={steps[1].config.dataMapping}
                              onChange={(e) => updateStepConfig(1, 'dataMapping', e.target.checked)}
                            />
                          }
                          label="启用字段映射"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          rows={3}
                          label="自定义参数"
                          value={steps[1].config.customParams}
                          onChange={(e) => updateStepConfig(1, 'customParams', e.target.value)}
                          placeholder="--strict-mode --output-format=json"
                        />
                      </Grid>
                    </Grid>
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        此步骤将调用数据处理脚本，对OCR提取的JSON数据进行清理、验证和结构化处理。
                      </Typography>
                    </Alert>
                  </AccordionDetails>
                </Accordion>

                {/* 步骤3: 填报配置 */}
                <Accordion
                  expanded={activeStep === 2}
                  sx={{
                    mb: 2,
                    borderRadius: 2,
                    '&:before': { display: 'none' },
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                    border: 1,
                    borderColor: steps[2].status === 'running' ? 'primary.main' : 'divider',
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMore />}
                    sx={{
                      bgcolor: 'background.paper',
                      borderRadius: 2,
                      '&.Mui-expanded': {
                        borderBottomLeftRadius: 0,
                        borderBottomRightRadius: 0,
                      },
                      '&:hover': {
                        bgcolor: 'action.hover',
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: steps[2].status === 'completed' ? 'success.main' :
                                   steps[2].status === 'running' ? 'primary.main' :
                                   steps[2].status === 'error' ? 'error.main' :
                                   'primary.light',
                          color: 'white',
                        }}
                      >
                        <Send sx={{ fontSize: 24 }} />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          步骤3: 执行填报
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          自动登录目标系统并完成数据填报
                        </Typography>
                      </Box>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={steps[2].enabled}
                            onChange={(e) => {
                              e.stopPropagation();
                              const newSteps = [...steps];
                              newSteps[2].enabled = e.target.checked;
                              setSteps(newSteps);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        }
                        label="启用"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Chip
                        label={steps[2].status === 'idle' ? '待运行' :
                               steps[2].status === 'running' ? '运行中' :
                               steps[2].status === 'completed' ? '已完成' : '错误'}
                        color={getStatusColor(steps[2].status) as any}
                        size="small"
                        variant={steps[2].status !== 'idle' ? 'filled' : 'outlined'}
                        sx={{ minWidth: 80 }}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          select
                          label="目标系统"
                          value={steps[2].config.targetSystem}
                          onChange={(e) => updateStepConfig(2, 'targetSystem', e.target.value)}
                          SelectProps={{ native: true }}
                        >
                          <option value="erp">ERP系统</option>
                          <option value="wms">WMS系统</option>
                          <option value="sap">SAP系统</option>
                        </TextField>
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="系统登录URL"
                          value={steps[2].config.loginUrl}
                          onChange={(e) => updateStepConfig(2, 'loginUrl', e.target.value)}
                          placeholder="https://erp.company.com/login"
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="用户名"
                          value={steps[2].config.username}
                          onChange={(e) => updateStepConfig(2, 'username', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          select
                          label="填报速度"
                          value={steps[2].config.autoFillSpeed}
                          onChange={(e) => updateStepConfig(2, 'autoFillSpeed', e.target.value)}
                          SelectProps={{ native: true }}
                        >
                          <option value="slow">慢速 (稳定)</option>
                          <option value="medium">中速 (推荐)</option>
                          <option value="fast">快速 (实验)</option>
                        </TextField>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          type="number"
                          label="重试次数"
                          value={steps[2].config.retryAttempts}
                          onChange={(e) => updateStepConfig(2, 'retryAttempts', parseInt(e.target.value))}
                          inputProps={{ min: 1, max: 10 }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={steps[2].config.verification}
                              onChange={(e) => updateStepConfig(2, 'verification', e.target.checked)}
                            />
                          }
                          label="启用数据验证"
                        />
                      </Grid>
                    </Grid>
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        此步骤将通过自动化技术访问目标系统，自动填写表单并提交处理后的数据。
                      </Typography>
                    </Alert>
                  </AccordionDetails>
                </Accordion>
              </Box>
            </Box>
          </Grid>

          {/* 右侧日志区 */}
          <Grid item xs={12} lg={5} sx={{ height: '100%' }}>
            <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6">
                  运行日志
                  {executionState.currentStep && (
                    <Chip
                      label={`当前: ${executionState.currentStep}`}
                      color="primary"
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  )}
                </Typography>
              </Box>
              <LogViewer
                logs={executionState.logs}
                maxHeight="calc(100vh - 180px)"
                searchable={true}
                exportable={true}
              />
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default ShippingReceivingExecutionPage;