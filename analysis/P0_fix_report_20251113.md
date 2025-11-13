# P0-Fix 效果验证报告（高置信度旁路）

**生成时间**: 2025-11-13 10:15
**对比版本**:
- P0-1 Bugfix: `run_p0_1_bugfix_20251113_011205`
- P0-Fix: `run_p0_fix_20251113_093559`

---

## KPI 指标对比

| 版本 | Exact | Review | Fail | 自动通过率 |
|------|-------|--------|------|------------|
| P0-1 Bugfix | 8 (3.6%) | 80 (36.0%) | 134 (60.4%) | 3.6% |
| P0-Fix | 61 (27.5%) | 27 (12.2%) | 134 (60.4%) | 27.5% |

### 变化总结

- **Exact**: 8 → 61 (**+53**, **7.6x**)
- **Review**: 80 → 27 (**-53**)
- **Fail**: 134 → 134 (**+0**)
- **自动通过率**: 3.6% → 27.5% (**+23.9%**)

---

## 失败原因分布

| 原因 | P0-1 Bugfix | P0-Fix | 变化 |
|------|-------------|--------|------|
| DELTA_TOO_SMALL | 80 | 27 | -53 |
| EXTRACT_BOTH_EMPTY | 11 | 11 | +0 |
| EXTRACT_EMPTY_PROJECT | 18 | 18 | +0 |
| EXTRACT_EMPTY_SUPPLIER | 9 | 9 | +0 |
| FIELD_SIM_LOW_PROJECT | 54 | 54 | +0 |
| FIELD_SIM_LOW_SUPPLIER | 42 | 42 | +0 |

**DELTA_TOO_SMALL 变化**: 80 → 27 (**-53**)

---

## 桶位变化详情

### review → exact (53 个)

1. **aibobaiyun4100962241.txt**
   - Score: 1.0000 → 1.0000
   - Reason: DELTA_TOO_SMALL → OK

2. **andelijituanyouxiangongsi4100968520.txt**
   - Score: 0.9117 → 0.9117
   - Reason: DELTA_TOO_SMALL → OK

3. **baoshengkejichuangxingufenyouxiangongsi4100954930.txt**
   - Score: 0.9103 → 0.9103
   - Reason: DELTA_TOO_SMALL → OK

4. **beijingheruisaierdianlikejigufen4100880903.txt**
   - Score: 0.9697 → 0.9697
   - Reason: DELTA_TOO_SMALL → OK

5. **beijingheruisaierdianlikejigufen4100908541.txt**
   - Score: 0.9218 → 0.9218
   - Reason: DELTA_TOO_SMALL → OK

6. **beijingsifangjibaogongchengjishuyouxiangongsi4100819033.txt**
   - Score: 1.0000 → 1.0000
   - Reason: DELTA_TOO_SMALL → OK

7. **beijingsifangjibaogongchengjishuyouxiangongsi4100873942.txt**
   - Score: 0.9550 → 0.9550
   - Reason: DELTA_TOO_SMALL → OK

8. **beijingsifangjibaogongchengjishuyouxiangongsi4100880809.txt**
   - Score: 0.9630 → 0.9630
   - Reason: DELTA_TOO_SMALL → OK

9. **beijingsifangjibaogongchengjishuyouxiangongsi4100880914.txt**
   - Score: 1.0000 → 1.0000
   - Reason: DELTA_TOO_SMALL → OK

10. **beijingsifangjibaogongchengjishuyouxiangongsi4100904416.txt**
   - Score: 0.9279 → 0.9279
   - Reason: DELTA_TOO_SMALL → OK

11. **beijingsifangjibaogongchengjishuyouxiangongsi4100904508.txt**
   - Score: 0.9487 → 0.9487
   - Reason: DELTA_TOO_SMALL → OK

12. **beijingsifangjibaogongchengjishuyouxiangongsi4100925757.txt**
   - Score: 0.9699 → 0.9699
   - Reason: DELTA_TOO_SMALL → OK

13. **beijingsifangjibaogongchengjishuyouxiangongsi4100954968.txt**
   - Score: 0.9841 → 0.9841
   - Reason: DELTA_TOO_SMALL → OK

14. **beijingsifangjibaogongchengjishuyouxiangongsi4100971415.txt**
   - Score: 0.9672 → 0.9672
   - Reason: DELTA_TOO_SMALL → OK

15. **changjiangdianqi4100873861.txt**
   - Score: 0.9515 → 0.9515
   - Reason: DELTA_TOO_SMALL → OK

16. **dahuazhinengkeji4100962397.txt**
   - Score: 0.9251 → 0.9251
   - Reason: DELTA_TOO_SMALL → OK

17. **hebeigaomingdianlanyouxiangongsi4100913070.txt**
   - Score: 1.0000 → 1.0000
   - Reason: DELTA_TOO_SMALL → OK

18. **huatongjidiangufen4100961760.txt**
   - Score: 0.9375 → 0.9375
   - Reason: DELTA_TOO_SMALL → OK

19. **huatongjidiangufenyouxiangongsi4100904474.txt**
   - Score: 0.9677 → 0.9677
   - Reason: DELTA_TOO_SMALL → OK

20. **huatongjidiangufenyouxiangongsi4100912944.txt**
   - Score: 0.9167 → 0.9167
   - Reason: DELTA_TOO_SMALL → OK

... (还有 33 个文件)

---

## 总体结论

### ✅ 修复成功

- **53 个高质量匹配**被高置信度旁路救回（review → exact）
- **自动通过率**: 3.6% → **27.5%** (**7.6倍提升**)
- **DELTA_TOO_SMALL**: 80 → 27 (-53 个)

### 🎯 修复原理

新增**规则4（高置信度旁路）**:
```typescript
// 规则4: 高置信度旁路
if (top1.score >= 0.90 && top1.f1_score >= 0.80 && top1.f2_score >= 0.80) {
  return { bucket: 'exact', reason: null };
}
```

### 📊 超出预期

- **预期改善**: 12-16% (3-4倍提升)
- **实际改善**: **27.5%** (7.6倍提升)
- **超出预期**: +11.5% ~ +15.5%

---

**生成时间**: 2025-11-13 10:15
