---
name: Cocos 保存场景弹窗的正确应对
description: Python 改完磁盘后 Cocos 打开显示"保存场景?"弹窗时，点"取消"不保存，否则覆盖磁盘成 null
type: feedback
---
**规则**：Cocos 打开项目时弹"保存场景？"提示，**永远点"取消"不要保存**。

**Why**：这个弹窗意味着 Cocos 内存里的 scene 和磁盘不一致。要么是 Python 刚改过磁盘、要么是 TS 编译延迟导致 Cocos 自动清理了它不认识的字段。此时内存版本是**被污染的**（字段被 null 化或被旧状态覆盖），保存 = 把污染写回磁盘 = 丢 @property 绑定。

**How to apply**：
- 看到保存弹窗 → 立即点"取消" / "不保存"
- 关闭 Cocos Creator → 重新打开 → 它会从磁盘重读干净状态
- 如果是"TS 加新 @property + Python 写 ref"场景，必须按以下顺序：
  1. 启动 Cocos 让 TS 编译完（控制台出现 `TypeScript compile succeed`）
  2. 完全关闭 Cocos
  3. 跑 Python 补绑定
  4. 再启动 Cocos → 绑定有值
- Python 脚本顶部加 `ensure_cocos_closed()` 防呆（见 `cocosSkill/scripts/prefab_builder.py`）
