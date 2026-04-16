---
name: 全屏页面触摸拦截设计
description: 引导/结算等全屏弹出页面的触摸事件拦截方案 — 不用 BlockInputEvents，用代码注册触摸
type: feedback
originSessionId: 49b75e5b-0ffd-448e-94a1-6a67cf3819f9
---
全屏弹出页面（引导、结算）的触摸拦截：

**不用 BlockInputEvents 组件** — 它会拦截所有触摸事件，导致子节点（按钮等）和全局 input 监听都收不到事件。

**正确方案 — 代码注册触摸**：
- GuideController: `this.node.on(Node.EventType.TOUCH_END, callback)` — 点击任意位置进入游戏
- SettlementView: `this.node.on(Node.EventType.TOUCH_START, (e) => { e.propagationStopped = true; })` — 阻止穿透到游戏层，downloadBtn 的 Button 组件作为子节点仍正常接收点击

**mask 节点只做视觉**：
- UITransform = 屏幕尺寸, Sprite 黑色 + UIOpacity=100, sizeMode=CUSTOM(0)
- 无 BlockInputEvents, 无触摸事件

**Why:** Session 3 反复验证：BlockInputEvents 放 mask 上拦截子节点，放根节点拦截全局 input。都不可靠。代码注册最可控。

**How to apply:** 创建全屏弹出页面时，mask 纯视觉，触摸拦截通过脚本的 onLoad 中 `this.node.on()` 注册。
