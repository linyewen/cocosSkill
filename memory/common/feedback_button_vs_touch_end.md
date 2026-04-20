---
name: 多层 UI 点击要挂 cc.Button 不用 Node.TOUCH_END
description: 子节点有 UITransform 会吞事件；想让父节点响应点击必须挂 Button 组件
type: feedback
---
Cocos 3.x UI 事件机制：**任何带 UITransform 的节点默认拦截 touch 事件，不自动冒泡**。

**Why**：父节点挂 `Node.EventType.TOUCH_END` 监听、子节点是 Label（必然有 UITransform），点击父区域时 Label 先捕获 touch → 父节点收不到。ProjectDrop 道具栏槽位（slot Node + 子 Label name/count）一开始只挂了 TOUCH_END 不响应，后来改挂 `cc.Button` 才正常。

**How to apply**：
- 任何需要响应点击的 UI 节点：**挂 `cc.Button` 组件 + 监听 `Button.EventType.CLICK`**
- Button 的 `_transition: 3` (SCALE) 会给按下反馈（缩放），比 COLOR transition 更通用
- 不要用 `Node.EventType.TOUCH_END` 在多层 UI 上
- `ui_factories.make_button()` 自动挂 Button + 适配的 Label 子节点
